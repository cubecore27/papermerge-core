import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template

from auth_server.config import Settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings
        
    async def send_otp_email(self, email: str, otp_code: str, username: str) -> bool:
        """Send OTP code via email"""
        try:
            # Create email content
            subject = "Your Two-Factor Authentication Code"
            
            # HTML template for the email
            html_template = Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{{ subject }}</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h2 style="color: #333; margin-bottom: 20px;">Two-Factor Authentication</h2>
                    
                    <p>Hello {{ username }},</p>
                    
                    <p>Your verification code for accessing your account is:</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">{{ otp_code }}</h1>
                    </div>
                    
                    <p>This code will expire in 10 minutes.</p>
                    
                    <p><strong>If you didn't request this code, please ignore this email.</strong></p>
                    
                    <p>Best regards,<br>Papermerge Team</p>
                </div>
            </body>
            </html>
            """)
            
            # Plain text template
            text_template = Template("""
            Two-Factor Authentication
            
            Hello {{ username }},
            
            Your verification code for accessing your account is: {{ otp_code }}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            Papermerge Team
            """)
            
            html_content = html_template.render(
                subject=subject,
                username=username,
                otp_code=otp_code
            )
            
            text_content = text_template.render(
                username=username,
                otp_code=otp_code
            )
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.settings.papermerge__email__from_address
            message["To"] = email
            
            # Attach both plain text and HTML versions
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.settings.papermerge__email__smtp_host,
                port=self.settings.papermerge__email__smtp_port,
                username=self.settings.papermerge__email__smtp_username,
                password=self.settings.papermerge__email__smtp_password,
                use_tls=self.settings.papermerge__email__smtp_use_tls,
                start_tls=self.settings.papermerge__email__smtp_start_tls,
            )
            
            logger.info(f"OTP email sent successfully to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email to {email}: {e}")
            return False
