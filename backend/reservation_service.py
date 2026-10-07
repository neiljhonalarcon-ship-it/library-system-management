"""
Reservation Service
Handles book reservations — create, list, approve, cancel, complete.
"""

import sqlite3
import os
from datetime import datetime, timedelta


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


# ============================================================
# VALID STATUSES
# ============================================================
VALID_STATUSES = ["Pending", "Ready", "Completed", "Cancelled"]


# ============================================================
# CREATE A RESERVATION
# ============================================================
def create_reservation(member_id, book_id, pickup_date, pickup_time, notes=None):
    """
    Create a new reservation.
    Returns: (success: bool, message: str, reservation_id: int or None)
    """
    # Validate required fields
    if not all([member_id, book_id, pickup_date, pickup_time]):
        return False, "All required fields must be filled", None

    # Validate date format (YYYY-MM-DD)
    try:
        datetime.strptime(pickup_date, "%Y-%m-%d")
    except ValueError:
        return False, "Invalid pickup date format", None

    # Validate time format (HH:MM)
    try:
        datetime.strptime(pickup_time, "%H:%M")
    except ValueError:
        return False, "Invalid pickup time format", None

    # Validate pickup date is not in the past
    today = datetime.now().date()
    try:
        pickup = datetime.strptime(pickup_date, "%Y-%m-%d").date()
        if pickup < today:
            return False, "Pickup date cannot be in the past", None
    except Exception:
        pass

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Check if member exists
    member = c.execute("SELECT member_id, approval_status FROM members WHERE member_id = ?",
                       (member_id,)).fetchone()
    if not member:
        conn.close()
        return False, "Member not found", None

    if member["approval_status"] != "Approved":
        conn.close()
        return False, "Your account is not approved yet", None

    # Check if book exists and has copies
    book = c.execute("SELECT title, available_copies FROM books WHERE book_id = ?",
                     (book_id,)).fetchone()
    if not book:
        conn.close()
        return False, "Book not found", None

    if book["available_copies"] <= 0:
        conn.close()
        return False, "No available copies to reserve", None

    # Check for existing active reservation for this member + book
    existing = c.execute("""
        SELECT reservation_id FROM reservations
        WHERE member_id = ? AND book_id = ?
          AND status IN ('Pending', 'Ready')
    """, (member_id, book_id)).fetchone()

    if existing:
        conn.close()
        return False, "You already have an active reservation for this book", None

    # Check if member has already borrowed this book (active)
    already_borrowed = c.execute("""
        SELECT COUNT(*) FROM borrow_transactions
        WHERE member_id = ? AND book_id = ? AND status IN ('Borrowed', 'Overdue')
    """, (member_id, book_id)).fetchone()[0]

    if already_borrowed > 0:
        conn.close()
        return False, "You already have this book borrowed", None

    # Insert reservation
    try:
        cursor = c.execute("""
            INSERT INTO reservations
            (member_id, book_id, pickup_date, pickup_time, notes, status)
            VALUES (?, ?, ?, ?, ?, 'Pending')
        """, (member_id, book_id, pickup_date, pickup_time, notes))
        conn.commit()
        reservation_id = cursor.lastrowid
        conn.close()

        return True, "Reservation created successfully!", reservation_id
    except Exception as e:
        conn.close()
        return False, f"Failed to create reservation: {str(e)}", None


# ============================================================
# GET MEMBER'S RESERVATIONS
# ============================================================
def get_member_reservations(member_id):
    """Get all reservations for a specific member."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    rows = c.execute("""
        SELECT r.reservation_id, r.book_id, r.pickup_date, r.pickup_time,
               r.notes, r.status, r.created_at, r.completed_at,
               b.title AS book_title, b.isbn, b.genre,
               a.author_name
        FROM reservations r
        JOIN books b ON r.book_id = b.book_id
        LEFT JOIN authors a ON b.author_id = a.author_id
        WHERE r.member_id = ?
        ORDER BY r.created_at DESC
    """, (member_id,)).fetchall()

    conn.close()
    return [dict(row) for row in rows]


# ============================================================
# GET ALL RESERVATIONS (ADMIN)
# ============================================================
def get_all_reservations(status_filter=None):
    """Get all reservations (for admin). Optionally filter by status."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    if status_filter:
        rows = c.execute("""
            SELECT r.reservation_id, r.member_id, r.book_id,
                   r.pickup_date, r.pickup_time, r.notes, r.status,
                   r.created_at, r.completed_at,
                   m.first_name || ' ' || m.last_name AS member_name,
                   m.email AS member_email,
                   m.contact_number AS member_contact,
                   m.member_type,
                   b.title AS book_title,
                   b.isbn AS book_isbn
            FROM reservations r
            JOIN members m ON r.member_id = m.member_id
            JOIN books b ON r.book_id = b.book_id
            WHERE r.status = ?
            ORDER BY r.pickup_date ASC, r.pickup_time ASC
        """, (status_filter,)).fetchall()
    else:
        rows = c.execute("""
            SELECT r.reservation_id, r.member_id, r.book_id,
                   r.pickup_date, r.pickup_time, r.notes, r.status,
                   r.created_at, r.completed_at,
                   m.first_name || ' ' || m.last_name AS member_name,
                   m.email AS member_email,
                   m.contact_number AS member_contact,
                   m.member_type,
                   b.title AS book_title,
                   b.isbn AS book_isbn
            FROM reservations r
            JOIN members m ON r.member_id = m.member_id
            JOIN books b ON r.book_id = b.book_id
            ORDER BY r.pickup_date ASC, r.pickup_time ASC
        """).fetchall()

    conn.close()
    return [dict(row) for row in rows]


