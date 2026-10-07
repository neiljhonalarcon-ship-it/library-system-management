"""
Authentication Service
Handles member registration, verification, and login logic.
"""

import sqlite3
import bcrypt
import os
from datetime import datetime
from email_service import (
    generate_code,
    save_verification_code,
    verify_code,
    send_verification_both,
)


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


# ============================================================
# ALLOWED GRADE LEVELS
# ============================================================
ALLOWED_GRADE_LEVELS = [
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
    "Faculty",
    "Community",
]

BLOCKED_GRADE_LEVELS = [
    "Grade 7",
    "Grade 8",
]


# ============================================================
# CHECK IF GRADE LEVEL IS ALLOWED
# ============================================================
def can_register_grade(grade_level):
    """Check if a grade level is allowed to register."""
    if grade_level in ALLOWED_GRADE_LEVELS:
        return True, "Allowed"
    if grade_level in BLOCKED_GRADE_LEVELS:
        return False, f"{grade_level} students must register at the library desk"
    return False, "Invalid grade level"


# ============================================================
# CHECK IF USERNAME IS TAKEN
# ============================================================
def check_username_available(username):
    """Check if username is not taken."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    existing = c.execute(
        "SELECT member_id FROM members WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return existing is None


# ============================================================
# REGISTER NEW MEMBER
# ============================================================
def register_member(first_name, last_name, email, contact_number,
                    username, password, member_type, grade_level, section=None):
    """
    Register a new member.

    - If email has a stuck account (unverified + pending), it will be deleted and re-created.
    - If email has a REAL account (verified or approved), blocked.
    """

    # Validate required fields
    if not all([first_name, last_name, email, contact_number,
                username, password, member_type, grade_level]):
        return False, "All required fields must be filled", None

    # Validate grade level
    allowed, grade_msg = can_register_grade(grade_level)
    if not allowed:
        return False, grade_msg, None

    # Validate password length
    if len(password) < 6:
        return False, "Password must be at least 6 characters", None

    # Validate contact number (11 digits)
    if not contact_number.isdigit() or len(contact_number) != 11:
        return False, "Contact number must be exactly 11 digits", None

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # ============================================================
    # STEP 1: Handle existing stuck account with same email
    # ============================================================
    stuck = c.execute("""
        SELECT member_id FROM members
        WHERE email = ? AND email_verified = 0 AND approval_status = 'Pending'
    """, (email,)).fetchone()

    if stuck:
        # Stuck account exists — delete it so we can re-create fresh
        c.execute("DELETE FROM members WHERE member_id = ?", (stuck[0],))
        c.execute("DELETE FROM verification_codes WHERE email = ?", (email,))
        conn.commit()
        print(f"🗑️  Cleaned up stuck account #{stuck[0]} ({email})")

    # ============================================================
    # STEP 2: Block only REAL accounts (verified or approved)
    # ============================================================
    real_account = c.execute("""
        SELECT member_id FROM members
        WHERE email = ? AND (email_verified = 1 OR approval_status IN ('Approved', 'Rejected'))
    """, (email,)).fetchone()

    if real_account:
        conn.close()
        return False, "Email is already registered. Try logging in instead.", None

    # ============================================================
    # STEP 3: Check username availability
    # ============================================================
    username_taken = c.execute(
        "SELECT member_id FROM members WHERE username = ?", (username,)
    ).fetchone()

    if username_taken:
        conn.close()
        return False, "Username is already taken", None

    # ============================================================
    # STEP 4: Create the account
    # ============================================================
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        c.execute("""
            INSERT INTO members
            (first_name, last_name, email, contact_number, member_type,
             username, password_hash, grade_level, section,
             approval_status, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0)
        """, (
            first_name, last_name, email, contact_number, member_type,
            username, password_hash, grade_level, section,
        ))
        conn.commit()
        member_id = c.lastrowid
        conn.close()

        # Generate and send verification code
        code = generate_code()
        save_verification_code(email, code, purpose="registration")

        # Send email + simulated SMS
        result = send_verification_both(email, contact_number, code, first_name)

        return True, "Registration successful. Please verify your email.", {
            "member_id": member_id,
            "email": email,
            "code_preview": code if not result["email_sent"] else None,
            "email_sent": result["email_sent"],
        }

    except Exception as e:
        conn.close()
        return False, f"Registration failed: {str(e)}", None


# ============================================================
# VERIFY REGISTRATION CODE
# ============================================================
def verify_registration(email, code):
    """Verify a registration code."""
    success, message = verify_code(email, code, purpose="registration")

    if not success:
        return False, message, None

    # Mark email as verified
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE members SET email_verified = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()

    return True, "Email verified! Please wait for admin approval.", None


# ============================================================
# MEMBER LOGIN
# ============================================================
def member_login(username, password):
    """Authenticate a member."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    member = c.execute(
        "SELECT * FROM members WHERE username = ?",
        (username,)
    ).fetchone()

    conn.close()

    if not member:
        return False, "Invalid username or password", None

    if not member["password_hash"]:
        return False, "This account has no password. Please register first.", None

    try:
        if not bcrypt.checkpw(password.encode("utf-8"), member["password_hash"].encode("utf-8")):
            return False, "Invalid username or password", None
    except Exception:
        return False, "Invalid username or password", None

    if member["approval_status"] == "Pending":
        return False, "Your account is pending admin approval", None

    if member["approval_status"] == "Rejected":
        return False, "Your registration was rejected. Please contact the librarian.", None

    if not member["email_verified"]:
        return False, "Please verify your email first", None

    return True, "Login successful", {
        "member_id": member["member_id"],
        "username": member["username"],
        "first_name": member["first_name"],
        "last_name": member["last_name"],
        "member_type": member["member_type"],
    }


