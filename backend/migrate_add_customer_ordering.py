"""Migration script to add customer self-ordering tables and fields.

Run this script to add the new columns and tables needed for the
customer self-ordering feature (QR code based ordering).

Usage:
    python migrate_add_customer_ordering.py
"""
import sqlite3
import os
import sys


def get_db_path():
    db_path = os.environ.get('DATABASE_PATH', 'instance/abhimata_cafe.db')
    if not os.path.exists(db_path):
        # Try common locations
        candidates = [
            'instance/abhimata_cafe.db',
            'abhimata_cafe.db',
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

    # Helper to check if column exists
    def column_exists(table, column):
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor.fetchall()]
        return column in columns

    # Helper to check if table exists
    def table_exists(table):
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        return cursor.fetchone() is not None

    # --- Order table: add new columns ---
    if not column_exists('orders', 'order_source'):
        cursor.execute("ALTER TABLE orders ADD COLUMN order_source VARCHAR(20) DEFAULT 'staff'")
        print("  Added orders.order_source")

    if not column_exists('orders', 'queue_number'):
        cursor.execute("ALTER TABLE orders ADD COLUMN queue_number INTEGER")
        print("  Added orders.queue_number")

    if not column_exists('orders', 'rejection_reason'):
        cursor.execute("ALTER TABLE orders ADD COLUMN rejection_reason VARCHAR(500)")
        print("  Added orders.rejection_reason")

    if not column_exists('orders', 'customer_session_id'):
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_session_id INTEGER REFERENCES customer_sessions(id)")
        print("  Added orders.customer_session_id")

    # --- OrderItem table: add item_status ---
    if not column_exists('order_items', 'item_status'):
        cursor.execute("ALTER TABLE order_items ADD COLUMN item_status VARCHAR(20) DEFAULT 'approved'")
        print("  Added order_items.item_status")

    # --- Make orders.table_number nullable (SQLite limitation: can't ALTER column, but new rows can have NULL) ---
    # Note: SQLite doesn't enforce NOT NULL on ALTER ADD, and existing columns can't be altered.
    # For new takeaway orders, table_number can be NULL. Existing data is unaffected.

    # --- Settings table: add customer ordering fields ---
    if not column_exists('settings', 'show_price_breakdown'):
        cursor.execute("ALTER TABLE settings ADD COLUMN show_price_breakdown BOOLEAN DEFAULT 1")
        print("  Added settings.show_price_breakdown")

    if not column_exists('settings', 'total_tables'):
        cursor.execute("ALTER TABLE settings ADD COLUMN total_tables INTEGER DEFAULT 10")
        print("  Added settings.total_tables")

    if not column_exists('settings', 'app_url'):
        cursor.execute("ALTER TABLE settings ADD COLUMN app_url VARCHAR(255) DEFAULT ''")
        print("  Added settings.app_url")

    # --- Create customer_sessions table ---
    if not table_exists('customer_sessions'):
        cursor.execute("""
            CREATE TABLE customer_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number INTEGER,
                order_type VARCHAR(20) NOT NULL DEFAULT 'dine_in',
                customer_name VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) DEFAULT '',
                session_token VARCHAR(100) UNIQUE NOT NULL,
                order_id INTEGER REFERENCES orders(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        cursor.execute("CREATE INDEX idx_customer_sessions_token ON customer_sessions(session_token)")
        cursor.execute("CREATE INDEX idx_customer_sessions_table ON customer_sessions(table_number, is_active)")
        print("  Created customer_sessions table")

    # --- Create daily_counters table ---
    if not table_exists('daily_counters'):
        cursor.execute("""
            CREATE TABLE daily_counters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                counter_date DATE UNIQUE NOT NULL,
                last_queue_number INTEGER DEFAULT 0
            )
        """)
        print("  Created daily_counters table")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")


if __name__ == '__main__':
    db_path = get_db_path()
    migrate(db_path)
