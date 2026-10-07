import bcrypt
from database import get_connection


def setup_admin():
    username = "admin"
    password = "admin123"  # Change this later!
    
    # Hash the password
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    conn = get_connection()
    c = conn.cursor()
    
    # Delete old admin, insert new
    c.execute("DELETE FROM users WHERE username = ?", (username,))
    c.execute("""
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    """, (username, password_hash, "admin"))
    
    conn.commit()
    conn.close()
    
    print("=" * 50)
    print("  ADMIN USER CREATED")
    print("=" * 50)
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print("=" * 50)
    print("  Change the password in production!")
    print("=" * 50)


if __name__ == "__main__":
    setup_admin()