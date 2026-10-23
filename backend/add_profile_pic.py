import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

columns = [row[1] for row in c.execute("PRAGMA table_info(members)").fetchall()]

if "profile_pic" not in columns:
    c.execute("ALTER TABLE members ADD COLUMN profile_pic TEXT")
    conn.commit()
    print("✅ Added 'profile_pic' column to members table.")
else:
    print("✅ 'profile_pic' column already exists.")

conn.close()