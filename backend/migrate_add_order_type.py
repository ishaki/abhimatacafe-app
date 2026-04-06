#!/usr/bin/env python3
"""
Database migration script to add order_type column to existing orders
"""

import sqlite3
import os

def migrate_database():
    """Add order_type column to existing orders table"""
    
    # Database file path
    db_path = os.path.join(os.path.dirname(__file__), 'abhimata_cafe.db')
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        print("Please run init_db.py first to create the database")
        return
    
    print(f"Migrating database at {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if order_type column already exists
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'order_type' in columns:
            print("order_type column already exists. Migration not needed.")
            return
        
        # Add order_type column with default value 'dine_in'
        print("Adding order_type column to orders table...")
        cursor.execute("ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'dine_in'")
        
        # Update existing orders to have 'dine_in' as default
        print("Updating existing orders to have 'dine_in' order type...")
        cursor.execute("UPDATE orders SET order_type = 'dine_in' WHERE order_type IS NULL")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        print("All existing orders have been set to 'dine_in' order type")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
