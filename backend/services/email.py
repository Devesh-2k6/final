import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

logger = logging.getLogger("expirygo.email")

SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
SMTP_SENDER = settings.SMTP_SENDER

def send_email_notification(to_email: str, subject: str, html_content: str, text_fallback: str = ""):
    """
    Sends an email notification. If SMTP settings are missing, logs it as a mock fallback.
    Never crashes caller on email delivery or logging issues.
    """
    use_mock = not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD])
    
    if use_mock:
        try:
            logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
        except Exception:
            pass
        return True

    try:
        port = int(SMTP_PORT)
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SMTP_SENDER
        message["To"] = to_email
        
        # Attach parts
        if text_fallback:
            part1 = MIMEText(text_fallback, "plain", "utf-8")
            message.attach(part1)
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part2)
        
        # Connect and send
        if port == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, port, timeout=5) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_SENDER, to_email, message.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, port, timeout=5) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_SENDER, to_email, message.as_string())
                
        logger.info(f"[SUCCESS] Email successfully sent to {to_email} via SMTP.")
        return True
    except Exception as e:
        logger.warning(f"[WARNING] Failed to send email to {to_email} via SMTP: {e}")
        return False
