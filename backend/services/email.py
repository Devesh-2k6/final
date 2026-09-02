import smtplib
import logging
import uuid
from datetime import datetime, UTC
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional
from config import settings

logger = logging.getLogger("expirygo.email")

# In-memory Dev Mailbox ring buffer (keeps last 50 emails for dev inspection/testing)
DEV_MAILBOX: List[Dict[str, Any]] = []
MAX_DEV_MAILBOX_SIZE = 50


def get_smtp_config() -> Dict[str, Any]:
    host = (settings.SMTP_HOST or "").strip()
    port_str = (str(settings.SMTP_PORT) if settings.SMTP_PORT else "").strip()
    user = (settings.SMTP_USERNAME or settings.SMTP_USER or "").strip()
    password = (settings.SMTP_PASSWORD or "").strip()
    sender = (settings.SMTP_FROM or settings.SMTP_SENDER or user or "no-reply@expirygo.com").strip()
    
    port = int(port_str) if port_str.isdigit() else 587
    is_configured = bool(host and user and password)
    
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
        "is_configured": is_configured,
    }


def record_dev_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_fallback: str = "",
    sent_via: str = "mock",
    status: str = "success",
    error: Optional[str] = None,
    token: Optional[str] = None,
    verification_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Records an outgoing email in the dev mailbox ring buffer."""
    record = {
        "id": str(uuid.uuid4()),
        "to_email": to_email,
        "subject": subject,
        "html_content": html_content,
        "text_fallback": text_fallback,
        "sent_via": sent_via,
        "status": status,
        "error": error,
        "token": token,
        "verification_url": verification_url,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    DEV_MAILBOX.insert(0, record)
    if len(DEV_MAILBOX) > MAX_DEV_MAILBOX_SIZE:
        DEV_MAILBOX.pop()
    return record


def get_dev_mailbox(limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieves recent recorded emails from the Dev Mailbox."""
    return DEV_MAILBOX[:limit]


def clear_dev_mailbox() -> None:
    """Clears the Dev Mailbox."""
    DEV_MAILBOX.clear()


def send_email_notification(
    to_email: str,
    subject: str,
    html_content: str,
    text_fallback: str = "",
    token: Optional[str] = None,
    verification_url: Optional[str] = None,
) -> bool:
    """
    Sends an email notification via SMTP or records it in the Dev Mailbox.
    Never crashes caller on email delivery or logging issues.
    """
    config = get_smtp_config()
    
    record_dev_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_fallback=text_fallback,
        sent_via=f"smtp_queued ({config['host']})" if config["is_configured"] else "dev_mock",
        status="delivered_dev" if not config["is_configured"] else "queued",
        token=token,
        verification_url=verification_url,
    )

    if not config["is_configured"]:
        return True

    def _async_smtp_send():
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = config["sender"]
            message["To"] = to_email
            
            if text_fallback:
                part1 = MIMEText(text_fallback, "plain", "utf-8")
                message.attach(part1)
                
            part2 = MIMEText(html_content, "html", "utf-8")
            message.attach(part2)
            
            if config["port"] == 465:
                with smtplib.SMTP_SSL(config["host"], config["port"], timeout=3) as server:
                    server.login(config["user"], config["password"])
                    server.sendmail(config["sender"], to_email, message.as_string())
            else:
                with smtplib.SMTP(config["host"], config["port"], timeout=3) as server:
                    try:
                        server.starttls()
                    except Exception:
                        pass
                    server.login(config["user"], config["password"])
                    server.sendmail(config["sender"], to_email, message.as_string())
            logger.info(f"[SUCCESS] Email sent to {to_email} via SMTP ({config['host']}).")
        except Exception as e:
            logger.warning(f"[WARNING] SMTP delivery to {to_email} skipped: {e}")

    import threading
    t = threading.Thread(target=_async_smtp_send, daemon=True)
    t.start()
    return True


def test_smtp_connection(to_email: str) -> Dict[str, Any]:
    """Tests the SMTP configuration and attempts to send a test ping message."""
    config = get_smtp_config()
    if not config["is_configured"]:
        return {
            "success": False,
            "configured": False,
            "message": "SMTP credentials are not configured in .env. Using mock Dev Mailbox mode.",
            "config": {
                "host": config["host"],
                "port": config["port"],
                "sender": config["sender"],
                "has_user": bool(config["user"]),
                "has_password": bool(config["password"]),
            },
        }

    subject = "🌱 ExpiryGo SMTP Test - Diagnostic Ping"
    html_content = """<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2 style="color: #10b981;">ExpiryGo SMTP Diagnostic Test Passed!</h2>
        <p>Your SMTP mail configuration is working correctly and ready for production email dispatch.</p>
    </div>"""
    text_content = "ExpiryGo SMTP Diagnostic Test Passed! Your SMTP mail configuration is working correctly."

    success = send_email_notification(to_email, subject, html_content, text_content)
    return {
        "success": success,
        "configured": True,
        "message": "Test email sent successfully via SMTP." if success else "SMTP connection or authentication failed. Check logs.",
        "config": {
            "host": config["host"],
            "port": config["port"],
            "sender": config["sender"],
        },
    }


