# Product Requirements Document (PRD)
## Abhimata Cafe Management System

---

## 1. Product Overview

### 1.1 Product Name
Abhimata Cafe Management System

### 1.2 Purpose
A web-based application to manage cafe operations including menu management, order taking, kitchen operations, billing, and financial reporting. The system runs on local network and is accessible via tablets and phones.

### 1.3 Target Users
- Admin
- Waitress
- Kitchen Staff
- Cashier

---

## 2. System Architecture

### 2.1 Platform
- Web-based application
- Local network deployment
- Responsive design (tablet and phone adaptive)
- Touch-friendly interface with drag & drop support

### 2.2 Data Storage
- Database for persistent data storage
- Accessible across multiple devices on local network

---

## 3. User Roles & Permissions

### 3.1 Admin
- Full access to all features
- Configure menu items
- Manage user accounts
- View all reports
- Input and manage expenses

### 3.2 Waitress
- Create new orders
- View menu
- Input table number and customer info
- View order status

### 3.3 Kitchen Staff
- View pending orders
- Mark orders as complete
- View order details and notes

### 3.4 Cashier
- View completed orders
- Process payments
- Print bills (optional)
- Mark orders as paid
- Input expenses
- Generate reports

---

## 4. Core Features

### 4.1 Authentication & User Management
**Priority: High**

#### Requirements:
- Login page with role selection
- Secure authentication for each role
- Session management
- User list management (Admin only)

#### User Stories:
- As a user, I want to login with my credentials and access features based on my role
- As an admin, I want to create and manage user accounts for staff

---

### 4.2 Menu Management
**Priority: High**

#### Requirements:
- Admin can add, edit, delete menu items
- Each menu item contains:
  - Name
  - Category (Food, Drinks, Desserts, etc.)
  - Description
  - Price
  - Rating (1-5 stars or similar)
  - Status (Available/Unavailable)
  - Image (optional)
- Menu items grouped by categories
- Quick search/filter by category

#### User Stories:
- As an admin, I want to add new menu items with details so customers can see what we offer
- As an admin, I want to mark items as unavailable when we run out of stock
- As a waitress, I want to see categorized menu to quickly find items

---

### 4.3 Order Management
**Priority: High**

#### Requirements:
- Waitress can create new orders
- Order contains:
  - Order ID (auto-generated)
  - Table Number
  - Customer Name (optional)
  - Customer Phone Number (optional)
  - Date & Time (auto-captured)
  - Order Items (multiple items)
  - Total Amount
  - Status (Pending → Complete → Paid)
- Each order item contains:
  - Menu item
  - Quantity
  - Notes/customization
  - Subtotal
- **Search functionality** for menu items by name, description, or category
- **Popup modal** for special instructions when adding items to cart
- **Order editing capability** - waitress can add more items to existing pending orders
- **Real-time kitchen notifications** for newly added items to existing orders
- Drag and drop menu items to order
- Edit order before submitting
- Order automatically goes to "Pending" status

#### User Stories:
- As a waitress, I want to search menu items quickly to find what customers want
- As a waitress, I want to add special instructions through a popup modal for better UX
- As a waitress, I want to add more items to existing orders when customers change their mind
- As a waitress, I want to create orders by selecting menu items and adding notes for customization
- As a waitress, I want to input table number and customer info to track orders
- As a waitress, I want to drag and drop menu items to create orders quickly
- As kitchen staff, I want to see notifications when new items are added to existing orders

---

### 4.4 Kitchen Display System
**Priority: High**

#### Requirements:
- Display all pending orders in chronological order
- Show order details:
  - Order ID
  - Table Number
  - Items with quantities and notes
  - Order time
- **Highlight newly added items** to existing orders with visual indicators
- **Real-time notifications** when items are added to existing orders
- Kitchen can mark order as "Complete"
- Visual indication of order age (color coding for old orders)
- Auto-refresh when new orders come in

#### User Stories:
- As kitchen staff, I want to see all pending orders so I know what to cook
- As kitchen staff, I want to see item notes to understand customization requests
- As kitchen staff, I want to see notifications when new items are added to existing orders
- As kitchen staff, I want to easily identify newly added items in existing orders
- As kitchen staff, I want to mark orders as complete when done cooking

---

### 4.5 Billing & Payment
**Priority: High**

#### Requirements:
- Cashier can view all completed orders
- **Cashier can view pending orders** with option to edit them
- Display order summary with:
  - Order ID
  - Table Number
  - Customer Info
  - Items ordered
  - Total amount
