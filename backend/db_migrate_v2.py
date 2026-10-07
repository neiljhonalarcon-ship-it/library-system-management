"""
Database Migration v2
Adds the reservations table for the online reservation system.
Run ONCE: py db_migrate_v2.py
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def table_exists(cursor, table):
    """Check if a table exists."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def migrate():
    print("=" * 60)
    print("  DATABASE MIGRATION v2 — RESERVATIONS")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"❌ ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("\n[1/1] Creating 'reservations' table...")

    if not table_exists(c, "reservations"):
        c.execute("""
            CREATE TABLE reservations (
                reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                pickup_date TEXT NOT NULL,
                pickup_time TEXT NOT NULL,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                FOREIGN KEY (member_id) REFERENCES members(member_id),
                FOREIGN KEY (book_id) REFERENCES books(book_id)
            )
        """)
        print("   ✅ Created table: reservations")
    else:
        print("   ℹ️  Table already exists: reservations")

    conn.commit()

    # Verify
    c.execute("PRAGMA table_info(reservations)")
    cols = [row[1] for row in c.fetchall()]

    conn.close()

    print("\n" + "=" * 60)
    print("  ✅ MIGRATION v2 COMPLETE!")
    print("=" * 60)
    print(f"\n  Reservations table columns ({len(cols)}):")
    for col in cols:
        print(f"    • {col}")
    print("\n  Next step: Restart Flask with 'py app.py'")
    print("=" * 60)


if __name__ == "__main__":
    migrate()