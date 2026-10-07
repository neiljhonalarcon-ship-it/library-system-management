import sqlite3
import os

# Get the database path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")

# Make sure the database folder exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    c = conn.cursor()

    # Users table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'librarian',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Authors table
    c.execute("""
        CREATE TABLE IF NOT EXISTS authors (
            author_id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            nationality TEXT
        )
    """)

    # Books table
    c.execute("""
        CREATE TABLE IF NOT EXISTS books (
            book_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author_id INTEGER,
            isbn TEXT UNIQUE,
            genre TEXT,
            publication_year INTEGER,
            publisher TEXT,
            total_copies INTEGER DEFAULT 1,
            available_copies INTEGER DEFAULT 1,
            location TEXT,
            FOREIGN KEY (author_id) REFERENCES authors(author_id)
        )
    """)

    # Members table
    c.execute("""
        CREATE TABLE IF NOT EXISTS members (
            member_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            contact_number TEXT,
            email TEXT UNIQUE,
            member_type TEXT NOT NULL DEFAULT 'Student',
            date_registered TEXT DEFAULT CURRENT_DATE,
            total_fines REAL DEFAULT 0.0
        )
    """)

    # Borrow transactions table
    c.execute("""
        CREATE TABLE IF NOT EXISTS borrow_transactions (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            borrow_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT DEFAULT 'Borrowed',
            fine_amount REAL DEFAULT 0.0,
            FOREIGN KEY (member_id) REFERENCES members(member_id),
            FOREIGN KEY (book_id) REFERENCES books(book_id)
        )
    """)

    # Fines table
    c.execute("""
        CREATE TABLE IF NOT EXISTS fines (
            fine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            fine_per_day REAL NOT NULL,
            overdue_days INTEGER NOT NULL,
            date_incurred TEXT DEFAULT CURRENT_DATE,
            date_paid TEXT,
            status TEXT DEFAULT 'Unpaid',
            FOREIGN KEY (transaction_id) REFERENCES borrow_transactions(transaction_id)
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


def seed_data():
    """Add sample data if database is empty."""
    conn = get_connection()
    c = conn.cursor()

    # Only seed if no books exist
    count = c.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    if count > 0:
        conn.close()
        return

    # Sample authors
    authors = [
        ("J.K. Rowling", "British"),
        ("J.R.R. Tolkien", "British"),
        ("George R.R. Martin", "American"),
        ("Agatha Christie", "British"),
        ("Stephen King", "American"),
    ]
    for name, nat in authors:
        c.execute("INSERT INTO authors (author_name, nationality) VALUES (?, ?)", (name, nat))

    # Sample books
    books = [
        ("Harry Potter and the Sorcerer's Stone", 1, "9780439708180", "Fantasy", 1997, "Scholastic", 5, 5, "A-101"),
        ("The Hobbit", 2, "9780547928227", "Fantasy", 1937, "Houghton Mifflin", 3, 3, "A-102"),
        ("A Game of Thrones", 3, "9780553593716", "Fantasy", 1996, "Bantam Books", 4, 4, "A-103"),
        ("Murder on the Orient Express", 4, "9780062693662", "Mystery", 1934, "HarperCollins", 2, 2, "B-201"),
        ("The Shining", 5, "9780307743657", "Horror", 1977, "Anchor Books", 3, 3, "B-202"),
    ]
    for b in books:
        c.execute("""
            INSERT INTO books (title, author_id, isbn, genre, publication_year, publisher, total_copies, available_copies, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, b)

    # Sample members
    members = [
        ("Juan", "Dela Cruz", "09171234567", "juan@student.edu", "Student"),
        ("Maria", "Santos", "09172345678", "maria@student.edu", "Student"),
        ("Jose", "Rizal", "09173456789", "jose@faculty.edu", "Faculty"),
        ("Andres", "Bonifacio", "09174567890", "andres@community.com", "Community"),
    ]
    for m in members:
        c.execute("""
            INSERT INTO members (first_name, last_name, contact_number, email, member_type)
            VALUES (?, ?, ?, ?, ?)
        """, m)

    # Default admin user (password will be hashed by setup script)
    c.execute("""
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    """, ("admin", "PLACEHOLDER", "admin"))

    conn.commit()
    conn.close()
    print("Sample data added.")


if __name__ == "__main__":
    init_db()
    seed_data()
    print("Setup complete!")