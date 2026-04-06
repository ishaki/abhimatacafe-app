#!/usr/bin/env python3
"""
Database initialization script for Abhimata Cafe Management System
"""

import sqlite3
import os
import stat
from werkzeug.security import generate_password_hash

def init_database():
    """Initialize the database with schema and sample data"""
    
    # Database file path
    db_path = 'abhimata_cafe.db'
    
    # Remove existing database if it exists
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Removed existing database")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Read and execute schema
    with open('../database/schema.sql', 'r', encoding='utf-8') as f:
        schema = f.read()
    
    # Split by semicolon and execute each statement
    statements = schema.split(';')
    for statement in statements:
        statement = statement.strip()
        if statement:
            cursor.execute(statement)
    
    print("Database schema created successfully")
    
    # Add additional sample data
    sample_menu_items = [
        ('Nasi Gudeg', 'Food', 'Nasi gudeg khas Yogyakarta dengan ayam dan telur', 30000, 5),
        ('Gado-gado', 'Food', 'Salad sayuran dengan bumbu kacang', 25000, 4),
        ('Soto Ayam', 'Food', 'Soto ayam dengan nasi dan kerupuk', 28000, 5),
        ('Es Campur', 'Drinks', 'Es campur dengan berbagai topping', 15000, 4),
        ('Jus Alpukat', 'Drinks', 'Jus alpukat segar dengan susu', 18000, 5),
        ('Kopi Tubruk', 'Drinks', 'Kopi tubruk tradisional', 10000, 4),
        ('Klepon', 'Desserts', 'Klepon dengan kelapa parut', 12000, 4),
        ('Dadar Gulung', 'Desserts', 'Dadar gulung dengan kelapa', 15000, 5),
    ]
    
    for item in sample_menu_items:
        cursor.execute("""
            INSERT INTO menu_items (name, category, description, price, rating)
            VALUES (?, ?, ?, ?, ?)
        """, item)
    
    print("Sample menu items added")
    
    # Add sample users
    sample_users = [
        ('admin', 'Admin@2024!Secure', 'admin'),
        ('wt1', 'Wait@2024!Secure', 'waitress'),
        ('ki1', 'Kitchen@2024!Secure', 'kitchen'),
        ('ca1', 'Cashier@2024!Secure', 'cashier'),
    ]
    
    for username, password, role in sample_users:
        password_hash = generate_password_hash(password)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role)
            VALUES (?, ?, ?)
        """, (username, password_hash, role))
    
    print("Sample users added")
    
    # Commit and close
    conn.commit()
    conn.close()
    
    # Set restrictive permissions on database file
    os.chmod(db_path, stat.S_IRUSR | stat.S_IWUSR)  # Owner read/write only
    print("Database permissions secured (owner read/write only)")
    
    print(f"Database initialized successfully at {db_path}")
    print("\nDefault login credentials (CHANGE IMMEDIATELY):")
    print("Admin: admin / Admin@2024!Secure")
    print("Waitress: wt1 / Wait@2024!Secure")
    print("Kitchen: ki1 / Kitchen@2024!Secure")
    print("Cashier: ca1 / Cashier@2024!Secure")
    print("\n*** IMPORTANT: Change these passwords after first login ***")

if __name__ == '__main__':
    init_database()
