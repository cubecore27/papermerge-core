import logging

from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound
from uuid import UUID

from datetime import datetime, timedelta, UTC
import jwt
from passlib.hash import pbkdf2_sha256

from fastapi import HTTPException

from auth_server.db import api as dbapi
from auth_server.db.orm import User
from auth_server import schema
from auth_server.config import Settings
from auth_server.backends import OIDCAuth, ldap
from auth_server.utils import raise_on_empty
from auth_server.services.otp import OTPService


logger = logging.getLogger(__name__)
settings = Settings()
otp_service = OTPService(settings)


async def authenticate(
    session: Session,
    *,
    username: str | None = None,
    password: str | None = None,
    provider: schema.AuthProvider = schema.AuthProvider.DB,
    client_id: str | None = None,
    code: str | None = None,
    redirect_url: str | None = None,
    otp_code: str | None = None,
) -> schema.User | str | schema.TwoFactorToken | None:

    # provider = DB
    if username and password and provider == schema.AuthProvider.DB:
        # password based authentication against database
        return await db_auth(session, username, password, otp_code)

    if provider == schema.AuthProvider.OIDC:
        raise_on_empty(
            code=code, client_id=client_id, provider=provider, redirect_url=redirect_url
        )
        return await oidc_auth(
            session, client_id=client_id, code=code, redirect_url=redirect_url
        )
    elif provider == schema.AuthProvider.LDAP:
        # provider = ldap
        return await ldap_auth(session, username, password, otp_code)
    else:
        raise ValueError("Unknown or empty auth provider")


def verify_password(password: str, hashed_password: str) -> bool:
    logger.debug("checking credentials...")
    return pbkdf2_sha256.verify(password, hashed_password)


def create_access_token(
    data: schema.TokenData,
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta | None = None,
) -> str:
    logger.debug(f"create access token for data={data}")

    to_encode = data.model_dump()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})

    try:
        encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    except Exception as exc:
        logger.error(exc)
        raise

    return encoded_jwt


async def db_auth(
    session: Session, username: str, password: str, otp_code: str | None = None
) -> schema.User | schema.TwoFactorToken | None:
    """Authenticates user based on username and password

    User data is read from database.
    """
    logger.info(f"Database based authentication for '{username}'")

    try:
        user: schema.User | None = dbapi.get_user_by_username(session, username)
    except NoResultFound:
        user = None

    if not user:
        logger.warning(f"User {username} not found in database")
        return None

    if not verify_password(password, user.password):
        logger.warning(f"Authentication failed for '{username}'")
        return None

    # Check if 2FA is enabled for this user
    if user.is_2fa_enabled:
        if not otp_code:
            # First factor authentication successful, need OTP
            logger.info(f"2FA enabled for '{username}', sending OTP")
            
            # Send OTP to user's email
            success = await otp_service.create_and_send_otp(session, user.id, "login")
            if not success:
                logger.error(f"Failed to send OTP to user {username}")
                raise HTTPException(status_code=500, detail="Failed to send verification code")
            
            # Return temporary token indicating 2FA is required
            temp_token_data = schema.TokenData(
                sub=str(user.id),
                preferred_username=user.username,
                email=user.email,
                scopes=["temp:2fa"]  # Special scope for temporary token
            )
            
            temp_token = create_access_token(
                data=temp_token_data,
                expires_delta=timedelta(minutes=10),  # Short lived temp token
                secret_key=settings.papermerge__security__secret_key,
                algorithm=settings.papermerge__security__token_algorithm,
            )
            
            return schema.TwoFactorToken(
                temp_token=temp_token,
                requires_2fa=True,
                user_id=user.id
            )
        else:
            # Verify OTP code
            if not otp_service.verify_otp(session, user.id, otp_code, "login"):
                logger.warning(f"Invalid OTP for user '{username}'")
                raise HTTPException(status_code=401, detail="Invalid verification code")
            
            logger.info(f"2FA authentication successful for '{username}'")

    logger.info(f"Authentication successful for '{username}'")
    return user


