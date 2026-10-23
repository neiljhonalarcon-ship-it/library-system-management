import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Check if column already exists
columns = [row[1] for row in c.execute("PRAGMA table_info(borrow_transactions)").fetchall()]

if "copy_number" in columns:
    print("✅ Column 'copy_number' already exists. Skipping.")
else:
    c.execute("ALTER TABLE borrow_transactions ADD COLUMN copy_number INTEGER DEFAULT 1")
    conn.commit()
    print("✅ Added 'copy_number' column to borrow_transactions")

conn.close()
print("\n🎉 Migration complete!\n")