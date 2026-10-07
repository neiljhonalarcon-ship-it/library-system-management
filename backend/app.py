from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from datetime import date, timedelta
import bcrypt
import os
from database import get_connection, init_db, seed_data
from config import Config


# ============================================================
# SETUP FLASK APP
# ============================================================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(
    __name__,
    template_folder=FRONTEND_DIR,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

# Make sure DB is set up
init_db()
#seed_data()


# ============================================================
# HELPER: Require login
# ============================================================
def login_required(f):
    """Decorator to protect routes."""
    from functools import wraps

    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return wrapper


# ============================================================
# PAGE ROUTES (serve HTML)
# ============================================================
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "home.html")


@app.route("/dashboard")
@login_required
def dashboard_page():
    return send_from_directory(FRONTEND_DIR, "dashboard.html")


@app.route("/books")
@login_required
def books_page():
    return send_from_directory(FRONTEND_DIR, "books.html")


@app.route("/members")
@login_required
def members_page():
    return send_from_directory(FRONTEND_DIR, "members.html")


@app.route("/borrow")
@login_required
def borrow_page():
    return send_from_directory(FRONTEND_DIR, "borrow.html")


@app.route("/fines")
@login_required
def fines_page():
    return send_from_directory(FRONTEND_DIR, "fines.html")


@app.route("/reports")
@login_required
def reports_page():
    return send_from_directory(FRONTEND_DIR, "reports.html")


# ============================================================
# API: AUTH
# ============================================================
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Please fill in both fields"}), 400

    conn = get_connection()
    c = conn.cursor()
    user = c.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    session["role"] = user["role"]

    return jsonify({"success": True, "redirect": "/dashboard"})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/me")
@login_required
def api_me():
    return jsonify({
        "username": session.get("username"),
        "role": session.get("role"),
    })


# ============================================================
# API: DASHBOARD STATS
# ============================================================
@app.route("/api/dashboard")
@login_required
def api_dashboard():
    conn = get_connection()
    c = conn.cursor()

    stats = {
        "total_books": c.execute("SELECT COUNT(*) FROM books").fetchone()[0],
        "total_copies": c.execute("SELECT COALESCE(SUM(total_copies), 0) FROM books").fetchone()[0],
                "total_members": c.execute("SELECT COUNT(*) FROM members WHERE approval_status = 'Approved'").fetchone()[0],
        "borrowed": c.execute(
            "SELECT COUNT(*) FROM borrow_transactions WHERE status IN ('Borrowed', 'Overdue')"
        ).fetchone()[0],
        "overdue": c.execute(
            "SELECT COUNT(*) FROM borrow_transactions WHERE status = 'Overdue'"
        ).fetchone()[0],
        "unpaid_fines": c.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM fines WHERE status = 'Unpaid'"
        ).fetchone()[0],
    }

    conn.close()
    return jsonify(stats)


