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

app = FastAPI()

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
logger = logging.getLogger(__name__)
otp_service = OTPService(settings)


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
