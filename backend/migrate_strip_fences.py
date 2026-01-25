"""
Migration script to strip markdown code fences from existing resume content
"""

import sqlite3
from pathlib import Path

# Connect to the database
db_path = Path(__file__).parent.parent / "jobfit.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()


def strip_markdown_fences(content):
    """Remove ```markdown and ``` wrappers from content"""
    if not content:
        return content

    content = content.strip()
    if content.startswith("```markdown") or content.startswith("```"):
        lines = content.split("\n")
        # Remove first line if it's a code fence
        if lines[0].startswith("```"):
            lines.pop(0)
        # Remove last line if it's a closing fence
        if lines and lines[-1].strip() == "```":
            lines.pop()
        return "\n".join(lines)
    return content


try:
    # Get all resumes
    cursor.execute("SELECT id, name, content FROM resumes")
    resumes = cursor.fetchall()

    updated_count = 0
    for resume_id, name, content in resumes:
        cleaned_content = strip_markdown_fences(content)
        if cleaned_content != content:
            cursor.execute("UPDATE resumes SET content = ? WHERE id = ?", (cleaned_content, resume_id))
            updated_count += 1
            print(f"✓ Cleaned resume: {name}")

    conn.commit()
    print("\n✅ Migration completed!")
    print(f"Total resumes: {len(resumes)}")
    print(f"Updated: {updated_count}")
    print(f"Already clean: {len(resumes) - updated_count}")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()