# ============================================================
# UPDATE RESERVATION STATUS
# ============================================================
def update_reservation_status(reservation_id, new_status):
    """
    Update reservation status.
    Valid statuses: Pending, Ready, Completed, Cancelled

    ⭐ Special behavior: When marking as 'Completed', automatically
    creates a borrow transaction for the member.
    """
    if new_status not in VALID_STATUSES:
        return False, f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    res = c.execute("""
        SELECT reservation_id, status, book_id, member_id
        FROM reservations WHERE reservation_id = ?
    """, (reservation_id,)).fetchone()

    if not res:
        conn.close()
        return False, "Reservation not found"

    # ⭐ SPECIAL CASE: When marking as Completed → create a borrow transaction
    if new_status == "Completed" and res["status"] != "Completed":
        # Check if book still has available copies
        book = c.execute("SELECT title, available_copies FROM books WHERE book_id = ?",
                        (res["book_id"],)).fetchone()

        if not book:
            conn.close()
            return False, "Book not found"

        if book["available_copies"] <= 0:
            conn.close()
            return False, "No available copies to complete this reservation"

        # Check member exists
        member = c.execute("SELECT first_name, last_name FROM members WHERE member_id = ?",
                          (res["member_id"],)).fetchone()

        if not member:
            conn.close()
            return False, "Member not found"

        # Create the borrow transaction
        today = datetime.now().date()
        due = today + timedelta(days=14)  # 14-day loan period

        c.execute("""
            INSERT INTO borrow_transactions
            (member_id, book_id, borrow_date, due_date, status)
            VALUES (?, ?, ?, ?, 'Borrowed')
        """, (res["member_id"], res["book_id"], today.isoformat(), due.isoformat()))

        # Decrease available copies
        c.execute("""
            UPDATE books SET available_copies = available_copies - 1
            WHERE book_id = ?
        """, (res["book_id"],))

        # Mark reservation as Completed
        c.execute("""
            UPDATE reservations
            SET status = 'Completed', completed_at = CURRENT_TIMESTAMP
            WHERE reservation_id = ?
        """, (reservation_id,))

        conn.commit()
        conn.close()

        return True, f"Book borrowed by {member['first_name']} {member['last_name']}! Due {due.strftime('%b %d, %Y')}"

    # Regular status update (Pending → Ready, Ready → Cancelled, etc.)
    if new_status == "Completed":
        c.execute("""
            UPDATE reservations
            SET status = ?, completed_at = CURRENT_TIMESTAMP
            WHERE reservation_id = ?
        """, (new_status, reservation_id))
    else:
        c.execute("""
            UPDATE reservations SET status = ?
            WHERE reservation_id = ?
        """, (new_status, reservation_id))

    conn.commit()
    conn.close()

    return True, f"Reservation {new_status.lower()}"


# ============================================================
# CANCEL RESERVATION (by member)
# ============================================================
def cancel_member_reservation(reservation_id, member_id):
    """Member cancels their own reservation."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    res = c.execute("""
        SELECT reservation_id, status, member_id
        FROM reservations WHERE reservation_id = ?
    """, (reservation_id,)).fetchone()

    if not res:
        conn.close()
        return False, "Reservation not found"

    if res["member_id"] != member_id:
        conn.close()
        return False, "You can only cancel your own reservations"

    if res["status"] == "Completed":
        conn.close()
        return False, "Cannot cancel a completed reservation"

    if res["status"] == "Cancelled":
        conn.close()
        return False, "Reservation is already cancelled"

    if res["status"] == "Ready":
        conn.close()
        return False, "Cannot cancel — book is ready for pickup. Please contact the librarian."

    c.execute("""
        UPDATE reservations SET status = 'Cancelled'
        WHERE reservation_id = ?
    """, (reservation_id,))

    conn.commit()
    conn.close()
    return True, "Reservation cancelled"


# ============================================================
# GET RESERVATION STATS
# ============================================================
def get_reservation_stats():
    """Get stats for admin dashboard."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    stats = {
        "pending": c.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Pending'").fetchone()[0],
        "ready": c.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Ready'").fetchone()[0],
        "completed": c.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Completed'").fetchone()[0],
        "cancelled": c.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Cancelled'").fetchone()[0],
    }

    conn.close()
    return stats


# ============================================================
# TEST MODE
# ============================================================
if __name__ == "__main__":
    print("\n🔧 RESERVATION SERVICE TEST\n")
    print("=" * 60)

    # Check database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
    else:
        print(f"✅ Database found")

        # Get stats
        stats = get_reservation_stats()
        print(f"\n📊 Current reservation stats:")
        print(f"   Pending:   {stats['pending']}")
        print(f"   Ready:     {stats['ready']}")
        print(f"   Completed: {stats['completed']}")
        print(f"   Cancelled: {stats['cancelled']}")

    print("\n" + "=" * 60)
    print("✅ Reservation service test complete!")
    print("=" * 60 + "\n")