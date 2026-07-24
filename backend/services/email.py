import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
SMTP_SENDER = settings.SMTP_SENDER

def send_email_notification(to_email: str, subject: str, html_content: str, text_fallback: str = ""):
    """
    Sends an email notification. If SMTP settings are missing, logs it to the terminal as a mock fallback.
    """
    # Check if we should use mock logs
    use_mock = not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD])
    
    if use_mock:
        print("\n" + "="*60)
        print("[MOCK EMAIL OUTBOUND]")
        print(f"To:      {to_email}")
        print(f"Sender:  {SMTP_SENDER}")
        print(f"Subject: {subject}")
        print("-"*60)
        print(text_fallback or html_content)
        print("="*60 + "\n")
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
            part1 = MIMEText(text_fallback, "plain")
            message.attach(part1)
        part2 = MIMEText(html_content, "html")
        message.attach(part2)
        
        # Connect and send
        # If port is 465, use SMTP_SSL. Otherwise use SMTP + STARTTLS
        if port == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, port) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_SENDER, to_email, message.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, port) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_SENDER, to_email, message.as_string())
                
        print(f"[SUCCESS] Email successfully sent to {to_email} via SMTP.")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email} via SMTP: {e}")
        # Log mock as safety fallback so execution doesn't block/crash
        print("\n" + "="*60)
        print("[FALLBACK MOCK EMAIL OUTBOUND]")
        print(f"To:      {to_email}")
        print(f"Subject: {subject}")
        print("-"*60)
        print(text_fallback or html_content)
        print("="*60 + "\n")
        return False
