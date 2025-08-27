from auth_server.celery_app import app
from auth_server.services.email import EmailService
from auth_server.db import api as dbapi
from auth_server.db.orm import EmailOTP
from auth_server.config import get_settings
from auth_server.db.engine import Session as DBSession
import logging
import aiosmtplib
import socket
import asyncio

logger = logging.getLogger(__name__)


@app.task(bind=True)
def send_otp_email_task(self, otp_id: str):
    """Celery task to send OTP email for given EmailOTP id.

    This task classifies failures into transient (network/timeouts) and permanent
    (auth/invalid recipient) and retries transient failures with exponential backoff.
    On permanent failure the OTP is marked used so it cannot be reused.
    """
    settings = get_settings()
    email_service = EmailService(settings)

    session = None
    try:
        session = DBSession()
        otp_entry = session.query(EmailOTP).filter(EmailOTP.id == otp_id).first()
        if not otp_entry:
            logger.error(f"send_otp_email_task: OTP id {otp_id} not found")
            return False

        user = dbapi.get_user_uuid(session, otp_entry.user_id)
        if not user:
            logger.error(f"send_otp_email_task: user {otp_entry.user_id} not found")
            return False

        try:
            # call async send in a new event loop
            success = asyncio.run(
                email_service.send_otp_email(user.email, otp_entry.otp_code, user.username)
            )
            if success:
                logger.info(f"send_otp_email_task: OTP email sent to {user.email}")
                return True
            # If send returned False, treat as permanent failure
            logger.error(f"send_otp_email_task: email_service reported failure for {user.email}")
            otp_entry.is_used = True
            session.commit()
            return False

        except aiosmtplib.errors.SMTPAuthenticationError as ex:
            logger.error(f"send_otp_email_task: SMTP auth failed for {user.email}: {ex}")
            # permanent failure - mark used and don't retry
            otp_entry.is_used = True
            session.commit()
            return False
        except (aiosmtplib.errors.SMTPException, socket.timeout, socket.error, asyncio.TimeoutError) as ex:
            # transient failures - retry with exponential backoff
            retries = self.request.retries if hasattr(self, 'request') else 0
            max_retries = 5
            if retries < max_retries:
                delay = 2 ** retries
                logger.warning(f"send_otp_email_task: transient error sending to {user.email}: {ex}. Retrying in {delay}s (attempt {retries+1}/{max_retries})")
                raise self.retry(countdown=delay, exc=ex)
            else:
                logger.error(f"send_otp_email_task: exhausted retries for {user.email}: {ex}")
                otp_entry.is_used = True
                session.commit()
                return False
        except Exception as ex:
            logger.exception(f"send_otp_email_task: unexpected error: {ex}")
            # treat as permanent - mark used
            otp_entry.is_used = True
            session.commit()
            return False

    finally:
        try:
            if session:
                session.close()
        except Exception:
            pass