- Payment options:
  - Cash
  - Card/QRIS
- Print bill functionality (optional)
- Mark order as "Paid"
- Payment timestamp
- **Edit Order button** for pending orders to add more items

#### User Stories:
- As a cashier, I want to view completed orders ready for billing
- As a cashier, I want to view pending orders and edit them if needed
- As a cashier, I want to select payment method and mark orders as paid
- As a cashier, I want to print bills for customers who request receipts
- As a cashier, I want to quickly access order editing for pending orders

---

### 4.6 Expense Management
**Priority: Medium**

#### Requirements:
- Admin/Cashier can input expenses
- Expense contains:
  - Date of transaction
  - Item/Category
  - Description
  - Total price
  - Recorded by (user)
- View, edit, delete expenses
- Filter expenses by date range

#### User Stories:
- As an admin/cashier, I want to record daily expenses so I can track costs
- As an admin, I want to see expense history to understand spending patterns

---

### 4.7 Reports & Analytics
**Priority: High**

#### Requirements:
- End-of-day summary report
- Report filters:
  - By date (specific date)
  - By week
  - By month
- Report includes:
  - Total Sales (revenue)
  - Total Number of Orders
  - Number of Orders by Menu Type (Food count, Drink count, etc.)
  - Total Expenses
  - Net Profit (Sales - Expenses)
- Export/Print report (optional)
- Visual charts/graphs for better insight

#### User Stories:
- As a cashier, I want to generate end-of-day report to see daily performance
- As an admin, I want to view weekly and monthly reports to track business trends
- As an admin, I want to see order breakdown by type to understand popular items

---

## 5. User Interface Requirements

### 5.1 Responsive Design
- Tablet optimized (primary device)
- Phone compatible
- Touch-friendly buttons and controls
- Large tap targets (minimum 44x44px)

### 5.2 Drag & Drop
- Drag menu items to order cart
- Drag to reorder items
- Visual feedback during drag operations

### 5.3 Navigation
- Role-based menu/navigation
- Clear indication of current page
- Quick access to main features
- **Orange header background** with branding
- Application name "Abhimata Cafe" displayed in header

### 5.4 Branding
- **Application Name**: Abhimata Cafe
- **Primary Brand Color**: Orange (for headers and primary elements)
- Logo placement in header (if available)
- Consistent branding across all pages

### 5.5 Visual Design
- Clean and modern interface
- High contrast for readability
- Color coding for order status:
  - Pending: Yellow/Orange
  - Complete: Green
  - Paid: Blue/Grey

---

## 6. Technical Requirements

### 6.1 Database Schema (Suggested Tables)
- Users (id, username, password, role, created_at)
- MenuItems (id, name, category, description, price, rating, status, image_url, created_at)
- Orders (id, table_number, customer_name, customer_phone, status, payment_method, total_amount, created_at, completed_at, paid_at)
- OrderItems (id, order_id, menu_item_id, quantity, notes, subtotal)
- Expenses (id, date, item, description, amount, recorded_by, created_at)

### 6.2 Technology Stack (Suggested)
- Backend: Node.js + Express or Python + Flask
- Database: SQLite (simple) or PostgreSQL/MySQL
- Frontend: React or Vue.js
- UI Framework: Tailwind CSS or Bootstrap

### 6.3 Network Requirements
- Run on local network (LAN)
- Static IP or hostname for server
- All devices connected to same network

---

## 7. Success Metrics

### 7.1 Performance
- Order creation < 30 seconds
- Kitchen display updates in real-time
- Report generation < 5 seconds

### 7.2 Usability
- Staff can use system with minimal training (< 1 hour)
- Order accuracy improvement
- Faster billing process

---

## 8. Future Enhancements (Optional)
- Customer-facing menu (QR code ordering)
- Inventory management
- Staff shift management
- Customer loyalty program
- Multi-language support
- Table reservation system

---

## 9. Implementation Phases

### Phase 1: Core Features (MVP)
- Authentication
- Menu management
- Order creation
- Kitchen display
- Basic billing

### Phase 2: Payment & Reports
- Payment processing
- End-of-day reports
- Expense tracking

### Phase 3: Enhancement
- Advanced reporting (weekly/monthly)
- Print functionality
- UI/UX refinements
- Performance optimization

---

## 10. Assumptions & Constraints

### Assumptions:
- Stable local network available
- Staff have basic smartphone/tablet skills
- Single cafe location

### Constraints:
- Local network only (no internet required)
- Limited to 4 user roles
- No integration with external payment systems

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2025  
**Status:** Draft for Review