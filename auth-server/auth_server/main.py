
import logging
from uuid import UUID

from sqlalchemy.exc import OperationalError, NoResultFound
from fastapi import FastAPI, HTTPException, Response, Request, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
import jwt

from auth_server.auth import authenticate, create_token, enable_2fa, disable_2fa
from auth_server.backends.oidc import introspect_token
from auth_server import schema
from auth_server.config import get_settings
from auth_server import utils
from auth_server.db.engine import Session
from auth_server.db import api as dbapi

from auth_server.services.otp import OTPService
from auth_server.services.password_reset import PasswordResetService
from auth_server.services.email import EmailService

app = FastAPI()

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
logger = logging.getLogger(__name__)


otp_service = OTPService(settings)
email_service = EmailService(settings)
password_reset_service = PasswordResetService(settings, email_service)



# Forgot password: request reset
from fastapi import Depends, Query
from sqlalchemy.orm import Session as OrmSession
from auth_server.db.engine import Session as DBSession

def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()


from auth_server.db.orm import PasswordResetToken, User
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm.exc import NoResultFound


@app.post("/forgot-password/request")
async def forgot_password_request(
    req: schema.PasswordResetRequest,
    db: OrmSession = Depends(get_db),
):
    # Use PasswordResetService for all logic
    success = await password_reset_service.send_reset_email(db, req.email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reset email")
    return {"message": "If the email exists, a reset link was sent."}

# Forgot password: reset
@app.post("/forgot-password/reset")
async def forgot_password_reset(
    req: schema.PasswordResetAction,
    db: OrmSession = Depends(get_db),
):
    ok = password_reset_service.reset_password(db, req.token, req.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"message": "Password has been reset successfully."}


@app.post("/token")
async def token_endpoint(
    response: Response,
    provider: schema.AuthProvider | None = None,
    client_id: str | None = None,
    code: str | None = None,
    redirect_url: str | None = None,
    creds: schema.UserCredentials | None = None,
) -> schema.Token | schema.TwoFactorToken:
    """
    Retrieve JWT access token
    """
    kwargs = dict(
        code=code, redirect_url=redirect_url, client_id=client_id, provider=provider
    )
    if creds:
        kwargs["username"] = creds.username
        kwargs["password"] = creds.password
        kwargs["provider"] = creds.provider.value
        kwargs["otp_code"] = creds.otp_code
    try:
        with Session() as db_session:
            result: None | str | schema.User | schema.TwoFactorToken = await authenticate(
                db_session, **kwargs
            )
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex

    if result is None:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # If 2FA is required, return the temp token
    if isinstance(result, schema.TwoFactorToken):
        return result

    if isinstance(result, schema.User):
        # user was returned e.g. when using DB auth
        access_token = create_token(result)
    else:
        # token string was returned e.g. when using OIDC provider
        access_token = result

    response.set_cookie("access_token", access_token)
    response.headers["Authorization"] = f"Bearer {access_token}"

    return schema.Token(access_token=access_token)


@app.get("/verify")
async def verify_endpoint(request: Request) -> Response:
    """
    Returns 200 OK response if and only if JWT token is valid

    JWT token is read either from authorization header or from
    cookie header. Token is considered valid if and only if both
    of the following conditions are true:
    - token was signed with PAPERMERGE__SECURITY__SECRET_KEY
    - User with user_id from the token is present in database
    """
    logger.debug("Verify endpoint")
    token = utils.get_token(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    if settings.papermerge__auth__oidc_introspect_url:
        logger.debug("Found OIDC introspect endpoint")
        # OIDC introspection point is provided ->
        # ask OIDC provider if token is active
        # # https://datatracker.ietf.org/doc/html/rfc7662
        # here we verify (=instrospect) token issued by OIDC provider
        valid_token = await introspect_token(
            settings.papermerge__auth__oidc_introspect_url,
            token=token,
            client_secret=settings.papermerge__auth__oidc_client_secret,
            client_id=settings.papermerge__auth__oidc_client_id,
        )
        if valid_token:
            logger.debug("Introspect: token valid")
            return Response(status_code=status.HTTP_200_OK)
        else:
            logger.debug("Introspect: token NOT valid!")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Introspection says: token is not active",
            )
    # non OIDC flow
    # here we verify token which was issued by papermerge auth server
    logger.debug("non OIDC flow")
    try:
        decoded_token = jwt.decode(
            token,
            settings.papermerge__security__secret_key,
            algorithms=[settings.papermerge__security__token_algorithm],
        )
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    if "sub" not in decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"sub key not present in decoded token",
        )

    user_id = decoded_token["sub"]
    logger.debug(f"Decoded user_id from token: {user_id}")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"user_id value is None",
        )

    try:
        # Try to convert user_id to UUID first
        user_uuid = UUID(user_id)
        logger.debug(f"Successfully converted to UUID: {user_uuid}")
    except ValueError as e:
        logger.error(f"Invalid UUID format for user_id '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user ID format: {user_id}",
        )

    try:
        with Session() as db_session:
            user = dbapi.get_user_uuid(db_session, user_uuid)
    except OperationalError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"DB operation error {exc}",
        )
    except NoResultFound:
        logger.warning(f"User with ID {user_uuid} not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User {user_uuid} not found in database",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User with ID {user_uuid} not found in DB",
        )

    return Response(status_code=status.HTTP_200_OK)


