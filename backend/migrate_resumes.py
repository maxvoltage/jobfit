"""
Migration script to add created_at and updated_at columns to resumes table
"""
import sqlite3
from datetime import datetime, UTC
from pathlib import Path

# Connect to the database (one level up from backend/)
db_path = Path(__file__).parent.parent / 'jobfit.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(resumes)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'created_at' not in columns:
        print("Adding created_at column...")
        # SQLite doesn't support CURRENT_TIMESTAMP in ALTER TABLE, so add without default
        cursor.execute("ALTER TABLE resumes ADD COLUMN created_at TIMESTAMP")
        # Then update all existing rows
        cursor.execute("UPDATE resumes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
        print("✓ created_at column added")
    else:
        print("✓ created_at column already exists")
    
    if 'updated_at' not in columns:
        print("Adding updated_at column...")
        cursor.execute("ALTER TABLE resumes ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        print("✓ updated_at column added")
    else:
        print("✓ updated_at column already exists")
    
    # Ensure all existing rows have timestamps
    cursor.execute("""
        UPDATE resumes 
        SET created_at = CURRENT_TIMESTAMP 
        WHERE created_at IS NULL
    """)
    
    cursor.execute("""
        UPDATE resumes 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE updated_at IS NULL
    """)
    
    conn.commit()
    print("\n✅ Migration completed successfully!")
    
    # Show resume count
    cursor.execute("SELECT COUNT(*) FROM resumes")
    count = cursor.fetchone()[0]
    print(f"Total resumes in database: {count}")
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()
