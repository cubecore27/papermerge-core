from auth_server.celery_app import app
from auth_server.services.email import EmailService
from auth_server.db import api as dbapi
from auth_server.db.orm import EmailOTP
from auth_server.config import get_settings
from auth_server.db.engine import Session as DBSession
import logging

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=2, default_retry_delay=10)
def send_otp_email_task(self, otp_id: str):
    """Celery task to send OTP email for given EmailOTP id.

    The task will load the OTP entry and user and attempt to send the email.
    If sending fails, mark the OTP as used to avoid reuse.
    """
    settings = get_settings()
    email_service = EmailService(settings)

    # Load OTP and user
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

        # Attempt to send
        success = None
        try:
            # email_service methods are async; run in event loop using asyncio.run
            import asyncio

            success = asyncio.run(email_service.send_otp_email(user.email, otp_entry.otp_code, user.username))
        except Exception as exc:
            logger.exception(f"send_otp_email_task: exception while sending OTP: {exc}")
            success = False

        if not success:
            # mark OTP as used to prevent reuse
            otp_entry.is_used = True
            session.commit()
            logger.error(f"send_otp_email_task: failed to send OTP email to {user.email}")
            return False

        logger.info(f"send_otp_email_task: OTP email sent to {user.email}")
        return True
    finally:
        try:
            session.close()
        except Exception:
            pass
