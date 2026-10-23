import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# ============================================================
# SHOW CURRENT MEMBERS
# ============================================================
print("\n" + "=" * 70)
print("  📋 CURRENT MEMBERS")
print("=" * 70)
print(f"{'ID':<5} {'Name':<25} {'Username':<20} {'Borrows':<10}")
print("-" * 70)

members = c.execute("SELECT member_id, first_name, last_name, username FROM members").fetchall()

for m in members:
    # Count transactions
    tx_count = c.execute(
        "SELECT COUNT(*) FROM borrow_transactions WHERE member_id = ?", 
        (m["member_id"],)
    ).fetchone()[0]
    name = f"{m['first_name']} {m['last_name']}"[:24]
    username = (m["username"] or "(none)")[:19]
    print(f"{m['member_id']:<5} {name:<25} {username:<20} {tx_count:<10}")

# ============================================================
# ASK WHAT TO DELETE
# ============================================================
print("\n" + "=" * 70)
print("  🗑️  DELETE OPTIONS")
print("=" * 70)
print("  [1] Delete SPECIFIC member (i-type yung ID)")
print("  [2] Delete ALL members (full wipe)")
print("  [3] Cancel")
print("=" * 70)

choice = input("\n👉 Choice (1/2/3): ").strip()

if choice == "1":
    member_id = input("Enter member ID to delete: ").strip()
    if not member_id.isdigit():
        print("❌ Invalid ID")
        conn.close()
        exit()
    
    # Delete related records first (fines → transactions → member)
    c.execute("""
        DELETE FROM fines WHERE transaction_id IN 
        (SELECT transaction_id FROM borrow_transactions WHERE member_id = ?)
    """, (member_id,))
    c.execute("DELETE FROM borrow_transactions WHERE member_id = ?", (member_id,))
    c.execute("DELETE FROM reservations WHERE member_id = ?", (member_id,))
    c.execute("DELETE FROM members WHERE member_id = ?", (member_id,))
    conn.commit()
    print(f"\n✅ Deleted member #{member_id} and all related records.")

elif choice == "2":
    confirm = input("⚠️  Type 'DELETE ALL' to confirm: ").strip()
    if confirm != "DELETE ALL":
        print("❌ Cancelled")
        conn.close()
        exit()
    
    # Full wipe
    c.execute("DELETE FROM fines")
    c.execute("DELETE FROM borrow_transactions")
    c.execute("DELETE FROM reservations")
    c.execute("DELETE FROM members")
    conn.commit()
    print("\n✅ ALL members and their records deleted.")

else:
    print("Cancelled.")

conn.close()
print("\n" + "=" * 70 + "\n")