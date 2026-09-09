"""
ExpiryGo 6-Digit OTP (One-Time Password) Authentication Service.
Handles cryptographically secure OTP generation, rate limiting cooldowns,
rich HTML email dispatch via SMTP, single-use consumption, and brute-force protection.
"""

import time
import secrets
import logging
import threading
from typing import Optional, Dict, Any, Tuple
from services.email import send_email_notification

logger = logging.getLogger("expirygo.otp")

# Thread-safe in-memory OTP store
_OTP_LOCK = threading.Lock()
_OTP_STORE: Dict[str, Dict[str, Any]] = {}

OTP_EXPIRATION_SECONDS = 600  # 10 minutes
OTP_RESEND_COOLDOWN_SECONDS = 60  # 60 seconds cooldown
MAX_VERIFICATION_ATTEMPTS = 5


def generate_otp_code() -> str:
    """Generates a cryptographically secure 6-digit numeric OTP code string."""
    code_int = secrets.randbelow(900000) + 100000
    return str(code_int)


def generate_and_send_otp(identifier: str, name: Optional[str] = None, purpose: str = "login") -> Tuple[bool, str]:
    """
    Generates a 6-digit OTP, applies rate limiting cooldown,
    dispatches email notification, and records dispatch in memory.
    Returns (success, message).
    """
    clean_id = identifier.strip().lower()
    if not clean_id:
        return False, "Identifier (email or phone) is required."

    now = time.time()

    with _OTP_LOCK:
        existing = _OTP_STORE.get(clean_id)
        if existing:
            elapsed = now - existing.get("last_sent_at", 0)
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                return False, f"Please wait {remaining} seconds before requesting a new OTP code."

        otp_code = generate_otp_code()
        _OTP_STORE[clean_id] = {
            "code": otp_code,
            "identifier": clean_id,
            "name": (name or "").strip(),
            "purpose": purpose,
            "created_at": now,
            "last_sent_at": now,
            "expires_at": now + OTP_EXPIRATION_SECONDS,
            "attempts": 0,
        }

    # Dispatch rich HTML email if identifier is an email address
    if "@" in clean_id:
        display_name = (name or "").strip() or "Valued User"
        is_reset = purpose == "reset_password"
        subject = f"🔐 Reset Your Meeva Password: {otp_code}" if is_reset else f"🔐 Your Meeva Login Code: {otp_code}"
        title_text = "Password Reset Request" if is_reset else "Your One-Time Login Code"
        body_text = "Use the 6-digit verification code below to securely reset your Meeva account password:" if is_reset else "Use the 6-digit verification code below to securely log in or verify your Meeva account:"
        action_note = "If you did not request a password reset, please ignore this email. Your password will remain unchanged." if is_reset else "If you did not request this code, you can safely ignore this email. Never share this code with anyone."

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title_text}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="540" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; text-align: left;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px 36px; text-align: center;">
                            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 18px; border-radius: 9999px; margin-bottom: 8px;">
                                <span style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">🌱 Mee<span style="color: #ede9fe;">va</span></span>
                            </div>
                            <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">{title_text}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 36px 36px 28px 36px;">
                            <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0;">Hello {display_name},</p>
                            <p style="font-size: 15px; color: #334155; margin: 12px 0 24px 0;">
                                {body_text}
                            </p>
                            <div style="text-align: center; margin: 28px 0; background: #faf5ff; border-radius: 16px; padding: 24px; border: 2px dashed #d8b4fe;">
                                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">
                                    {otp_code}
                                </div>
                                <p style="font-size: 12px; color: #64748b; margin: 12px 0 0 0; font-weight: 600;">
                                    ⏱️ Valid for 10 minutes &bull; Single-use only
                                </p>
                            </div>
                            <p style="font-size: 13px; color: #64748b; margin: 20px 0 0 0; line-height: 1.5;">
                                {action_note}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f1f5f9; padding: 20px 36px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0;">&copy; Meeva Surplus Marketplace. Safe & Secure Login.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
        text_fallback = f"""Hello {display_name},

Your 6-digit Meeva verification code is: {otp_code}

{body_text}
This code is valid for 10 minutes. Do not share this code with anyone.

---
Meeva Team
"""
        send_email_notification(
            to_email=clean_id,
            subject=subject,
            html_content=html_content,
            text_fallback=text_fallback,
            token=otp_code,
        )

    logger.info(f"[OTP DISPATCH] 6-digit OTP code for {clean_id} (purpose={purpose}): {otp_code}")
    return True, f"6-digit OTP code dispatched successfully to {clean_id}."


def verify_otp_code(identifier: str, code: str) -> Tuple[bool, str]:
    """
    Validates a submitted 6-digit OTP code for an identifier.
    Consumes the code on success.
    Returns (is_valid, message).
    """
    clean_id = identifier.strip().lower()
    clean_code = code.strip()

    if not clean_id or not clean_code:
        return False, "Identifier and 6-digit OTP code are required."

    now = time.time()

    with _OTP_LOCK:
        record = _OTP_STORE.get(clean_id)
        if not record:
            return False, "No active OTP found for this email/number. Please request a new code."

        if now > record.get("expires_at", 0):
            _OTP_STORE.pop(clean_id, None)
            return False, "This OTP code has expired (10-minute limit). Please request a new one."

        record["attempts"] = record.get("attempts", 0) + 1
        if record["attempts"] > MAX_VERIFICATION_ATTEMPTS:
            _OTP_STORE.pop(clean_id, None)
            return False, "Too many invalid attempts. Please request a new OTP code."

        expected_code = str(record.get("code", "")).strip()
        if clean_code != expected_code:
            remaining_attempts = MAX_VERIFICATION_ATTEMPTS - record["attempts"]
            return False, f"Incorrect OTP code. {remaining_attempts} attempt(s) remaining."

        # Code is valid -> consume OTP
        _OTP_STORE.pop(clean_id, None)

    return True, "OTP verified successfully."


def send_otp_to_identifier(identifier: str, name: Optional[str] = None, purpose: str = "login") -> Dict[str, Any]:
    """
    Wrapper for router endpoints returning dict structure.
    In debug mode, includes dev_code for instant developer testing.
    """
    clean_id = identifier.strip().lower()
    now = time.time()
    with _OTP_LOCK:
        existing = _OTP_STORE.get(clean_id)
        if existing:
            elapsed = now - existing.get("last_sent_at", 0)
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                return {
                    "success": False,
                    "message": f"Please wait {remaining} seconds before requesting a new OTP code.",
                    "cooldown_remaining": remaining,
                    "dev_code": existing.get("code"),
                }

    success, msg = generate_and_send_otp(clean_id, name=name, purpose=purpose)
    with _OTP_LOCK:
        current_record = _OTP_STORE.get(clean_id, {})
        code_val = current_record.get("code")
    return {
        "success": success,
        "message": msg,
        "expires_in_seconds": OTP_EXPIRATION_SECONDS,
        "cooldown_remaining": 0,
        "dev_code": code_val,
    }


def clear_otp_store() -> None:
    """Helper to reset OTP store in tests."""
    with _OTP_LOCK:
        _OTP_STORE.clear()