# ============================================================
# API: BOOKS
# ============================================================
@app.route("/api/books", methods=["GET"])
@login_required
def api_books_list():
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT b.book_id, b.title, b.isbn, b.genre, b.publication_year,
               b.publisher, b.total_copies, b.available_copies, b.location,
               a.author_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        ORDER BY b.title
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/books", methods=["POST"])
@login_required
def api_books_add():
    data = request.get_json()
    author_name = (data.get("author_name") or "").strip()
    author_id = None

    conn = get_connection()
    c = conn.cursor()

    if author_name:
        existing = c.execute("SELECT author_id FROM authors WHERE author_name = ?",
                              (author_name,)).fetchone()
        if existing:
            author_id = existing["author_id"]
        else:
            cursor = c.execute("INSERT INTO authors (author_name) VALUES (?)",
                                (author_name,))
            author_id = cursor.lastrowid

    total = int(data.get("total_copies", 1))

    c.execute("""
        INSERT INTO books (title, author_id, isbn, genre, publication_year,
                           publisher, total_copies, available_copies, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("title"),
        author_id,
        data.get("isbn"),
        data.get("genre"),
        data.get("publication_year"),
        data.get("publisher"),
        total,
        total,
        data.get("location"),
    ))
    conn.commit()
    book_id = c.lastrowid
    conn.close()

    return jsonify({"success": True, "book_id": book_id})


@app.route("/api/books/<int:book_id>", methods=["GET"])
@login_required
def api_books_get(book_id):
    conn = get_connection()
    c = conn.cursor()
    row = c.execute("""
        SELECT b.book_id, b.title, b.isbn, b.genre, b.publication_year,
               b.publisher, b.total_copies, b.available_copies, b.location,
               a.author_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        WHERE b.book_id = ?
    """, (book_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"success": False, "error": "Book not found"}), 404
    return jsonify(dict(row))


@app.route("/api/books/<int:book_id>", methods=["PUT"])
@login_required
def api_books_update(book_id):
    data = request.get_json()
    conn = get_connection()
    c = conn.cursor()

    book = c.execute("SELECT * FROM books WHERE book_id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"success": False, "error": "Book not found"}), 404

    borrowed = book["total_copies"] - book["available_copies"]
    new_total = int(data.get("total_copies", book["total_copies"]))
    new_available = max(0, new_total - borrowed)

    author_name = (data.get("author_name") or "").strip()
    author_id = book["author_id"]

    if author_name:
        existing = c.execute("SELECT author_id FROM authors WHERE author_name = ?",
                              (author_name,)).fetchone()
        if existing:
            author_id = existing["author_id"]
        else:
            cursor = c.execute("INSERT INTO authors (author_name) VALUES (?)",
                                (author_name,))
            author_id = cursor.lastrowid

    c.execute("""
        UPDATE books SET
            title = ?, author_id = ?, isbn = ?, genre = ?,
            publication_year = ?, publisher = ?, total_copies = ?,
            available_copies = ?, location = ?
        WHERE book_id = ?
    """, (
        data.get("title", book["title"]),
        author_id,
        data.get("isbn", book["isbn"]),
        data.get("genre", book["genre"]),
        data.get("publication_year", book["publication_year"]),
        data.get("publisher", book["publisher"]),
        new_total,
        new_available,
        data.get("location", book["location"]),
        book_id,
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/books/<int:book_id>", methods=["DELETE"])
@login_required
def api_books_delete(book_id):
    conn = get_connection()
    c = conn.cursor()

    active = c.execute("""
        SELECT COUNT(*) FROM borrow_transactions
        WHERE book_id = ? AND status IN ('Borrowed', 'Overdue')
    """, (book_id,)).fetchone()[0]

    if active > 0:
        conn.close()
        return jsonify({"success": False,
                        "error": "Cannot delete: book has active borrows"}), 400

    c.execute("DELETE FROM books WHERE book_id = ?", (book_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/books/search", methods=["GET"])
@login_required
def api_books_search():
    term = request.args.get("q", "").strip()
    if not term:
        return api_books_list()

    conn = get_connection()
    c = conn.cursor()
    like = f"%{term}%"
    rows = c.execute("""
        SELECT b.book_id, b.title, b.isbn, b.genre, b.publication_year,
               b.publisher, b.total_copies, b.available_copies, b.location,
               a.author_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        WHERE b.title LIKE ? OR b.isbn LIKE ? OR b.genre LIKE ?
              OR a.author_name LIKE ? OR b.publisher LIKE ?
        ORDER BY b.title
    """, (like, like, like, like, like)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ============================================================
# API: MEMBERS
# ============================================================
@app.route("/api/members", methods=["GET"])
@login_required
def api_members_list():
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT member_id, first_name, last_name, contact_number, email,
               member_type, date_registered, total_fines, grade_level
        FROM members
        WHERE approval_status = 'Approved'
        ORDER BY member_id ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/members", methods=["POST"])
@login_required
def api_members_add():
    data = request.get_json()
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO members (first_name, last_name, contact_number, email, member_type, grade_level)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data.get("first_name", "").strip(),
            data.get("last_name", "").strip(),
            data.get("contact_number", "").strip(),
            data.get("email", "").strip() or None,
            data.get("member_type", "Student"),
            data.get("grade_level", "").strip() or None,
        ))
        conn.commit()
        member_id = c.lastrowid
        conn.close()
        return jsonify({"success": True, "member_id": member_id})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/members/<int:member_id>", methods=["PUT"])
@login_required
def api_members_update(member_id):
    data = request.get_json()
    conn = get_connection()
    c = conn.cursor()

    member = c.execute("SELECT * FROM members WHERE member_id = ?", (member_id,)).fetchone()
    if not member:
        conn.close()
        return jsonify({"success": False, "error": "Member not found"}), 404

    try:
        c.execute("""
            UPDATE members SET
                first_name = ?, last_name = ?, contact_number = ?,
                email = ?, member_type = ?, grade_level = ?
            WHERE member_id = ?
        """, (
            data.get("first_name", member["first_name"]).strip(),
            data.get("last_name", member["last_name"]).strip(),
            data.get("contact_number", member["contact_number"]).strip(),
            data.get("email", member["email"]).strip() if data.get("email") else None,
            data.get("member_type", member["member_type"]),
            data.get("grade_level", member["grade_level"]) if data.get("grade_level") else None,
            member_id,
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/members/<int:member_id>", methods=["DELETE"])
@login_required
def api_members_delete(member_id):
    conn = get_connection()
    c = conn.cursor()

    active = c.execute("""
        SELECT COUNT(*) FROM borrow_transactions
        WHERE member_id = ? AND status IN ('Borrowed', 'Overdue')
    """, (member_id,)).fetchone()[0]

    if active > 0:
        conn.close()
        return jsonify({"success": False,
                        "error": "Cannot delete: member has active borrows"}), 400

    fines = c.execute("SELECT total_fines FROM members WHERE member_id = ?", (member_id,)).fetchone()
    if fines and fines["total_fines"] > 0:
        conn.close()
        return jsonify({"success": False,
                        "error": "Cannot delete: member has unpaid fines"}), 400

    c.execute("DELETE FROM members WHERE member_id = ?", (member_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/members/search", methods=["GET"])
@login_required
def api_members_search():
    term = request.args.get("q", "").strip()
    if not term:
        return api_members_list()

    conn = get_connection()
    c = conn.cursor()
    like = f"%{term}%"
    rows = c.execute("""
        SELECT member_id, first_name, last_name, contact_number, email,
               member_type, date_registered, total_fines
        FROM members
        WHERE approval_status = 'Approved'
          AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
               OR contact_number LIKE ? OR member_type LIKE ?)
        ORDER BY member_id ASC
    """, (like, like, like, like, like)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ============================================================
# API: BORROW / RETURN
# ============================================================
@app.route("/api/transactions", methods=["GET"])
@login_required
def api_transactions_list():
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT bt.transaction_id, bt.member_id, bt.book_id,
               bt.borrow_date, bt.due_date, bt.return_date,
               bt.status, bt.fine_amount,
               m.first_name || ' ' || m.last_name AS member_name,
               m.member_type,
               b.title AS book_title,
               b.isbn AS book_isbn
        FROM borrow_transactions bt
        JOIN members m ON bt.member_id = m.member_id
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.status IN ('Borrowed', 'Overdue')
        ORDER BY bt.due_date ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/transactions/history", methods=["GET"])
@login_required
def api_transactions_history():
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT bt.transaction_id, bt.member_id, bt.book_id,
               bt.borrow_date, bt.due_date, bt.return_date,
               bt.status, bt.fine_amount,
               m.first_name || ' ' || m.last_name AS member_name,
               b.title AS book_title
        FROM borrow_transactions bt
        JOIN members m ON bt.member_id = m.member_id
        JOIN books b ON bt.book_id = b.book_id
        ORDER BY bt.borrow_date DESC, bt.transaction_id DESC
        LIMIT 100
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/borrow", methods=["POST"])
@login_required
def api_borrow_book():
    data = request.get_json()
    member_id = data.get("member_id")
    book_id = data.get("book_id")

    if not member_id or not book_id:
        return jsonify({"success": False, "error": "Member ID and Book ID required"}), 400

    conn = get_connection()
    c = conn.cursor()

    member = c.execute("SELECT * FROM members WHERE member_id = ?", (member_id,)).fetchone()
    if not member:
        conn.close()
        return jsonify({"success": False, "error": "Member not found"}), 404

    book = c.execute("SELECT * FROM books WHERE book_id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"success": False, "error": "Book not found"}), 404

    if book["available_copies"] <= 0:
        conn.close()
        return jsonify({"success": False, "error": "No available copies"}), 400

    active = c.execute("""
        SELECT COUNT(*) FROM borrow_transactions
        WHERE member_id = ? AND status IN ('Borrowed', 'Overdue')
    """, (member_id,)).fetchone()[0]

    if active >= 5:
        conn.close()
        return jsonify({"success": False,
                        "error": "Member has reached the 5-book limit"}), 400

    already = c.execute("""
        SELECT COUNT(*) FROM borrow_transactions
        WHERE member_id = ? AND book_id = ? AND status IN ('Borrowed', 'Overdue')
    """, (member_id, book_id)).fetchone()[0]

    if already > 0:
        conn.close()
        return jsonify({"success": False,
                        "error": "Member already has this book"}), 400

    today = date.today()
    due = today + timedelta(days=14)

    cursor = c.execute("""
        INSERT INTO borrow_transactions (member_id, book_id, borrow_date, due_date, status)
        VALUES (?, ?, ?, ?, 'Borrowed')
    """, (member_id, book_id, today.isoformat(), due.isoformat()))

    c.execute("UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?",
              (book_id,))

    conn.commit()
    transaction_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "success": True,
        "transaction_id": transaction_id,
        "due_date": due.isoformat(),
        "member_name": f"{member['first_name']} {member['last_name']}",
        "book_title": book["title"]
    })


@app.route("/api/return/<int:transaction_id>", methods=["POST"])
@login_required
def api_return_book(transaction_id):
    conn = get_connection()
    c = conn.cursor()

    tx = c.execute("""
        SELECT bt.*, m.first_name, m.last_name, m.member_type,
               b.title AS book_title
        FROM borrow_transactions bt
        JOIN members m ON bt.member_id = m.member_id
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.transaction_id = ?
    """, (transaction_id,)).fetchone()

    if not tx:
        conn.close()
        return jsonify({"success": False, "error": "Transaction not found"}), 404

    if tx["status"] == "Returned":
        conn.close()
        return jsonify({"success": False, "error": "Book already returned"}), 400

    today = date.today()
    due_date = date.fromisoformat(tx["due_date"])
    overdue_days = (today - due_date).days

    fine = 0.0
    fine_rate = 0.0
    if overdue_days > 0:
        rates = {"Student": 5.0, "Faculty": 10.0, "Community": 7.0}
        fine_rate = rates.get(tx["member_type"], 5.0)
        fine = overdue_days * fine_rate

    c.execute("""
        UPDATE borrow_transactions
        SET return_date = ?, status = 'Returned', fine_amount = ?
        WHERE transaction_id = ?
    """, (today.isoformat(), fine, transaction_id))

    c.execute("UPDATE books SET available_copies = available_copies + 1 WHERE book_id = ?",
              (tx["book_id"],))

    if fine > 0:
        c.execute("""
            INSERT INTO fines (transaction_id, amount, fine_per_day, overdue_days, date_incurred, status)
            VALUES (?, ?, ?, ?, ?, 'Unpaid')
        """, (transaction_id, fine, fine_rate, overdue_days, today.isoformat()))

        c.execute("UPDATE members SET total_fines = total_fines + ? WHERE member_id = ?",
                  (fine, tx["member_id"]))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "member_name": f"{tx['first_name']} {tx['last_name']}",
        "book_title": tx["book_title"],
        "overdue_days": overdue_days,
        "fine": fine,
        "fine_rate": fine_rate
    })


# ============================================================
# API: FINES
# ============================================================
@app.route("/api/fines", methods=["GET"])
@login_required
def api_fines_list():
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT f.fine_id, f.transaction_id, f.amount, f.fine_per_day,
               f.overdue_days, f.date_incurred, f.status,
               m.member_id,
               m.first_name || ' ' || m.last_name AS member_name,
               m.member_type,
               b.title AS book_title,
               bt.borrow_date, bt.due_date, bt.return_date
        FROM fines f
        JOIN borrow_transactions bt ON f.transaction_id = bt.transaction_id
        JOIN members m ON bt.member_id = m.member_id
        JOIN books b ON bt.book_id = b.book_id
        WHERE f.status = 'Unpaid'
        ORDER BY f.date_incurred DESC, f.fine_id DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/fines/stats", methods=["GET"])
@login_required
def api_fines_stats():
    conn = get_connection()
    c = conn.cursor()

    unpaid = c.execute("""
        SELECT COUNT(*), COALESCE(SUM(amount), 0)
        FROM fines WHERE status = 'Unpaid'
    """).fetchone()

    paid = c.execute("""
        SELECT COUNT(*), COALESCE(SUM(amount), 0)
        FROM fines WHERE status = 'Paid'
    """).fetchone()

    conn.close()
    return jsonify({
        "unpaid_count": unpaid[0],
        "unpaid_amount": unpaid[1],
        "paid_count": paid[0],
        "paid_amount": paid[1]
    })


@app.route("/api/fines/<int:fine_id>/pay", methods=["POST"])
@login_required
def api_fine_pay(fine_id):
    conn = get_connection()
    c = conn.cursor()

    fine = c.execute("""
        SELECT f.*, bt.member_id, m.first_name, m.last_name
        FROM fines f
        JOIN borrow_transactions bt ON f.transaction_id = bt.transaction_id
        JOIN members m ON bt.member_id = m.member_id
        WHERE f.fine_id = ?
    """, (fine_id,)).fetchone()

    if not fine:
        conn.close()
        return jsonify({"success": False, "error": "Fine not found"}), 404

    if fine["status"] == "Paid":
        conn.close()
        return jsonify({"success": False, "error": "Fine already paid"}), 400

    today = date.today().isoformat()

    c.execute("""
        UPDATE fines SET status = 'Paid', date_paid = ?
        WHERE fine_id = ?
    """, (today, fine_id))

    c.execute("""
        UPDATE members SET total_fines = MAX(0, total_fines - ?)
        WHERE member_id = ?
    """, (fine["amount"], fine["member_id"]))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "amount": fine["amount"],
        "member_name": f"{fine['first_name']} {fine['last_name']}"
    })


# ============================================================
# API: REPORTS
# ============================================================
@app.route("/api/reports/dashboard", methods=["GET"])
@login_required
def api_reports_dashboard():
    """Full dashboard report."""
    conn = get_connection()
    c = conn.cursor()

    total_books = c.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    total_copies = c.execute("SELECT COALESCE(SUM(total_copies), 0) FROM books").fetchone()[0]
    total_members = c.execute("SELECT COUNT(*) FROM members WHERE approval_status = 'Approved'").fetchone()[0]
    total_borrows = c.execute("SELECT COUNT(*) FROM borrow_transactions").fetchone()[0]
    active_borrows = c.execute(
        "SELECT COUNT(*) FROM borrow_transactions WHERE status IN ('Borrowed', 'Overdue')"
    ).fetchone()[0]
    overdue = c.execute(
        "SELECT COUNT(*) FROM borrow_transactions WHERE status = 'Overdue'"
    ).fetchone()[0]
    returned = c.execute(
        "SELECT COUNT(*) FROM borrow_transactions WHERE status = 'Returned'"
    ).fetchone()[0]

    unpaid_count = c.execute("SELECT COUNT(*) FROM fines WHERE status = 'Unpaid'").fetchone()[0]
    unpaid_amount = c.execute("SELECT COALESCE(SUM(amount), 0) FROM fines WHERE status = 'Unpaid'").fetchone()[0]
    paid_count = c.execute("SELECT COUNT(*) FROM fines WHERE status = 'Paid'").fetchone()[0]
    paid_amount = c.execute("SELECT COALESCE(SUM(amount), 0) FROM fines WHERE status = 'Paid'").fetchone()[0]

    conn.close()
    return jsonify({
        "books": {
            "titles": total_books,
            "copies": total_copies,
        },
        "members": {
            "total": total_members,
        },
        "borrows": {
            "total": total_borrows,
            "active": active_borrows,
            "overdue": overdue,
            "returned": returned,
        },
        "fines": {
            "unpaid_count": unpaid_count,
            "unpaid_amount": unpaid_amount,
            "paid_count": paid_count,
            "paid_amount": paid_amount,
            "total_collected": paid_amount,
        }
    })


@app.route("/api/reports/top-books", methods=["GET"])
@login_required
def api_reports_top_books():
    """Top 5 most borrowed books."""
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT b.book_id, b.title,
               a.author_name,
               b.genre,
               COUNT(bt.transaction_id) AS borrow_count
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        LEFT JOIN borrow_transactions bt ON b.book_id = bt.book_id
        GROUP BY b.book_id
        ORDER BY borrow_count DESC, b.title ASC
        LIMIT 5
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/reports/top-borrowers", methods=["GET"])
@login_required
def api_reports_top_borrowers():
    """Top 5 most active borrowers."""
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT m.member_id,
               m.first_name || ' ' || m.last_name AS member_name,
               m.member_type,
               COUNT(bt.transaction_id) AS borrow_count
        FROM members m
        LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id
        WHERE m.approval_status = 'Approved'
        GROUP BY m.member_id
        ORDER BY borrow_count DESC, m.last_name ASC
        LIMIT 5
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/reports/overdue", methods=["GET"])
@login_required
def api_reports_overdue():
    """Detailed overdue report."""
    conn = get_connection()
    c = conn.cursor()
    today = date.today()

    rows = c.execute("""
        SELECT bt.transaction_id,
               m.first_name || ' ' || m.last_name AS member_name,
               m.contact_number,
               m.email,
               m.member_type,
               b.title AS book_title,
               bt.borrow_date,
               bt.due_date
        FROM borrow_transactions bt
        JOIN members m ON bt.member_id = m.member_id
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.status IN ('Borrowed', 'Overdue') AND bt.due_date < ?
        ORDER BY bt.due_date ASC
    """, (today.isoformat(),)).fetchall()

    result = []
    for r in rows:
        due_date = date.fromisoformat(r["due_date"])
        days_late = (today - due_date).days
        item = dict(r)
        item["days_late"] = days_late
        result.append(item)

    conn.close()
    return jsonify(result)


@app.route("/api/reports/genre-stats", methods=["GET"])
@login_required
def api_reports_genre_stats():
    """Books by genre stats."""
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT genre, COUNT(*) AS count, COALESCE(SUM(total_copies), 0) AS copies
        FROM books
        WHERE genre IS NOT NULL AND genre != ''
        GROUP BY genre
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ============================================================
# API: MEMBER REGISTRATION & LOGIN (Multi-user system)
# ============================================================
from auth_service import (
    register_member,
    verify_registration,
    member_login,
    get_member_profile,
    get_pending_members,
    set_member_approval,
    resend_verification,
)
from reservation_service import (
    create_reservation,
    get_member_reservations,
    get_all_reservations,
    update_reservation_status,
    cancel_member_reservation,
    get_reservation_stats,
)


@app.route("/api/auth/register", methods=["POST"])
def api_register_member():
    """Register a new member (public)."""
    data = request.get_json()

    success, message, extra = register_member(
        first_name=data.get("first_name", "").strip(),
        last_name=data.get("last_name", "").strip(),
        email=data.get("email", "").strip().lower(),
        contact_number=data.get("contact_number", "").strip(),
        username=data.get("username", "").strip(),
        password=data.get("password", ""),
        member_type=data.get("member_type", "Student"),
        grade_level=data.get("grade_level", ""),
        section=data.get("section", "").strip() or None,
    )

    if success:
        return jsonify({"success": True, "message": message, **(extra or {})})
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/auth/verify", methods=["POST"])
def api_verify_code():
    """Verify registration code (public)."""
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()

    if not email or not code:
        return jsonify({"success": False, "error": "Email and code required"}), 400

    success, message, extra = verify_registration(email, code)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/auth/resend-verification", methods=["POST"])
def api_resend_verification():
    """Resend verification code (public)."""
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"success": False, "error": "Email required"}), 400

    success, message = resend_verification(email)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/auth/member-login", methods=["POST"])
def api_member_login():
    """Member login endpoint."""
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "error": "Please fill in both fields"}), 400

    success, message, member = member_login(username, password)
    if success:
        session["member_id"] = member["member_id"]
        session["member_name"] = f"{member['first_name']} {member['last_name']}"
        session["role"] = "member"
        return jsonify({
            "success": True,
            "message": message,
            "member": member,
            "redirect": "/member-portal",
        })
    return jsonify({"success": False, "error": message}), 401


@app.route("/api/member/me")
def api_member_me():
    """Get current logged-in member info."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    profile = get_member_profile(member_id)
    if not profile:
        return jsonify({"success": False, "error": "Member not found"}), 404

    return jsonify(profile)


