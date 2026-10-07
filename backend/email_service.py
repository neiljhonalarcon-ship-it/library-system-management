"""
Email Service
Sends verification codes using Gmail SMTP.
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
import sqlite3


# ============================================================
# CONFIG - FILL THESE IN
# ============================================================
# ⚠️ IMPORTANT: Replace these with your actual credentials!
GMAIL_USER = os.environ.get("GMAIL_USER", "neildoughh@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "psyfqvgfljnprkll")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


# ============================================================
# GENERATE 6-DIGIT CODE
# ============================================================
def generate_code():
    """Generate a random 6-digit code."""
    return str(random.randint(100000, 999999))


# ============================================================
# SAVE CODE TO DATABASE
# ============================================================
def save_verification_code(email, code, purpose="registration", expiry_minutes=10):
    """Save a verification code to the database with expiry."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    expires_at = (datetime.now() + timedelta(minutes=expiry_minutes)).isoformat()

    # Delete any old codes for this email+purpose
    c.execute("DELETE FROM verification_codes WHERE email = ? AND purpose = ?",
              (email, purpose))

    # Insert new code
    c.execute("""
        INSERT INTO verification_codes (email, code, purpose, expires_at, used)
        VALUES (?, ?, ?, ?, 0)
    """, (email, code, purpose, expires_at))

    conn.commit()
    conn.close()
    return True


# ============================================================
# VERIFY CODE
# ============================================================
def verify_code(email, code, purpose="registration"):
    """Check if a code is valid. Returns (success, message)."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    row = c.execute("""
        SELECT id, code, expires_at, used
        FROM verification_codes
        WHERE email = ? AND purpose = ?
        ORDER BY id DESC LIMIT 1
    """, (email, purpose)).fetchone()

    if not row:
        conn.close()
        return False, "No verification code found"

    code_id, saved_code, expires_at_str, used = row

    if used:
        conn.close()
        return False, "Code already used"

    if saved_code != code:
        conn.close()
        return False, "Invalid code"

    # Check expiry
    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.now() > expires_at:
        conn.close()
        return False, "Code expired. Please request a new one."

    # Mark as used
    c.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (code_id,))
    conn.commit()
    conn.close()

    return True, "Verified successfully"


# ============================================================
# SEND EMAIL
# ============================================================
def send_verification_email(to_email, code, name="Student"):
    """Send verification code via Gmail."""
    if GMAIL_USER == "YOUR_EMAIL@gmail.com":
        # Not configured yet — return simulated mode
        return False, "not_configured"

    subject = "Library System - Your Verification Code"
    body_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 30px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px;
                    padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0ea5e9);
                            width: 60px; height: 60px; border-radius: 16px; line-height: 60px;
                            font-size: 30px;">📚</div>
            </div>
            <h1 style="color: #0f172a; text-align: center; font-size: 22px;
                       margin: 0 0 10px 0;">Verify Your Email</h1>
            <p style="color: #64748b; text-align: center; font-size: 14px;
                      margin: 0 0 30px 0;">Hi {name}, use this code to verify your account:</p>

            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 20px 40px; background: #f8fafc;
                            border: 2px dashed #14b8a6; border-radius: 12px;
                            font-size: 36px; font-weight: 800; color: #0f172a;
                            letter-spacing: 8px;">{code}</div>
            </div>

            <p style="color: #94a3b8; text-align: center; font-size: 12px;
                      margin: 30px 0 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; text-align: center; font-size: 12px;
                      margin: 5px 0 0 0;">If you didn't request this, ignore this email.</p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px;
                        border-top: 1px solid #e2e8f0;">
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                    Library Management System
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Library System <{GMAIL_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True, "sent"
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False, str(e)


# ============================================================
# SIMULATED SMS (prints to console)
# ============================================================
def send_verification_sms(phone, code):
    """
    Simulated SMS - prints to console instead of sending real SMS.
    In production, this would call Twilio or Semaphore API.
    """
    print("\n" + "=" * 60)
    print("  📱 SIMULATED SMS")
    print("=" * 60)
    print(f"  To: {phone}")
    print(f"  Message: Your Library System code is: {code}")
    print("=" * 60)
    print("  (In production, this would use Semaphore/Twilio)")
    print("=" * 60 + "\n")
    return True


# ============================================================
# COMBINED: Send code via email + simulated SMS
# ============================================================
def send_verification_both(email, phone, code, name="Student"):
    """Send verification code via email and simulated SMS."""
    email_success, email_status = send_verification_email(email, code, name)

    # Always simulate SMS
    send_verification_sms(phone, code)

    return {
        "email_sent": email_success,
        "email_status": email_status,
        "code": code  # Return code so frontend can show it if email fails
    }


# ============================================================
# TEST MODE
# ============================================================
if __name__ == "__main__":
    print("\n🔧 EMAIL SERVICE TEST\n")

    # Test config
    print(f"Gmail User: {GMAIL_USER}")
    print(f"App Password set: {'Yes' if GMAIL_APP_PASSWORD != 'YOUR_APP_PASSWORD' else 'No'}")

    # Generate and save a test code
    test_email = "test@example.com"
    test_code = generate_code()
    save_verification_code(test_email, test_code)

    print(f"\n📧 Generated code: {test_code}")
    print(f"💾 Saved to database for {test_email}")

    # Verify it
    success, msg = verify_code(test_email, test_code)
    print(f"✅ Verification test: {success} - {msg}")

    # Test again (should fail - code used)
    success, msg = verify_code(test_email, test_code)
    print(f"❌ Second attempt: {success} - {msg}")

    print("\n✅ Email service test complete!\n")