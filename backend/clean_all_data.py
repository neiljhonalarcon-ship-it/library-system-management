"""
Clean All Data Script
Deletes ALL data except the admin user account.
Perfect for starting fresh before a demo/presentation.
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def clean_all():
    print("=" * 60)
    print("  🧹 CLEAN ALL DATA")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    tables = [
        ("books", "Books"),
        ("authors", "Authors"),
        ("book_authors", "Book-Author Links"),
        ("members", "Members"),
        ("borrow_transactions", "Borrow Transactions"),
        ("reservations", "Reservations"),
        ("fines", "Fines"),
        ("verification_codes", "Verification Codes"),
        ("users", "Users (total)"),
    ]

    print("\n📊 BEFORE CLEANUP:\n")
    for table, label in tables:
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {label:<25}: {count}")
        except Exception:
            print(f"  {label:<25}: (table not found)")

    print("\n" + "=" * 60)
    print("⚠️  WARNING!")
    print("=" * 60)
    print("This will DELETE ALL data except the admin user.")
    print("=" * 60)

    confirm = input("\n👉 Type 'CLEAN' (all caps) to confirm: ").strip()

    if confirm != "CLEAN":
        print("\n❌ Cancelled. Nothing was deleted.")
        conn.close()
        return

    print("\n🧹 Deleting data...\n")

    delete_order = [
        ("fines", "Fines"),
        ("reservations", "Reservations"),
        ("borrow_transactions", "Borrow Transactions"),
        ("verification_codes", "Verification Codes"),
        ("book_authors", "Book-Author links"),
        ("books", "Books"),
        ("authors", "Authors"),
        ("members", "Members"),
    ]

    for table, label in delete_order:
        try:
            c.execute(f"DELETE FROM {table}")
            print(f"  ✅ {label} cleared")
        except Exception:
            print(f"  ℹ️  {label} table not found")

    try:
        c.execute("DELETE FROM users WHERE username != 'admin'")
        print("  ✅ Other users cleared (admin kept)")
    except Exception:
        print("  ℹ️  Users table not found")

    print("\n🔄 Resetting ID counters...\n")

    for table, _ in delete_order:
        try:
            c.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        except Exception:
            pass

    print("  ✅ ID counters reset")

    conn.commit()

    print("\n📊 AFTER CLEANUP:\n")
    for table, label in tables:
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {label:<25}: {count}")
        except Exception:
            pass

    print("\n" + "=" * 60)
    print("🔐 ADMIN ACCOUNT (KEPT):")
    print("=" * 60)
    admin = c.execute(
        "SELECT user_id, username, role FROM users WHERE username = 'admin'"
    ).fetchone()
    if admin:
        print(f"  User ID:  {admin[0]}")
        print(f"  Username: {admin[1]}")
        print(f"  Role:     {admin[2]}")
        print(f"  Password: admin123 (unchanged)")
    else:
        print("  ⚠️  WARNING: Admin account not found!")

    conn.close()

    print("\n" + "=" * 60)
    print("  ✅ CLEANUP COMPLETE!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    clean_all()