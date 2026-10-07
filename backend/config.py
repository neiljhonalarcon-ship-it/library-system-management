import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Secret key for sessions (change this in production!)
    SECRET_KEY = "your-secret-key-change-me-later"
    
    # Database location
    DATABASE_PATH = os.path.join(BASE_DIR, "..", "database", "library.db")
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Borrow settings
    BORROW_DAYS = 14        # How many days members can keep a book
    MAX_BORROW_LIMIT = 5    # Max books a member can borrow at once
    
    # Fine rates per day (in pesos)
    FINE_RATES = {
        "Student": 5.0,
        "Faculty": 10.0,
        "Community": 7.0,
    }