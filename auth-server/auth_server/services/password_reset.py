import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from auth_server.db import orm
from auth_server.services.email import EmailService
from auth_server.config import Settings

logger = logging.getLogger(__name__)


class PasswordResetService:
    def __init__(self, settings: Settings, email_service: EmailService):
        self.settings = settings
        self.email_service = email_service
    
    def generate_reset_token(self) -> str:
        """Generate a secure random reset token (always 32 bytes, urlsafe)"""
        return secrets.token_urlsafe(32)
    
    async def send_reset_email(self, db_session: Session, email: str) -> bool:
        """Send password reset email with token"""
        try:
            # Find user by email
            stmt = select(orm.User).where(orm.User.email == email)
            user = db_session.scalar(stmt)
            
            if not user:
                # For security reasons, don't reveal if email exists
                logger.info(f"Password reset requested for non-existing email: {email}")
                return True  # Return True to not reveal email doesn't exist
            
            # Generate reset token
            reset_token = self.generate_reset_token()
            # Always use UTC for expiry
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            # Invalidate any existing reset tokens for this user
            existing_tokens = db_session.scalars(
                select(orm.PasswordResetToken).where(
                    orm.PasswordResetToken.user_id == user.id,
                    orm.PasswordResetToken.is_used == False
                )
            ).all()
            logger.debug(f"Invalidating {len(existing_tokens)} existing tokens for user {user.email}.")
            for token in existing_tokens:
                logger.debug(f"Invalidating token: {token.token}")
                token.is_used = True
            logger.info(f"Generated new reset token for {user.email}: {reset_token}")
            # Create new reset token
            reset_token_record = orm.PasswordResetToken(
                user_id=user.id,
                token=reset_token,
                expires_at=expires_at,
                is_used=False
            )
            db_session.add(reset_token_record)
            db_session.commit()
            # Send email
            success = await self.email_service.send_reset_email(
                email=user.email,
                reset_token=reset_token,
                username=user.username
            )
            if not success:
                logger.error(f"Failed to send reset email to {email}")
                return False
            logger.info(f"Password reset email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            db_session.rollback()
            return False
    
    def verify_reset_token(self, db_session: Session, token: str) -> orm.User | None:
        """Verify reset token and return user if valid"""
        try:
            stmt = select(orm.PasswordResetToken).where(
                orm.PasswordResetToken.token == token,
                orm.PasswordResetToken.is_used == False
            )
            reset_token = db_session.scalar(stmt)
            logger.debug(f"Token lookup: {token}, found: {reset_token}")
            if not reset_token:
                logger.info(f"Invalid reset token: {token}")
                return None
            logger.debug(f"Token expires_at: {reset_token.expires_at}, now: {datetime.now(timezone.utc)}")
            logger.debug(f"Token is_used: {reset_token.is_used}")
            if reset_token.is_expired():
                logger.info(f"Expired reset token: {token}")
                return None
            # Get user
            user = db_session.get(orm.User, reset_token.user_id)
            logger.debug(f"User for token: {user}")
            return user
        except Exception as e:
            logger.error(f"Error verifying reset token: {e}")
            return None
    
    def reset_password(self, db_session: Session, token: str, new_password: str) -> bool:
        """Reset user password using token"""
        try:
            from passlib.hash import pbkdf2_sha256
            
            # Verify token and get user
            user = self.verify_reset_token(db_session, token)
            if not user:
                return False
            
            # Hash new password
            hashed_password = pbkdf2_sha256.hash(new_password)
            
            # Update user password
            user.password = hashed_password
            
            # Mark token as used
            stmt = select(orm.PasswordResetToken).where(
                orm.PasswordResetToken.token == token,
                orm.PasswordResetToken.is_used == False
            )
            reset_token = db_session.scalar(stmt)
            if reset_token:
                reset_token.is_used = True
            
            db_session.commit()
            
            logger.info(f"Password reset successful for user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            db_session.rollback()
            return False
