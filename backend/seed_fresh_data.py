"""
Seed Books Only
Adds clean book + author data for the demo.
Members, transactions, fines, and reservations are added manually later.
"""

import sqlite3
import os


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")


def seed():
    print("=" * 60)
    print("  SEED BOOKS ONLY")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # ----- Safety check -----
    existing_books = c.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    if existing_books > 0:
        print(f"\nBooks already exist ({existing_books}). Aborting to be safe.")
        print("Run clean_all_data.py first if you want a fresh seed.")
        conn.close()
        return

    # ============================================================
    # 1. AUTHORS
    # ============================================================
    print("\n[1/2] Adding authors...")
    authors = [
        ("Jose Rizal", "Filipino"),
        ("Francisco Balagtas", "Filipino"),
        ("Lualhati Bautista", "Filipino"),
        ("Amado V. Hernandez", "Filipino"),
        ("J.K. Rowling", "British"),
        ("Paulo Coelho", "Brazilian"),
        ("George Orwell", "British"),
        ("Harper Lee", "American"),
    ]
    for name, nat in authors:
        c.execute("INSERT INTO authors (author_name, nationality) VALUES (?, ?)", (name, nat))
    print(f"   Added {len(authors)} authors")

    # ============================================================
    # 2. BOOKS
    # ============================================================
    print("\n[2/2] Adding books...")
    books = [
        # (title, author_id, isbn, genre, year, publisher, copies, location)
        ("Noli Me Tangere", 1, "978-9712730003", "Historical Fiction", 1887, "Anvil Publishing", 5, "FIL-001"),
        ("El Filibusterismo", 1, "978-9712730010", "Historical Fiction", 1891, "Anvil Publishing", 4, "FIL-002"),
        ("Florante at Laura", 2, "978-9710812345", "Poetry", 1838, "Rex Book Store", 3, "FIL-003"),
        ("Dekada '70", 3, "978-9712723456", "Historical Fiction", 1983, "Cacho Publishing", 4, "FIL-004"),
        ("Mga Ibong Mandaragit", 4, "978-9710856789", "Social Novel", 1969, "Ateneo Press", 3, "FIL-005"),
        ("Harry Potter and the Sorcerer's Stone", 5, "978-0439708180", "Fantasy", 1997, "Scholastic", 5, "FIC-001"),
        ("The Alchemist", 6, "978-0061122415", "Fiction", 1988, "HarperOne", 4, "FIC-002"),
        ("1984", 7, "978-0451524935", "Dystopian", 1949, "Signet Classic", 3, "FIC-003"),
        ("To Kill a Mockingbird", 8, "978-0061120084", "Classic", 1960, "Harper Perennial", 3, "FIC-004"),
    ]
    for title, author_id, isbn, genre, year, pub, copies, loc in books:
        c.execute("""
            INSERT INTO books
                (title, author_id, isbn, genre, publication_year, publisher,
                 total_copies, available_copies, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (title, author_id, isbn, genre, year, pub, copies, copies, loc))
    print(f"   Added {len(books)} books")

    conn.commit()

    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "=" * 60)
    print("  DONE - FINAL COUNTS")
    print("=" * 60)

    book_count = c.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    author_count = c.execute("SELECT COUNT(*) FROM authors").fetchone()[0]
    member_count = c.execute("SELECT COUNT(*) FROM members").fetchone()[0]

    print(f"  Authors  : {author_count}")
    print(f"  Books    : {book_count}")
    print(f"  Members  : {member_count}  (you'll add these manually)")

    # Show the books
    print("\n  Books added:")
    for row in c.execute("SELECT book_id, title, genre FROM books ORDER BY book_id"):
        print(f"    #{row[0]}  {row[1]}  [{row[2]}]")

    conn.close()

    print("\n" + "=" * 60)
    print("  Ready for the demo. Login: admin / admin123")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    seed()