@app.route("/api/member/my-borrows")
def api_member_my_borrows():
    """Get current member's active borrows."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT bt.transaction_id, b.title AS book_title, b.isbn,
               bt.borrow_date, bt.due_date, bt.status, bt.fine_amount
        FROM borrow_transactions bt
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.member_id = ? AND bt.status IN ('Borrowed', 'Overdue')
        ORDER BY bt.due_date ASC
    """, (member_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/member/my-history")
def api_member_my_history():
    """Get current member's full borrowing history."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT bt.transaction_id, b.title AS book_title,
               bt.borrow_date, bt.due_date, bt.return_date,
               bt.status, bt.fine_amount
        FROM borrow_transactions bt
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.member_id = ?
        ORDER BY bt.borrow_date DESC
    """, (member_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/member/my-fines")
def api_member_my_fines():
    """Get current member's unpaid fines."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT f.fine_id, f.amount, f.overdue_days, f.date_incurred, f.status,
               b.title AS book_title
        FROM fines f
        JOIN borrow_transactions bt ON f.transaction_id = bt.transaction_id
        JOIN books b ON bt.book_id = b.book_id
        WHERE bt.member_id = ? AND f.status = 'Unpaid'
        ORDER BY f.date_incurred DESC
    """, (member_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/member/available-books")
def api_member_available_books():
    """Get available books for members to browse."""
    conn = get_connection()
    c = conn.cursor()
    rows = c.execute("""
        SELECT b.book_id, b.title, b.isbn, b.genre, b.publication_year,
               b.publisher, b.available_copies, b.total_copies, b.location,
               a.author_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        WHERE b.available_copies > 0
        ORDER BY b.title
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ============================================================
# API: ADMIN APPROVAL
# ============================================================
@app.route("/api/admin/pending-members")
@login_required
def api_admin_pending_members():
    """Get pending member registrations (admin only)."""
    return jsonify(get_pending_members())


@app.route("/api/admin/approve-member/<int:member_id>", methods=["POST"])
@login_required
def api_admin_approve_member(member_id):
    """Approve a pending member."""
    data = request.get_json() or {}
    status = data.get("status", "Approved")

    success, message = set_member_approval(member_id, status)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "error": message}), 400


# ============================================================
# PAGE ROUTES FOR MEMBER PAGES
# ============================================================
@app.route("/member-login")
def member_login_page():
    return send_from_directory(FRONTEND_DIR, "member-login.html")


@app.route("/member-register")
def member_register_page():
    return send_from_directory(FRONTEND_DIR, "member-register.html")


@app.route("/member-portal")
def member_portal_page():
    """Member portal - requires member session."""
    if "member_id" not in session:
        return redirect("/member-login")
    return send_from_directory(FRONTEND_DIR, "member-portal.html")


@app.route("/admin-login")
def admin_login_page():
    return send_from_directory(FRONTEND_DIR, "admin-login.html")


@app.route("/admin/approvals")
@login_required
def admin_approvals_page():
    return send_from_directory(FRONTEND_DIR, "admin-approvals.html")



@app.route("/admin/reservations")
@login_required
def admin_reservations_page():
    return send_from_directory(FRONTEND_DIR, "admin-reservations.html")


@app.route("/api/auth/member-logout", methods=["POST"])
def api_member_logout():
    """Log out a member."""
    session.clear()
    return jsonify({"success": True})



# ============================================================
# API: RESERVATIONS (Member)
# ============================================================
@app.route("/api/reservations", methods=["POST"])
def api_create_reservation():
    """Member creates a new reservation (requires member session)."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    data = request.get_json()

    success, message, reservation_id = create_reservation(
        member_id=member_id,
        book_id=data.get("book_id"),
        pickup_date=data.get("pickup_date", "").strip(),
        pickup_time=data.get("pickup_time", "").strip(),
        notes=data.get("notes", "").strip() or None,
    )

    if success:
        return jsonify({
            "success": True,
            "message": message,
            "reservation_id": reservation_id,
        })
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/member/my-reservations")
def api_member_my_reservations():
    """Get current member's reservations."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    return jsonify(get_member_reservations(member_id))


@app.route("/api/member/cancel-reservation/<int:reservation_id>", methods=["POST"])
def api_member_cancel_reservation(reservation_id):
    """Member cancels their own reservation."""
    member_id = session.get("member_id")
    if not member_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    success, message = cancel_member_reservation(reservation_id, member_id)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "error": message}), 400


# ============================================================
# API: RESERVATIONS (Admin)
# ============================================================
@app.route("/api/admin/reservations")
@login_required
def api_admin_reservations():
    """Get all reservations (admin only). Optional ?status= filter."""
    status_filter = request.args.get("status", "").strip() or None
    return jsonify(get_all_reservations(status_filter))


@app.route("/api/admin/reservation/<int:reservation_id>/status", methods=["POST"])
@login_required
def api_admin_update_reservation_status(reservation_id):
    """Update reservation status (admin only)."""
    data = request.get_json() or {}
    new_status = data.get("status", "").strip()

    if not new_status:
        return jsonify({"success": False, "error": "Status required"}), 400

    success, message = update_reservation_status(reservation_id, new_status)
    if success:
        return jsonify({"success": True, "message": message})
    return jsonify({"success": False, "error": message}), 400


@app.route("/api/admin/reservation-stats")
@login_required
def api_admin_reservation_stats():
    """Get reservation stats (admin only)."""
    return jsonify(get_reservation_stats())


# ============================================================
# RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  LIBRARY MANAGEMENT SYSTEM")
    print("=" * 60)
    print("  Server: http://localhost:5000")
    print("  Login:  admin / admin123")
    print("=" * 60)
    app.run(debug=True, port=5000)