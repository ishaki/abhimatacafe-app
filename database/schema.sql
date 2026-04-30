-- Abhimata Cafe Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'waitress', 'kitchen', 'cashier')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'paid')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'qris')),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    paid_at TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL,
    is_new_addition BOOLEAN DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    item VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    recorded_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_name VARCHAR(100) DEFAULT 'Abhimata Cafe',
    cafe_address TEXT DEFAULT '',
    cafe_phone VARCHAR(20) DEFAULT '',
    cafe_email VARCHAR(100) DEFAULT '',
    currency VARCHAR(10) DEFAULT 'IDR',
    tax_rate REAL DEFAULT 10.0,
    service_charge REAL DEFAULT 0.0,
    auto_print BOOLEAN DEFAULT 0,
    sound_notifications BOOLEAN DEFAULT 1,
    dark_mode BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample menu items
INSERT OR IGNORE INTO menu_items (name, category, description, price, rating) VALUES
('Nasi Goreng Spesial', 'Food', 'Nasi goreng dengan telur, ayam, dan sayuran', 25000, 5),
('Mie Ayam Bakso', 'Food', 'Mie ayam dengan bakso dan pangsit', 20000, 4),
('Es Teh Manis', 'Drinks', 'Teh manis dingin dengan es batu', 8000, 4),
('Kopi Hitam', 'Drinks', 'Kopi arabika murni tanpa gula', 12000, 5),
('Es Jeruk', 'Drinks', 'Jeruk peras segar dengan es batu', 10000, 4),
('Pisang Goreng', 'Desserts', 'Pisang goreng dengan madu', 15000, 4),
('Kue Lapis', 'Desserts', 'Kue lapis tradisional', 18000, 5);
