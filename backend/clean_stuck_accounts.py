"""
Clean Stuck Accounts
Deletes member accounts that never verified their email.
Run: py clean_stuck_accounts.py
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def clean():
    print("=" * 60)
    print("  CLEAN STUCK ACCOUNTS")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Find stuck accounts: unverified + pending
    stuck = c.execute("""
        SELECT member_id, first_name, last_name, email, username, date_registered
        FROM members
        WHERE email_verified = 0 AND approval_status = 'Pending'
    """).fetchall()

    if not stuck:
        print("\n✅ No stuck accounts found — database is clean!\n")
        conn.close()
        return

    print(f"\n📋 Found {len(stuck)} stuck account(s):\n")
    for row in stuck:
        member_id, first_name, last_name, email, username, date_reg = row
        print(f"  #{member_id} | {first_name} {last_name}")
        print(f"      Email: {email}")
        print(f"      Username: {username or '(none)'}")
        print(f"      Registered: {date_reg}")
        print()

    print("-" * 60)
    confirm = input("👉 Delete all of these? (yes/no): ").strip().lower()

    if confirm != "yes":
        print("❌ Cancelled")
        conn.close()
        return

    # Delete verification codes
    emails = [row[3] for row in stuck]
    placeholders = ",".join("?" * len(emails))
    c.execute(f"DELETE FROM verification_codes WHERE email IN ({placeholders})", emails)

    # Delete stuck members
    ids = [row[0] for row in stuck]
    placeholders = ",".join("?" * len(ids))
    c.execute(f"DELETE FROM members WHERE member_id IN ({placeholders})", ids)
    deleted = c.rowcount

    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print(f"  ✅ DELETED {deleted} stuck account(s)")
    print("=" * 60)
    print("\n  🚀 You can now register again with those emails.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    clean()