@app.post("/2fa/verify")
async def verify_2fa(response: Response, verification: schema.OTPVerification) -> schema.Token:
    """
    Complete 2FA authentication by verifying OTP code
    """
    try:
        with Session() as db_session:
            # Verify the OTP code
            if not otp_service.verify_otp(db_session, verification.user_id, verification.otp_code, verification.purpose):
                raise HTTPException(status_code=401, detail="Invalid verification code")
            
            # Get the user to create the final token
            user = dbapi.get_user_uuid(db_session, verification.user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Create the final access token
            access_token = create_token(user)
            
            response.set_cookie("access_token", access_token)
            response.headers["Authorization"] = f"Bearer {access_token}"
            
            return schema.Token(access_token=access_token)
            
    except Exception as e:
        logger.error(f"Error verifying 2FA: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/2fa/setup/send-otp")
async def send_setup_otp(request: Request) -> dict:
    """Send OTP for 2FA setup"""
    # Verify user is authenticated
    token = utils.get_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        decoded_token = jwt.decode(
            token,
            settings.papermerge__security__secret_key,
            algorithms=[settings.papermerge__security__token_algorithm],
        )
        user_id = decoded_token.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        with Session() as db_session:
            success = await otp_service.create_and_send_otp(db_session, user_id, "setup")
            if not success:
                raise HTTPException(status_code=500, detail="Failed to send verification code")
            
            return {"message": "Verification code sent to your email"}
    except Exception as e:
        logger.error(f"Error sending setup OTP: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/2fa/setup")
async def setup_2fa(request: Request, setup_data: schema.TwoFactorSetup) -> dict:
    """Enable or disable 2FA"""
    # Verify user is authenticated
    token = utils.get_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        decoded_token = jwt.decode(
            token,
            settings.papermerge__security__secret_key,
            algorithms=[settings.papermerge__security__token_algorithm],
        )
        user_id = decoded_token.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not setup_data.otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")
    
    try:
        with Session() as db_session:
            if setup_data.enable:
                success = await enable_2fa(db_session, user_id, setup_data.otp_code)
                message = "Two-factor authentication enabled"
            else:
                success = await disable_2fa(db_session, user_id, setup_data.otp_code)
                message = "Two-factor authentication disabled"
            
            if not success:
                raise HTTPException(status_code=400, detail="Invalid verification code")
            
            return {"message": message}
    except Exception as e:
        logger.error(f"Error setting up 2FA: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/2fa/disable/send-otp")
async def send_disable_otp(request: Request) -> dict:
    """Send OTP for 2FA disable"""
    # Verify user is authenticated
    token = utils.get_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        decoded_token = jwt.decode(
            token,
            settings.papermerge__security__secret_key,
            algorithms=[settings.papermerge__security__token_algorithm],
        )
        user_id = decoded_token.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        with Session() as db_session:
            success = await otp_service.create_and_send_otp(db_session, user_id, "disable")
            if not success:
                raise HTTPException(status_code=500, detail="Failed to send verification code")
            
            return {"message": "Verification code sent to your email"}
    except Exception as e:
        logger.error(f"Error sending disable OTP: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/2fa/status")
async def get_2fa_status(request: Request) -> dict:
    """Get user's 2FA status"""
    # Verify user is authenticated
    token = utils.get_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        decoded_token = jwt.decode(
            token,
            settings.papermerge__security__secret_key,
            algorithms=[settings.papermerge__security__token_algorithm],
        )
        user_id = decoded_token.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        with Session() as db_session:
            user = dbapi.get_user_uuid(db_session, UUID(user_id))
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return {"is_2fa_enabled": user.is_2fa_enabled}
    except Exception as e:
        logger.error(f"Error getting 2FA status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Public endpoint to verify password reset token

# Inline implementation for password reset token verification
from auth_server.db.orm import PasswordResetToken, User
from sqlalchemy.orm.exc import NoResultFound
from datetime import datetime, timezone

@app.get("/api/verify-reset-token/{token}")
async def verify_reset_token(token: str, db: OrmSession = Depends(get_db)):
    # debug: print received token to stdout to ensure visibility in logs
    print(f"VERIFY_TOKEN_RECEIVED(path): {token}")
    try:
        reset_token = db.query(PasswordResetToken).filter_by(token=token).one()
    except NoResultFound:
        logger.error(f"Token not found: {token}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    # Check if token is used or expired
    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at
    logger.info(f"Token check: now={now.isoformat()}, expires_at={expires_at} (tzinfo={expires_at.tzinfo}), is_used={reset_token.is_used}")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        logger.info(f"expires_at updated with tzinfo: {expires_at}")
    if reset_token.is_used or now > expires_at:
        logger.warning(f"Token expired or used: now={now}, expires_at={expires_at}, is_used={reset_token.is_used}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    # Get username
    user = db.query(User).filter_by(id=reset_token.user_id).first()
    if not user:
        logger.error(f"User not found for token: {token}, user_id={reset_token.user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"Token valid for user: {user.username}")
    return {"username": user.username}


@app.get("/api/verify-reset-token")
async def verify_reset_token_api_query(token: str = Query(None), db: OrmSession = Depends(get_db)):
    """API-compatible query-param endpoint: /api/verify-reset-token?token=..."""
    # debug: ensure token visible in logs
    print(f"VERIFY_TOKEN_RECEIVED(api-query): {token}")
    if not token:
        raise HTTPException(status_code=400, detail="Token query parameter missing")
    try:
        reset_token = db.query(PasswordResetToken).filter_by(token=token).one()
    except NoResultFound:
        logger.error(f"Token not found (api-query): {token}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if reset_token.is_used or now > expires_at:
        logger.warning(f"Token expired or used (api-query): now={now}, expires_at={expires_at}, is_used={reset_token.is_used}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    user = db.query(User).filter_by(id=reset_token.user_id).first()
    if not user:
        logger.error(f"User not found for token (api-query): {token}, user_id={reset_token.user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": user.username}


# Support query-parameter style verification links (e.g. /reset-password?token=...)
@app.get("/verify-reset-token")
async def verify_reset_token_query(token: str = Query(None), db: OrmSession = Depends(get_db)):
    # debug: print received token to stdout to ensure visibility in logs
    print(f"VERIFY_TOKEN_RECEIVED(query): {token}")
    if not token:
        raise HTTPException(status_code=400, detail="Token query parameter missing")
    # Delegate to the existing logic by reusing the DB access
    try:
        reset_token = db.query(PasswordResetToken).filter_by(token=token).one()
    except NoResultFound:
        logger.error(f"Token not found (query): {token}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    # Check if token is used or expired
    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at
    logger.info(f"Token check (query): now={now.isoformat()}, expires_at={expires_at} (tzinfo={expires_at.tzinfo}), is_used={reset_token.is_used}")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        logger.info(f"expires_at updated with tzinfo: {expires_at}")
    if reset_token.is_used or now > expires_at:
        logger.warning(f"Token expired or used (query): now={now}, expires_at={expires_at}, is_used={reset_token.is_used}")
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
    # Get username
    user = db.query(User).filter_by(id=reset_token.user_id).first()
    if not user:
        logger.error(f"User not found for token (query): {token}, user_id={reset_token.user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    logger.info(f"Token valid for user (query): {user.username}")
    return {"username": user.username}