"""
Database Migration Script
Adds new columns to support member accounts, grade levels, and verification.
Run this ONCE: py db_migrate.py
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def column_exists(cursor, table, column):
    """Check if a column already exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def table_exists(cursor, table):
    """Check if a table exists."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def migrate():
    print("=" * 60)
    print("  DATABASE MIGRATION")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"❌ ERROR: Database not found at {DB_PATH}")
        print("   Make sure you've run the app at least once before!")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # ============================================================
    # 1. ADD NEW COLUMNS TO MEMBERS TABLE
    # ============================================================
    print("\n[1/2] Updating 'members' table...")

    new_columns = [
        ("password_hash", "TEXT"),
        ("username", "TEXT"),
        ("grade_level", "TEXT"),
        ("section", "TEXT"),
        ("approval_status", "TEXT DEFAULT 'Approved'"),
        ("email_verified", "INTEGER DEFAULT 1"),
    ]

    added = []
    for col_name, col_type in new_columns:
        if not column_exists(c, "members", col_name):
            c.execute(f"ALTER TABLE members ADD COLUMN {col_name} {col_type}")
            added.append(col_name)
            print(f"   ✅ Added column: {col_name}")
        else:
            print(f"   ℹ️  Column already exists: {col_name}")

    # ============================================================
    # 2. CREATE VERIFICATION CODES TABLE
    # ============================================================
    print("\n[2/2] Creating 'verification_codes' table...")

    if not table_exists(c, "verification_codes"):
        c.execute("""
            CREATE TABLE verification_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                code TEXT NOT NULL,
                purpose TEXT NOT NULL DEFAULT 'registration',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT NOT NULL,
                used INTEGER DEFAULT 0
            )
        """)
        print("   ✅ Created table: verification_codes")
    else:
        print("   ℹ️  Table already exists: verification_codes")

    # ============================================================
    # COMMIT AND FINISH
    # ============================================================
    conn.commit()

    c.execute("PRAGMA table_info(members)")
    all_cols = [row[1] for row in c.fetchall()]
    c.execute("PRAGMA table_info(verification_codes)")
    vc_cols = [row[1] for row in c.fetchall()]

    conn.close()

    print("\n" + "=" * 60)
    print("  ✅ MIGRATION COMPLETE!")
    print("=" * 60)
    print(f"\n  Members table columns ({len(all_cols)}):")
    for col in all_cols:
        marker = " 🆕" if col in added else ""
        print(f"    • {col}{marker}")

    print(f"\n  Verification_codes table columns ({len(vc_cols)}):")
    for col in vc_cols:
        print(f"    • {col}")

    print("\n  Next step: Restart Flask with 'py app.py'")
    print("=" * 60)


if __name__ == "__main__":
    migrate()