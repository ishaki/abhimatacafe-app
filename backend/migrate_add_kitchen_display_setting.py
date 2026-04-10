"""Migration script to add kitchen_display_enabled setting.

Run this script to add the kitchen_display_enabled column to the settings table.

Usage:
    python migrate_add_kitchen_display_setting.py
"""
import sqlite3
import os
import sys


def get_db_path():
    db_path = os.environ.get('DATABASE_PATH', 'abhimata_cafe.db')
    if not os.path.exists(db_path):
        candidates = [
            'abhimata_cafe.db',
            'instance/abhimata_cafe.db',
            '../instance/abhimata_cafe.db',
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                db_path = candidate
                break
    return db_path


def migrate(db_path):
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        print("Run the app first to create the database, then run this migration.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Migrating database: {db_path}")

    # Check if column already exists
    cursor.execute("PRAGMA table_info(settings)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'kitchen_display_enabled' not in columns:
        print("Adding kitchen_display_enabled column to settings table...")
        cursor.execute("ALTER TABLE settings ADD COLUMN kitchen_display_enabled BOOLEAN DEFAULT 1")
        conn.commit()
        print("Done!")
    else:
        print("Column kitchen_display_enabled already exists. Skipping.")

    conn.close()


if __name__ == '__main__':
    db_path = get_db_path()
    migrate(db_path)