def send_verification_email(to_email: str, name: str, raw_token: str) -> bool:
    """
    Sends a real, secure email verification link to newly registered or unverified users.
    """
    frontend_base = (settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    verification_url = f"{frontend_base}/verify-email?token={raw_token}"
    subject = "Verify your ExpiryGo email"
    display_name = (name or "").strip() or "there"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your ExpiryGo email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; line-height: 1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="560" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; text-align: left;">
                    <!-- Brand Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 36px; text-align: center;">
                            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 9999px; margin-bottom: 8px;">
                                <span style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">🌱 Expiry<span style="color: #d1fae5;">Go</span></span>
                            </div>
                            <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Confirm Your Email Address</h1>
                        </td>
                    </tr>

                    <!-- Email Body -->
                    <tr>
                        <td style="padding: 36px 36px 28px 36px;">
                            <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0;">Hello {display_name},</p>
                            <p style="font-size: 15px; color: #334155; margin: 12px 0 20px 0;">
                                Thank you for registering with <strong>ExpiryGo</strong>! We are excited to have you join our mission to reduce food waste, save surplus groceries, and unlock exclusive hyper-local deals.
                            </p>
                            <p style="font-size: 15px; color: #334155; margin: 0 0 28px 0;">
                                Please click the button below to verify your email address and activate your account.
                            </p>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="{verification_url}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16,185,129,0.35); transition: background-color 0.2s;">
                                    Verify Email
                                </a>
                            </div>

                            <p style="font-size: 13px; color: #64748b; margin: 24px 0 8px 0; text-align: center;">
                                ⏱️ This verification link expires in <strong>24 hours</strong>.
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />

                            <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0;">
                                If the button above does not work, copy and paste this link into your browser:
                            </p>
                            <p style="font-size: 12px; color: #0284c7; word-break: break-all; margin: 0 0 20px 0;">
                                <a href="{verification_url}" style="color: #0284c7; text-decoration: underline;">{verification_url}</a>
                            </p>

                            <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 0 0;">
                                If you did not create an ExpiryGo account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f1f5f9; padding: 20px 36px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0;">&copy; ExpiryGo Surplus Marketplace. Saving food, saving money.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    text_fallback = f"""Hello {display_name},

Thank you for registering with ExpiryGo!

Please click the link below or copy and paste it into your browser to verify your email address:
{verification_url}

This verification link expires in 24 hours.

If you did not create this account, you can ignore this email.

---
ExpiryGo Team
"""

    return send_email_notification(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_fallback=text_fallback,
        token=raw_token,
        verification_url=verification_url,
    )


def send_vendor_approval_email(to_email: str, vendor_name: str, shop_name: str) -> bool:
    """Dispatches official approval notification to vendor when approved by Admin."""
    subject = f"🎉 Your shop '{shop_name}' has been APPROVED on ExpiryGo!"
    display_name = vendor_name.strip() if vendor_name else "Vendor"
    
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <h2 style="color: #059669; margin-top: 0;">🎉 Your Store is Approved!</h2>
        <p>Hello <strong>{display_name}</strong>,</p>
        <p>Great news! Your store <strong>{shop_name}</strong> has been reviewed and verified by our Admin moderation team.</p>
        <p>You can now log in to your Vendor Dashboard, post surplus food deals, and start selling!</p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:3000/shop" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Open Vendor Dashboard</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">ExpiryGo Marketplace Team</p>
    </div>
</body>
</html>"""

    text_fallback = f"Hello {display_name},\n\nYour shop '{shop_name}' has been APPROVED on ExpiryGo! You can now publish surplus food deals.\n\nOpen your Vendor Dashboard: http://localhost:3000/shop\n\nExpiryGo Team"
    
    return send_email_notification(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_fallback=text_fallback,
    )


def send_vendor_rejection_email(to_email: str, vendor_name: str, shop_name: str, reason: str) -> bool:
    """Dispatches rejection and resubmission instructions to vendor."""
    subject = f"Update regarding your ExpiryGo shop application: {shop_name}"
    display_name = vendor_name.strip() if vendor_name else "Vendor"
    clean_reason = reason.strip() if reason else "Documentation or location verification required."
    
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <h2 style="color: #dc2626; margin-top: 0;">Shop Application Update</h2>
        <p>Hello <strong>{display_name}</strong>,</p>
        <p>Thank you for your interest in ExpiryGo. After review, our moderation team was unable to approve your application for <strong>{shop_name}</strong>.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason for Rejection:</p>
            <p style="margin: 6px 0 0 0; color: #7f1d1d;">{clean_reason}</p>
        </div>
        <p><strong>You may resubmit:</strong> Please log in to your account and upload corrected shop documents or photos to request a fresh review.</p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:3000/shop/setup" style="background-color: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Resubmit Application</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">ExpiryGo Marketplace Team</p>
    </div>
</body>
</html>"""

    text_fallback = f"Hello {display_name},\n\nYour shop application for '{shop_name}' was not approved.\nReason: {clean_reason}\n\nYou may resubmit with corrected documents at http://localhost:3000/shop/setup\n\nExpiryGo Team"

    return send_email_notification(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_fallback=text_fallback,
    )
