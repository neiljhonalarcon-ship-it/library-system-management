"""
Demo Data Setup Script
Run this to reset the database to a nice demo state.
Perfect for presentations!
"""

import sqlite3
import os
from datetime import date, timedelta

# Path to database
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def setup_demo():
    print("=" * 60)
    print("  SETTING UP DEMO DATA")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    today = date.today()

    # ============================================================
    # STEP 1: CLEAR OLD DATA
    # ============================================================
    print("\n[1/5] Clearing old transactions and fines...")
    c.execute("DELETE FROM borrow_transactions")
    c.execute("DELETE FROM fines")
    c.execute("UPDATE members SET total_fines = 0")
    c.execute("UPDATE books SET available_copies = total_copies")
    print("      Done!")

    # ============================================================
    # STEP 2: DEMO 1 - Currently Borrowed (not overdue)
    # ============================================================
    print("\n[2/5] Adding Demo 1: Book currently borrowed...")
    borrow_date = (today - timedelta(days=10)).isoformat()
    due_date = (today + timedelta(days=5)).isoformat()

    c.execute("""
        INSERT INTO borrow_transactions
        (member_id, book_id, borrow_date, due_date, status)
        VALUES (?, ?, ?, ?, 'Borrowed')
    """, (1, 1, borrow_date, due_date))  # Juan + Harry Potter

    c.execute("UPDATE books SET available_copies = available_copies - 1 WHERE book_id = 1")
    print(f"      Juan Dela Cruz borrowed 'Harry Potter'")
    print(f"      Due: {due_date} (in 5 days)")

    # ============================================================
    # STEP 3: DEMO 2 - Overdue Book
    # ============================================================
    print("\n[3/5] Adding Demo 2: Overdue book...")
    borrow_date = (today - timedelta(days=20)).isoformat()
    due_date = (today - timedelta(days=5)).isoformat()

    c.execute("""
        INSERT INTO borrow_transactions
        (member_id, book_id, borrow_date, due_date, status)
        VALUES (?, ?, ?, ?, 'Overdue')
    """, (2, 2, borrow_date, due_date))  # Maria + The Hobbit

    c.execute("UPDATE books SET available_copies = available_copies - 1 WHERE book_id = 2")
    print(f"      Maria Santos borrowed 'The Hobbit'")
    print(f"      Due: {due_date} (5 days AGO - OVERDUE!)")

    # ============================================================
    # STEP 4: DEMO 3 - Returned late with PAID fine
    # ============================================================
    print("\n[4/5] Adding Demo 3: Late return with PAID fine...")
    borrow_date = (today - timedelta(days=25)).isoformat()
    due_date = (today - timedelta(days=11)).isoformat()
    return_date = (today - timedelta(days=3)).isoformat()

    c.execute("""
        INSERT INTO borrow_transactions
        (member_id, book_id, borrow_date, due_date, return_date, status, fine_amount)
        VALUES (?, ?, ?, ?, ?, 'Returned', 40)
    """, (3, 3, borrow_date, due_date, return_date))  # Jose + Game of Thrones

    tx_id = c.lastrowid

    c.execute("""
        INSERT INTO fines
        (transaction_id, amount, fine_per_day, overdue_days, date_incurred, date_paid, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Paid')
    """, (tx_id, 40, 10, 8, return_date, (today - timedelta(days=1)).isoformat()))

    print(f"      Jose Rizal returned 'Game of Thrones' 8 days late")
    print(f"      Fine: P40.00 (PAID)")

    # ============================================================
    # STEP 5: DEMO 4 - Returned late with UNPAID fine
    # ============================================================
    print("\n[5/5] Adding Demo 4: Late return with UNPAID fine...")
    borrow_date = (today - timedelta(days=15)).isoformat()
    due_date = (today - timedelta(days=5)).isoformat()
    return_date = (today - timedelta(days=2)).isoformat()

    c.execute("""
        INSERT INTO borrow_transactions
        (member_id, book_id, borrow_date, due_date, return_date, status, fine_amount)
        VALUES (?, ?, ?, ?, ?, 'Returned', 15)
    """, (4, 4, borrow_date, due_date, return_date))  # Andres + Orient Express

    tx_id = c.lastrowid

    c.execute("""
        INSERT INTO fines
        (transaction_id, amount, fine_per_day, overdue_days, date_incurred, status)
        VALUES (?, ?, ?, ?, ?, 'Unpaid')
    """, (tx_id, 15, 5, 3, return_date))

    c.execute("UPDATE members SET total_fines = total_fines + 15 WHERE member_id = 4")

    print(f"      Andres Bonifacio returned 'Orient Express' 3 days late")
    print(f"      Fine: P15.00 (UNPAID)")

    # ============================================================
    # DONE
    # ============================================================
    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("  ✅ DEMO DATA READY!")
    print("=" * 60)
    print("\n  Summary:")
    print("    📚 2 books currently out (1 overdue)")
    print("    💰 2 fines total (1 paid, 1 unpaid)")
    print("    👥 Andres owes P15.00")
    print("\n  Refresh your browser to see the changes!")
    print("=" * 60)


if __name__ == "__main__":
    setup_demo()