# ============================================================
# GET MEMBER BY ID (for profile)
# ============================================================
def get_member_profile(member_id):
    """Get member details (no password)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    member = c.execute("""
        SELECT member_id, first_name, last_name, email, contact_number,
               member_type, grade_level, section, date_registered,
               total_fines, approval_status, username
        FROM members WHERE member_id = ?
    """, (member_id,)).fetchone()

    conn.close()
    return dict(member) if member else None


# ============================================================
# GET PENDING MEMBERS (for admin)
# ============================================================
def get_pending_members():
    """Get all members waiting for approval."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    rows = c.execute("""
        SELECT member_id, first_name, last_name, email, contact_number,
               member_type, grade_level, section, date_registered,
               approval_status, email_verified
        FROM members
        WHERE approval_status = 'Pending'
        ORDER BY date_registered DESC
    """).fetchall()

    conn.close()
    return [dict(r) for r in rows]


# ============================================================
# APPROVE / REJECT MEMBER
# ============================================================
def set_member_approval(member_id, status):
    """Approve or reject a member."""
    if status not in ("Approved", "Rejected"):
        return False, "Invalid status"

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    member = c.execute("SELECT member_id FROM members WHERE member_id = ?", (member_id,)).fetchone()
    if not member:
        conn.close()
        return False, "Member not found"

    c.execute("UPDATE members SET approval_status = ? WHERE member_id = ?", (status, member_id))
    conn.commit()
    conn.close()

    return True, f"Member {status.lower()}"

# ============================================================
# RESEND VERIFICATION CODE
# ============================================================
def resend_verification(email):
    """
    Resend a verification code for a pending account.
    Returns: (success: bool, message: str)
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Check if there's a pending account with this email
    member = c.execute("""
        SELECT member_id, first_name, contact_number, email_verified
        FROM members
        WHERE email = ? AND approval_status = 'Pending'
    """, (email,)).fetchone()

    conn.close()

    if not member:
        return False, "No pending registration found for this email"

    if member["email_verified"]:
        return False, "This email is already verified"

    # Generate new code
    code = generate_code()
    save_verification_code(email, code, purpose="registration")

    # Send email + simulated SMS
    result = send_verification_both(
        email,
        member["contact_number"],
        code,
        member["first_name"]
    )

    return True, "New verification code sent!"



# ============================================================
# TEST MODE
# ============================================================
if __name__ == "__main__":
    print("\n🔧 AUTH SERVICE TEST\n")
    print("=" * 60)

    print("\n📚 Grade Level Validation:")
    for grade in ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Faculty"]:
        allowed, msg = can_register_grade(grade)
        icon = "✅" if allowed else "❌"
        print(f"  {icon} {grade}: {msg}")

    print("\n" + "=" * 60)
    print("✅ Auth service test complete!")
    print("=" * 60 + "\n")