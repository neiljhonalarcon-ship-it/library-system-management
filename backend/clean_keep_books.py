"""
Clean All Data EXCEPT Admin + Books
Keeps: admin user, books, authors
Clears: members, transactions, fines, reservations, verification codes, other users
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def clean_all():
    print("=" * 60)
    print("  CLEAN DATA - KEEP ADMIN + BOOKS")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    tables = [
        ("users", "Users"),
        ("authors", "Authors"),
        ("books", "Books"),
        ("members", "Members"),
        ("borrow_transactions", "Borrow Transactions"),
        ("reservations", "Reservations"),
        ("fines", "Fines"),
        ("verification_codes", "Verification Codes"),
    ]

    print("\nBEFORE CLEANUP:\n")
    for table, label in tables:
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {label:<25}: {count}")
        except Exception:
            print(f"  {label:<25}: (not found)")

    print("\n" + "=" * 60)
    print("  WARNING")
    print("=" * 60)
    print("KEPT: admin user, all books, all authors")
    print("DELETED: members, transactions, reservations, fines,")
    print("         verification codes, users except admin")
    print("=" * 60)

    confirm = input("\nType 'CLEAN' to confirm: ").strip()
    if confirm != "CLEAN":
        print("\nCancelled.")
        conn.close()
        return

    print("\nDeleting data...\n")

    delete_order = [
        ("fines", "Fines"),
        ("reservations", "Reservations"),
        ("borrow_transactions", "Borrow Transactions"),
        ("verification_codes", "Verification Codes"),
        ("members", "Members"),
    ]

    for table, label in delete_order:
        try:
            c.execute(f"DELETE FROM {table}")
            print(f"  [OK] {label} cleared")
        except Exception as e:
            print(f"  [SKIP] {label}: {e}")

    try:
        c.execute("DELETE FROM users WHERE username != 'admin'")
        print("  [OK] Other users cleared (admin kept)")
    except Exception as e:
        print(f"  [SKIP] Users: {e}")

    print("\nResetting ID counters...")
    for table in ["members", "borrow_transactions", "reservations", "fines", "verification_codes"]:
        try:
            c.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
        except Exception:
            pass
    print("  [OK] Counters reset")

    conn.commit()

    print("\nAFTER CLEANUP:\n")
    for table, label in tables:
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {label:<25}: {count}")
        except Exception:
            pass

    print("\n" + "=" * 60)
    print("  ADMIN ACCOUNT (kept):")
    print("=" * 60)
    admin = c.execute(
        "SELECT user_id, username, role FROM users WHERE username = 'admin'"
    ).fetchone()
    if admin:
        print(f"  User ID:  {admin[0]}")
        print(f"  Username: {admin[1]}")
        print(f"  Role:     {admin[2]}")
    else:
        print("  WARNING: Admin account not found!")

    print("\n" + "=" * 60)
    print("  CLEANUP COMPLETE")
    print("=" * 60 + "\n")

    conn.close()


if __name__ == "__main__":
    clean_all()