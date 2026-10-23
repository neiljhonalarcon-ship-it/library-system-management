import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

columns = [row[1] for row in c.execute("PRAGMA table_info(books)").fetchall()]

if "images" not in columns:
    c.execute("ALTER TABLE books ADD COLUMN images TEXT")
    conn.commit()
    print("✅ Added 'images' column to books table.")
else:
    print("✅ 'images' column already exists.")

conn.close()