import logging
import secrets
import uuid
from datetime import datetime, timedelta, UTC
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound, IntegrityError

from auth_server.db.orm import EmailOTP, User
from auth_server.db import api as dbapi
from auth_server.services.email import EmailService
from auth_server.config import Settings

logger = logging.getLogger(__name__)


class OTPService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.email_service = EmailService(settings)
        
    def generate_otp_code(self) -> str:
        """Generate a 6-digit OTP code"""
        return f"{secrets.randbelow(900000) + 100000:06d}"
    
    async def create_and_send_otp(
        self, 
        session: Session, 
        user_id: UUID, 
        purpose: str = "login"
    ) -> bool:
        """Create and send OTP code to user's email"""
        try:
            # Get user
            user = dbapi.get_user_uuid(session, user_id)
            if not user:
                logger.error(f"User with ID {user_id} not found")
                return False
            
            # Invalidate any existing OTPs for this user and purpose
            existing_otps = session.query(EmailOTP).filter(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.is_used == False
            ).all()
            
            for otp in existing_otps:
                otp.is_used = True
            
            # Generate new OTP
            otp_code = self.generate_otp_code()
            expires_at = datetime.now(UTC) + timedelta(minutes=10)  # 10 minutes expiry
            
            # Save OTP to database with retry logic for UUID conflicts
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    email_otp = EmailOTP(
                        id=uuid.uuid4(),  # Explicitly generate UUID
                        user_id=user_id,
                        otp_code=otp_code,
                        expires_at=expires_at,
                        purpose=purpose
                    )
                    session.add(email_otp)
                    session.commit()
                    break  # Success, exit retry loop
                except IntegrityError as e:
                    session.rollback()
                    if "duplicate key value violates unique constraint" in str(e) and attempt < max_retries - 1:
                        logger.warning(f"UUID collision detected, retrying... (attempt {attempt + 1}/{max_retries})")
                        continue
                    else:
                        logger.error(f"Failed to create OTP after {max_retries} attempts: {e}")
                        return False
            
            # Send email
            success = await self.email_service.send_otp_email(
                email=user.email,
                otp_code=otp_code,
                username=user.username
            )
            
            if not success:
                # Mark OTP as used if email failed
                email_otp.is_used = True
                session.commit()
                logger.error(f"Failed to send OTP email to {user.email}")
                return False
            
            logger.info(f"OTP created and sent for user {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating and sending OTP: {e}")
            session.rollback()
            return False
    
    def verify_otp(
        self, 
        session: Session, 
        user_id: UUID, 
        otp_code: str, 
        purpose: str = "login"
    ) -> bool:
        """Verify OTP code"""
        try:
            # Find valid OTP
            otp_entry = session.query(EmailOTP).filter(
                EmailOTP.user_id == user_id,
                EmailOTP.otp_code == otp_code,
                EmailOTP.purpose == purpose,
                EmailOTP.is_used == False
            ).first()
            
            if not otp_entry:
                logger.warning(f"Invalid OTP code for user {user_id}")
                return False
            
            if otp_entry.is_expired():
                logger.warning(f"Expired OTP code for user {user_id}")
                return False
            
            # Mark OTP as used
            otp_entry.is_used = True
            session.commit()
            
            logger.info(f"OTP verified successfully for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying OTP: {e}")
            return False
    
    def cleanup_expired_otps(self, session: Session):
        """Clean up expired OTP entries"""
        try:
            expired_otps = session.query(EmailOTP).filter(
                EmailOTP.expires_at < datetime.now(UTC)
            ).all()
            
            for otp in expired_otps:
                session.delete(otp)
            
            session.commit()
            logger.info(f"Cleaned up {len(expired_otps)} expired OTP entries")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired OTPs: {e}")
            session.rollback()
