"""
Approve My Account
Quick script to approve your own account for testing.
Run: py approve_me.py
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def approve():
    print("=" * 60)
    print("  APPROVE MY ACCOUNT")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Show all pending members
    pending = c.execute("""
        SELECT member_id, first_name, last_name, email, username, email_verified
        FROM members
        WHERE approval_status = 'Pending'
    """).fetchall()

    if not pending:
        print("\n✅ No pending accounts.")
        conn.close()
        return

    print(f"\n📋 Pending accounts ({len(pending)}):\n")
    for row in pending:
        verified = "✅ Verified" if row["email_verified"] else "❌ Not verified"
        print(f"  #{row['member_id']} | {row['first_name']} {row['last_name']}")
        print(f"      Username: {row['username']}")
        print(f"      Email: {row['email']}")
        print(f"      Status: {verified}")
        print()

    print("-" * 60)
    choice = input("👉 Enter member ID to approve (or 'all'): ").strip().lower()

    if choice == "all":
        c.execute("""
            UPDATE members
            SET approval_status = 'Approved'
            WHERE approval_status = 'Pending' AND email_verified = 1
        """)
        count = c.rowcount
        conn.commit()
        print(f"\n✅ Approved {count} account(s)!")
    else:
        try:
            member_id = int(choice)
            c.execute("""
                UPDATE members
                SET approval_status = 'Approved'
                WHERE member_id = ? AND email_verified = 1
            """, (member_id,))
            if c.rowcount > 0:
                conn.commit()
                print(f"\n✅ Approved member #{member_id}!")
            else:
                print(f"\n❌ Member #{member_id} not found or not verified.")
        except ValueError:
            print(f"\n❌ Invalid input.")

    conn.close()
    print("=" * 60 + "\n")


if __name__ == "__main__":
    approve()