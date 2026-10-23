import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Add is_deleted to books
columns_books = [row[1] for row in c.execute("PRAGMA table_info(books)").fetchall()]
if "is_deleted" not in columns_books:
    c.execute("ALTER TABLE books ADD COLUMN is_deleted INTEGER DEFAULT 0")
    print("✅ Added 'is_deleted' to books")

# Add is_deleted to members
columns_members = [row[1] for row in c.execute("PRAGMA table_info(members)").fetchall()]
if "is_deleted" not in columns_members:
    c.execute("ALTER TABLE members ADD COLUMN is_deleted INTEGER DEFAULT 0")
    print("✅ Added 'is_deleted' to members")

conn.commit()
conn.close()
print("🎉 Migration complete!")