async def ldap_auth(
    session: Session, username: str, password: str, otp_code: str | None = None
) -> schema.User | schema.TwoFactorToken | None:
    client = ldap.get_client(username, password)

    try:
        await client.signin()
    except Exception as ex:
        logger.warning(f"Auth:LDAP: sign in failed with {ex}")

        raise HTTPException(
            status_code=401, detail=f"401 Unauthorized. LDAP Auth error: {ex}."
        )

    email = ldap.get_default_email(username)
    try:
        email = await client.user_email()
    except Exception as ex:
        logger.warning(f"Auth:LDAP: cannot retrieve user email {ex}")
        logger.warning(f"Auth:LDAP: user email fallback to {email}")

    return dbapi.get_or_create_user_by_email(session, email)


async def oidc_auth(
    session: Session, client_id: str, code: str, redirect_url: str
) -> str | None:
    if settings.papermerge__auth__oidc_client_secret is None:
        raise HTTPException(status_code=400, detail="OIDC client secret is empty")

    client = OIDCAuth(
        client_secret=settings.papermerge__auth__oidc_client_secret,
        access_token_url=settings.papermerge__auth__oidc_access_token_url,
        user_info_url=settings.papermerge__auth__oidc_user_info_url,
        client_id=client_id,
        code=code,
        redirect_url=redirect_url,
    )

    logger.debug("Auth:oidc: sign in")

    try:
        result = await client.signin()
    except Exception as ex:
        logger.warning(f"Auth:oidc: sign in failed with {ex}")

        raise HTTPException(
            status_code=401, detail=f"401 Unauthorized. Auth provider error: {ex}."
        )

    return result


def create_token(user: schema.User) -> str:
    access_token_expires = timedelta(
        minutes=settings.papermerge__security__token_expire_minutes
    )
    data = schema.TokenData(
        sub=str(user.id),
        preferred_username=user.username,
        email=user.email,
        scopes=user.scopes,
    )

    access_token = create_access_token(
        data=data,
        expires_delta=access_token_expires,
        secret_key=settings.papermerge__security__secret_key,
        algorithm=settings.papermerge__security__token_algorithm,
    )

    return access_token


async def enable_2fa(session: Session, user_id: UUID, otp_code: str) -> bool:
    """Enable 2FA for a user after verifying OTP"""
    try:
        # Verify OTP code first
        if not otp_service.verify_otp(session, user_id, otp_code, "setup"):
            logger.warning(f"Invalid OTP for 2FA setup for user {user_id}")
            return False
        
        # Update user's 2FA status
        user = dbapi.get_user_uuid(session, user_id)
        if not user:
            logger.error(f"User {user_id} not found")
            return False
        
        # Update the user in the database directly via ORM
        user_orm = session.query(User).filter(User.id == user_id).first()
        if user_orm:
            user_orm.is_2fa_enabled = True
            session.commit()
            logger.info(f"2FA enabled for user {user.username}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error enabling 2FA: {e}")
        session.rollback()
        return False


async def disable_2fa(session: Session, user_id: UUID, otp_code: str) -> bool:
    """Disable 2FA for a user after verifying OTP"""
    try:
        # Verify OTP code first
        if not otp_service.verify_otp(session, user_id, otp_code, "disable"):
            logger.warning(f"Invalid OTP for 2FA disable for user {user_id}")
            return False
        
        # Update user's 2FA status
        user = dbapi.get_user_uuid(session, user_id)
        if not user:
            logger.error(f"User {user_id} not found")
            return False
        
        # Update the user in the database directly via ORM
        user_orm = session.query(User).filter(User.id == user_id).first()
        if user_orm:
            user_orm.is_2fa_enabled = False
            session.commit()
            logger.info(f"2FA disabled for user {user.username}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error disabling 2FA: {e}")
        session.rollback()
        return False
