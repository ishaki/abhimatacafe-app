"""Import menu items from the Excel sheet into the database.

Reads `data/Menu Abhimata Cafe.xlsx` and upserts rows into the
`menu_items` table by name. Existing items with matching names are
updated in place (preserving their id so past orders stay linked);
new items are inserted.

Usage:
    cd backend
    python import_menu_from_excel.py
"""
import os
import sqlite3
import sys

import openpyxl


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


def get_excel_path():
    candidates = [
        '../data/Menu Abhimata Cafe.xlsx',
        'data/Menu Abhimata Cafe.xlsx',
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return candidates[0]


def parse_menu(xlsx_path):
    """Return a list of dicts: {name, category, description, price}."""
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active

    items = []
    header_seen = False
    for row in ws.iter_rows(values_only=True):
        # Columns used: B=Menu, C=Category, D=Description, E=Price
        _, name, category, description, price = row[:5]

        # Skip blank rows
        if not name and not category and not price:
            continue

        # Skip the header row
        if not header_seen:
            if isinstance(name, str) and name.strip().lower() == 'menu':
                header_seen = True
            continue

        if not name or price is None:
            continue

        category_str = str(category).strip() if category else 'Other'
        if category_str.lower() == 'drink':
            category_str = 'Drinks'

        items.append({
            'name': str(name).strip(),
            'category': category_str,
            'description': str(description).strip() if description else None,
            'price': float(price),
        })
    return items


MENU_ITEMS_SCHEMA = """
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    rating INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'available',
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""


def upsert_menu_items(db_path, items):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(MENU_ITEMS_SCHEMA)

    inserted = 0
    updated = 0
    for item in items:
        cursor.execute(
            "SELECT id FROM menu_items WHERE name = ?",
            (item['name'],),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                """
                UPDATE menu_items
                SET category = ?, description = ?, price = ?, status = 'available'
                WHERE id = ?
                """,
                (item['category'], item['description'], item['price'], row[0]),
            )
            updated += 1
        else:
            cursor.execute(
                """
                INSERT INTO menu_items (name, category, description, price, rating, status)
                VALUES (?, ?, ?, ?, 5, 'available')
                """,
                (item['name'], item['category'], item['description'], item['price']),
            )
            inserted += 1

    conn.commit()
    conn.close()
    return inserted, updated


def main():
    db_path = get_db_path()
    xlsx_path = get_excel_path()

    if not os.path.exists(db_path):
        print(f"Database not found at {db_path} — will be created.")

    if not os.path.exists(xlsx_path):
        print(f"Excel file not found at {xlsx_path}")
        sys.exit(1)

    print(f"Reading menu from: {xlsx_path}")
    items = parse_menu(xlsx_path)
    print(f"Parsed {len(items)} menu items")

    print(f"Writing to database: {db_path}")
    inserted, updated = upsert_menu_items(db_path, items)
    print(f"Inserted: {inserted}, Updated: {updated}")


if __name__ == '__main__':
    main()
