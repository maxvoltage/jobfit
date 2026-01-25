"""
Migration script to add is_selected column and copy from is_master
"""
import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path(__file__).parent.parent / 'jobfit.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if column already exists
    cursor.execute("PRAGMA table_info(resumes)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'is_selected' not in columns:
        print("Adding is_selected column...")
        cursor.execute("ALTER TABLE resumes ADD COLUMN is_selected BOOLEAN DEFAULT 0")
        
        # Copy data from is_master to is_selected
        cursor.execute("UPDATE resumes SET is_selected = is_master")
        
        conn.commit()
        print("✓ is_selected column added and data copied from is_master")
    else:
        print("✓ is_selected column already exists")
    
    # Show current state
    cursor.execute("SELECT COUNT(*) FROM resumes WHERE is_selected = 1")
    selected_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM resumes")
    total_count = cursor.fetchone()[0]
    
    print(f"\n✅ Migration completed!")
    print(f"Total resumes: {total_count}")
    print(f"Selected resume: {selected_count}")
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()
