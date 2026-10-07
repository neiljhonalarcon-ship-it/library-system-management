import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

print("=" * 60)
print("  DATABASE SCHEMA")
print("=" * 60)

for name, sql in c.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
):
    print(f"\n--- {name} ---")
    print(sql)

conn.close()
print("\n" + "=" * 60)