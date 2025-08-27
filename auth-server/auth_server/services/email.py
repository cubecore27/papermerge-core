
import logging
import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from auth_server.config import Settings

logger = logging.getLogger(__name__)



class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def send_reset_email(self, email: str, reset_token: str, username: str) -> bool:
        """Send password reset email with reset token link"""
        try:
            subject = "Password Reset Request"
            html_template = Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"UTF-8\">
                <title>{{ subject }}</title>
            </head>
            <body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 5px;\">
                    <h2 style=\"color: #333; margin-bottom: 20px;\">Password Reset</h2>
                    <p>Hello {{ username }},</p>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <div style=\"background-color: #fff; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;\">
                        <a href=\"{{ reset_link }}\" style=\"color: #007bff; font-size: 18px;\">Reset Password</a>
                    </div>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>Best regards,<br>Papermerge Team</p>
                </div>
            </body>
            </html>
            """)
            text_template = Template("""
            Password Reset\n\nHello {{ username }},\n\nYou requested a password reset. Use the link below to reset your password:\n{{ reset_link }}\n\nIf you did not request this, please ignore this email.\nThis link will expire in 1 hour.\n\nBest regards,\nPapermerge Team
            """)
            reset_link = f"http://127.0.0.1:3600/reset-password?token={reset_token}"
            html_content = html_template.render(subject=subject, username=username, reset_link=reset_link)
            text_content = text_template.render(username=username, reset_link=reset_link)
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.settings.papermerge__email__from_address
            message["To"] = email
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            message.attach(text_part)
            message.attach(html_part)
            # Use SMTP client with explicit timeout and starttls support.
            timeout = int(getattr(self.settings, "papermerge__email__smtp_timeout", 10))
            smtp = aiosmtplib.SMTP(
                hostname=self.settings.papermerge__email__smtp_host,
                port=self.settings.papermerge__email__smtp_port,
                timeout=timeout,
                start_tls=self.settings.papermerge__email__smtp_start_tls,
            )
            try:
                await asyncio.wait_for(smtp.connect(), timeout=timeout)
                if self.settings.papermerge__email__smtp_username and self.settings.papermerge__email__smtp_password:
                    await asyncio.wait_for(
                        smtp.login(self.settings.papermerge__email__smtp_username, self.settings.papermerge__email__smtp_password),
                        timeout=timeout,
                    )
                await asyncio.wait_for(smtp.send_message(message), timeout=timeout)
            finally:
                try:
                    await smtp.quit()
                except Exception:
                    # ignore quit errors
                    pass
            logger.info(f"Password reset email sent successfully to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
            return False

    async def send_otp_email(self, email: str, otp_code: str, username: str) -> bool:
        """Send OTP code via email"""
        try:
            subject = "Your Two-Factor Authentication Code"
            html_template = Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"UTF-8\">
                <title>{{ subject }}</title>
            </head>
            <body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 5px;\">
                    <h2 style=\"color: #333; margin-bottom: 20px;\">Two-Factor Authentication</h2>
                    <p>Hello {{ username }},</p>
                    <p>Your verification code for accessing your account is:</p>
                    <div style=\"background-color: #fff; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;\">
                        <h1 style=\"color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;\">{{ otp_code }}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p><strong>If you didn't request this code, please ignore this email.</strong></p>
                    <p>Best regards,<br>Papermerge Team</p>
                </div>
            </body>
            </html>
            """)
            text_template = Template("""
            Two-Factor Authentication
            
            Hello {{ username }},
            
            Your verification code for accessing your account is: {{ otp_code }}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            Papermerge Team
            """)
            html_content = html_template.render(subject=subject, username=username, otp_code=otp_code)
            text_content = text_template.render(username=username, otp_code=otp_code)
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.settings.papermerge__email__from_address
            message["To"] = email
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            message.attach(text_part)
            message.attach(html_part)
            # Use SMTP client with explicit timeout and starttls support.
            timeout = int(getattr(self.settings, "papermerge__email__smtp_timeout", 10))
            smtp = aiosmtplib.SMTP(
                hostname=self.settings.papermerge__email__smtp_host,
                port=self.settings.papermerge__email__smtp_port,
                timeout=timeout,
                start_tls=self.settings.papermerge__email__smtp_start_tls,
            )
            try:
                await asyncio.wait_for(smtp.connect(), timeout=timeout)
                if self.settings.papermerge__email__smtp_username and self.settings.papermerge__email__smtp_password:
                    await asyncio.wait_for(
                        smtp.login(self.settings.papermerge__email__smtp_username, self.settings.papermerge__email__smtp_password),
                        timeout=timeout,
                    )
                await asyncio.wait_for(smtp.send_message(message), timeout=timeout)
            finally:
                try:
                    await smtp.quit()
                except Exception:
                    # ignore quit errors
                    pass
            logger.info(f"OTP email sent successfully to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send OTP email to {email}: {e}")
            return False
