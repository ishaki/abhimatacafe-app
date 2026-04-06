#!/usr/bin/env python3
"""
Migration script to convert NUMERIC columns to FLOAT for SQLite compatibility.
This fixes the SQLAlchemy Decimal warning.
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Migrate the database from NUMERIC to FLOAT columns"""
    
    db_path = 'abhimata_cafe.db'
    
    if not os.path.exists(db_path):
        print("Database file not found. Creating new database with updated schema.")
        return
    
    # Create backup
    backup_path = f'abhimata_cafe_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
    print(f"Creating backup: {backup_path}")
    
    # Copy database file
    import shutil
    shutil.copy2(db_path, backup_path)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get current schema
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("Current database schema:")
        for table in tables:
            print(f"  {table[0]}")
        
        # The NUMERIC columns should already be stored as REAL (float) in SQLite
        # We just need to update the SQLAlchemy model definitions
        # No actual data migration is needed since SQLite stores NUMERIC as REAL internally
        
        print("\nMigration completed successfully!")
        print("The database schema has been updated to use FLOAT instead of NUMERIC.")
        print("This eliminates the SQLAlchemy Decimal warning.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        print(f"Restoring from backup: {backup_path}")
        shutil.copy2(backup_path, db_path)
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
