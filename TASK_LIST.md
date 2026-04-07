# Abhimata Cafe Management System - Task List

## Project Status: ~95% Core Complete | Customer Self-Order: Complete

### COMPLETED FEATURES

#### Core Backend Implementation
- [x] Authentication & User Management API
- [x] Menu Management API (CRUD operations)
- [x] Order Management API (create, update status)
- [x] Kitchen Display API (pending orders, mark complete)
- [x] Billing & Payment API (process payments)
- [x] Expense Management API (CRUD operations)
- [x] Reports & Analytics API (daily, weekly, monthly)
- [x] WebSocket integration for real-time updates
- [x] Database models and relationships
- [x] JWT authentication and role-based access

#### Core Frontend Implementation
- [x] Login page with authentication
- [x] Dashboard with role-based navigation
- [x] Menu Management page (full CRUD)
- [x] Order Creation page (cart-based ordering)
- [x] Kitchen Display page (real-time order display)
- [x] Billing page (payment processing)
- [x] Expenses Management page
- [x] Reports & Analytics page
- [x] User Management page
- [x] Settings page
- [x] Authentication context and protected routes
- [x] Responsive design with Tailwind CSS
- [x] Real-time WebSocket integration

#### Deployment & Security
- [x] Railway deployment config (Procfile, railway.toml, nixpacks.toml)
- [x] Production secret enforcement (no fallback keys)
- [x] CORS hardening (environment-based, no wildcards)
- [x] Account lockout (5 attempts / 15 min)
- [x] Password strength validation
- [x] Change password endpoint
- [x] Input sanitization with markupsafe
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Audit logging
- [x] Health check endpoint
- [x] Frontend served from Flask (SPA)
- [x] DEPLOYMENT.md guide

---

## NEW FEATURE: Customer Self-Ordering via QR Code

### Overview

Customers scan a QR code on their table (or a takeaway QR at the counter), provide their name, browse the menu, and submit orders from their own device. A waitress/admin must approve the order before it goes to the kitchen. Customers can add more items to the same order. One order = one bill.

### Order Status Flow (Updated)

```
Customer submits order
  → waiting_approval
    → Waitress/Admin APPROVES → pending → Kitchen sees it
    → Waitress/Admin REJECTS  → rejected (customer sees reason)
        → pending → Kitchen completes → complete → Cashier pays → paid
```

### QR Code Types

| Type | URL Pattern | Behavior |
|------|-------------|----------|
| Table QR (per table) | `/table/{n}` | Table auto-filled, customer picks dine_in or take_away |
| Takeaway QR (1 global) | `/order/takeaway` | No table, defaults to take_away, customer gets queue number |

### User Flow

```
1. Customer scans QR code
   → Table QR: /table/5
   → Takeaway QR: /order/takeaway

2. Landing page:
   - Cafe branding
   - Table number shown (or "Takeaway Order")
   - Form: name (required), phone (optional)
   - Choose: dine_in or take_away (table QR shows both, takeaway QR defaults take_away)
   - "Start Ordering" → creates session → redirects to menu

3. Menu page:
   - Browse by category, search, add to cart
   - Quantity selector, special notes per item
   - Floating cart bar at bottom
   - Mobile-first design

4. Cart review & submit:
   - Item list with quantities, notes, subtotals
   - Price breakdown configurable: subtotal + tax + service OR just total
   - "Place Order" → order created with status 'waiting_approval'
   - Customer sees confirmation page

5. Staff approval:
   - Dedicated "Incoming Orders" page for waitress/admin
   - Notification + sound when customer order arrives
   - Approve → order goes to kitchen (status: pending)
   - Reject → provide reason → customer sees rejection message

6. Customer tracking:
   - Real-time status: Waiting Approval → Preparing → Ready
   - Can add more items (goes to same order, needs re-approval for new items)
   - Takeaway customers see queue number (e.g., "Takeaway #12")

7. Kitchen + Billing:
   - Approved orders appear in kitchen (existing flow)
   - One bill per customer session regardless of add-ons
```

### Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Customer auth | Lightweight session token (UUID, not JWT) | Customers don't need full auth — just a temp session |
| Menu access | Public endpoint (`/api/customer/menu`) | Customers shouldn't need staff credentials |
| Order approval | New `waiting_approval` status | Staff verifies before kitchen prepares |
| Rejection | Reason required, visible to customer | Customer knows why and can re-order |
| One order per session | Enforce in backend | 1 session = 1 active order = 1 bill |
| Add items to order | Re-uses existing order, new items need approval | Items marked `waiting_approval` until staff approves |
| Takeaway queue number | Auto-increment daily counter | Resets daily, shown as "Takeaway #N" |
| Tax/service display | Configurable via `show_price_breakdown` setting | Admin controls what customers see |
| QR table count | Admin-configurable | Admin sets number of tables in settings, generates QR codes |
| Frontend routing | `/table/:n/*` and `/order/takeaway/*` | Clean separation from staff routes |

### Database Changes

**Modify `Order` model:**
```
+ order_source: string ('staff' | 'customer'), default='staff'
+ queue_number: integer, nullable (for takeaway orders)
+ rejection_reason: string, nullable (when staff rejects)
+ customer_session_id: integer, FK to CustomerSession, nullable
```

**Modify `OrderItem` model:**
```
+ item_status: string ('approved' | 'waiting_approval' | 'rejected'), default='approved'
  (staff-created items default to 'approved', customer items default to 'waiting_approval')
```

**Update Order status enum:**
```
Existing: pending, complete, paid
New:      waiting_approval, rejected
Full flow: waiting_approval → pending → complete → paid
                            → rejected
```

**New `CustomerSession` model:**
```
- id: integer (PK)
- table_number: integer (nullable — null for takeaway)
- order_type: string ('dine_in' | 'take_away')
- customer_name: string, max 100 (required)
- customer_phone: string, max 20 (optional)
- session_token: string, unique (UUID)
- order_id: integer, FK to Order (nullable — set after first order)
- created_at: datetime
- expires_at: datetime (24 hours)
- is_active: boolean, default True
```

**New `DailyCounter` model (for takeaway queue numbers):**
```
- id: integer (PK)
- date: date (unique)
- last_queue_number: integer, default 0
```

**Modify `Settings` model:**
```
+ show_price_breakdown: boolean, default True
+ total_tables: integer, default 10
+ app_url: string, default '' (for QR code generation)
```

---

### Phase 4A: Customer Self-Order — Backend (HIGH PRIORITY)

#### 13. Database Schema Changes
**Status:** Not Started
- [ ] Add `order_source` field to Order model (`'staff'` default, `'customer'`)
- [ ] Add `queue_number` field to Order model (nullable, for takeaway)
- [ ] Add `rejection_reason` field to Order model (nullable)
- [ ] Add `customer_session_id` FK to Order model (nullable)
- [ ] Add `item_status` field to OrderItem model (`'approved'` default, `'waiting_approval'`, `'rejected'`)
- [ ] Add `waiting_approval` and `rejected` to valid order statuses
- [ ] Create `CustomerSession` model
- [ ] Create `DailyCounter` model (takeaway queue numbers)
- [ ] Add `show_price_breakdown`, `total_tables`, `app_url` to Settings model
- [ ] Create migration script `migrate_add_customer_ordering.py`
- [ ] Run migration and verify schema

#### 14. Customer Session API
**Status:** Not Started
**File:** `backend/routes/customer.py`
- [ ] Create `customer_bp` Blueprint
- [ ] `POST /api/customer/session` — Create guest session
  - Input: `table_number` (nullable for takeaway), `customer_name` (required), `customer_phone` (optional), `order_type` ('dine_in' | 'take_away')
  - Validate table_number if provided (1 to `settings.total_tables`)
  - For takeaway: table_number is null
  - Generate UUID session token
  - Set expiry to 24 hours
  - Check if active session already exists for this table (prevent duplicates)
  - Return session token + table info + order_type
- [ ] `GET /api/customer/session` — Validate existing session
  - Check session token from header (`X-Customer-Token`)
  - Return session info if valid and not expired
  - Include existing order_id if customer already ordered
- [ ] Create `@customer_session_required` decorator
  - Extract token from `X-Customer-Token` header
  - Validate session exists, is active, not expired
  - Attach session to request context
- [ ] Register blueprint in `app.py` with prefix `/api/customer`
- [ ] Add rate limiting (20 requests/minute per IP)

#### 15. Customer Menu API (Public)
**Status:** Not Started
**File:** `backend/routes/customer.py`
- [ ] `GET /api/customer/menu` — Public menu endpoint
  - No auth required
  - Returns only `status='available'` items
  - Group by category in response
  - Include: id, name, category, description, price, image_url
  - Exclude: rating, internal status, created_at
- [ ] `GET /api/customer/settings` — Public settings for customer UI
  - Returns: cafe_name, currency, tax_rate, service_charge, show_price_breakdown
  - No auth required
- [ ] Add rate limiting (30 requests/minute per IP)

#### 16. Customer Order API
**Status:** Not Started
**File:** `backend/routes/customer.py`
- [ ] `POST /api/customer/orders` — Submit customer order
  - Requires valid customer session (`@customer_session_required`)
  - Check if session already has an active order → if yes, reject (use add-items instead)
  - Input: items array (menu_item_id, quantity, notes)
  - Validate all menu items exist and are available
  - Server-side price calculation from DB prices
  - Set `order_source='customer'`, `status='waiting_approval'`
  - Set customer_name, customer_phone, table_number, order_type from session
  - For takeaway: generate queue_number from DailyCounter
  - Set all OrderItems `item_status='waiting_approval'`
  - Link order to session (update session.order_id)
  - Emit WebSocket: `customer_order_pending` event to staff
  - Return order summary with order ID (and queue_number if takeaway)
- [ ] `GET /api/customer/orders/<order_id>` — Track order status
  - Requires valid customer session
  - Verify order belongs to this session
  - Return: status, items, timestamps, queue_number, rejection_reason
- [ ] `POST /api/customer/orders/<order_id>/items` — Add items to existing order
  - Requires valid customer session
  - Verify order belongs to session and is not rejected/paid
  - New items get `item_status='waiting_approval'`
  - If order was already approved (status=pending/complete), set a flag for staff to re-review new items
  - Server-side price calculation, update total
  - Emit WebSocket: `customer_items_pending` event to staff

#### 17. Order Approval API (Staff)
**Status:** Not Started
**File:** `backend/routes/orders.py` (extend existing)
- [ ] `POST /api/orders/<order_id>/approve` — Approve customer order (Waitress/Admin)
  - Require JWT + role check (admin or waitress)
  - Change order status: `waiting_approval` → `pending`
  - Change all `waiting_approval` items to `approved`
  - Emit WebSocket: `order_approved` to customer (room `table_{n}` or `takeaway_{queue}`)
  - Emit WebSocket: existing `new_order` to kitchen
  - Log audit
- [ ] `POST /api/orders/<order_id>/reject` — Reject customer order (Waitress/Admin)
  - Require JWT + role check (admin or waitress)
  - Input: `reason` (required string, max 500 chars)
  - Change order status: `waiting_approval` → `rejected`
  - Set `rejection_reason`
  - Emit WebSocket: `order_rejected` to customer with reason
  - Log audit
- [ ] `POST /api/orders/<order_id>/approve-items` — Approve new items added to existing order
  - For when customer adds items to an already-approved order
  - Approve individual items (item_status → 'approved')
  - Update kitchen via WebSocket
- [ ] Update existing GET `/api/orders/` to include new statuses and source filter
  - Add query param: `?source=customer` or `?source=staff`
  - Add query param: `?status=waiting_approval`
  - Waitress/Admin see `waiting_approval` orders

#### 18. QR Code Generation API
**Status:** Not Started
**File:** `backend/routes/settings.py` (extend existing)
- [ ] Add `qrcode` and `Pillow` to `requirements.txt`
- [ ] `GET /api/settings/qr/<table_number>` — Generate QR code PNG (Admin only)
  - QR encodes: `{app_url}/table/{table_number}`
  - Return PNG image
  - Include table number label on image
  - `app_url` from Settings model
- [ ] `GET /api/settings/qr/takeaway` — Generate takeaway QR code PNG (Admin only)
  - QR encodes: `{app_url}/order/takeaway`
  - Return PNG with "Takeaway" label
- [ ] `GET /api/settings/qr/all` — Generate all QR codes as ZIP (Admin only)
  - Generate QR for tables 1 to `settings.total_tables` + 1 takeaway QR
  - Package as downloadable ZIP
  - Each PNG labeled with table number or "Takeaway"

#### 19. WebSocket Events for Customer Orders
**Status:** Not Started
**File:** `backend/socketio_instance.py` + route files
- [ ] `customer_order_pending` — emitted when customer submits order
  - Data: order summary + source='customer' + table/queue info
  - Target: all authenticated staff clients
- [ ] `customer_items_pending` — emitted when customer adds items to existing order
  - Data: new items + order_id
  - Target: all authenticated staff clients
- [ ] `order_approved` — emitted when staff approves order
  - Data: order summary + status='pending'
  - Target: customer room (`table_{n}` or `takeaway_{queue}`)
- [ ] `order_rejected` — emitted when staff rejects order
  - Data: order_id + rejection_reason
  - Target: customer room
- [ ] `order_status_update` — emitted on any status change
  - Data: order_id + new_status
  - Target: customer room
- [ ] Add Socket.IO room management:
  - Customer joins room on session creation: `table_{n}` or `takeaway_{queue_number}`
  - Customer leaves room on session expiry/disconnect
- [ ] Add customer socket connection handler (validate session token)

---

### Phase 4B: Customer Self-Order — Frontend — COMPLETED

#### 20. Customer Layout & Routing
**Status:** Complete
**Files:** `frontend/src/App.jsx`, `frontend/src/pages/customer/CustomerLayout.jsx`, `frontend/src/contexts/CustomerSessionContext.jsx`
- [x] Create `CustomerLayout.jsx` — minimal layout (cafe header + branding, no staff nav)
- [x] Add unprotected routes in `App.jsx`
- [x] Create `CustomerSessionContext.jsx` with session management

#### 21. Customer Landing Page (QR Entry Point)
**Status:** Complete
**File:** `frontend/src/pages/customer/CustomerLanding.jsx`
- [x] All features implemented (branding, form, order type selector, redirects)

#### 22. Customer Menu Page
**Status:** Complete
**File:** `frontend/src/pages/customer/CustomerMenu.jsx`
- [x] All features implemented (menu fetch, categories, search, cart, notes modal, price breakdown)

#### 23. Customer Cart & Order Submission
**Status:** Complete (integrated into CustomerMenu.jsx as cart drawer)
- [x] All features implemented (cart drawer, qty controls, price breakdown, order submission)

#### 24. Order Confirmation & Tracking Page
**Status:** Complete
**File:** `frontend/src/pages/customer/CustomerOrderStatus.jsx`
- [x] All features implemented (queue number, status tracker, WebSocket real-time, add more items)

---

### Phase 4C: Staff Integration — COMPLETED

#### 25. Incoming Customer Orders Page
**Status:** Complete
**File:** `frontend/src/pages/IncomingOrders.jsx`
- [x] All features implemented (approve/reject, WebSocket, notifications, badge count, auto-refresh)

#### 26. Staff Notification Enhancements
**Status:** Complete
- [x] Toast notifications for customer orders
- [x] Badge count of pending approvals in NavigationHeader
- [x] "Customer Order" badge in kitchen display and order list
- [x] Notification sound on new customer order

#### 27. QR Code Management UI (Admin)
**Status:** Complete
**File:** `frontend/src/pages/Settings.jsx` (extended)
- [x] Customer Ordering settings section (total tables, app URL, show price breakdown)
- [x] QR preview grid with individual download
- [x] Download All as ZIP

#### 28. Order List & Kitchen Display Updates
**Status:** Complete
- [x] OrderList: order_source badge (Staff/Customer), waiting_approval/rejected filters, queue number
- [x] KitchenDisplay: "Customer Order" badge, queue number for takeaway

---

### EXISTING REMAINING TASKS (MEDIUM PRIORITY)

#### 5. Drag & Drop Order Creation
**Status:** PRD Requirement | Current: Click-to-add
- [ ] Install drag & drop library (react-beautiful-dnd or @dnd-kit)
- [ ] Implement drag from menu items to cart
- [ ] Add visual feedback during drag operations
- [ ] Add touch-friendly drag & drop for tablets

#### 6. Print Bill Functionality
**Status:** PRD Optional Feature | Current: Missing
- [ ] Add print button to billing page
- [ ] Create printable bill template with cafe branding
- [ ] Implement browser print functionality
- [ ] Add print preview

#### 7. Visual Charts in Reports
**Status:** PRD Requirement | Current: Text-only
- [ ] Install charting library (Recharts or Chart.js)
- [ ] Create sales trend charts
- [ ] Add category breakdown pie charts
- [ ] Implement expense vs revenue charts

#### 8. Export/Print Reports
**Status:** PRD Optional Feature | Current: Missing
- [ ] Add export to PDF functionality
- [ ] Add export to Excel functionality
- [ ] Implement print report feature

#### 9. Dashboard Real-time Statistics
**Status:** Current: Static "0" values | Needed: Live data
- [ ] Connect dashboard stats to live data
- [ ] Implement today's orders count + revenue
- [ ] Add pending orders count
- [ ] Add real-time updates via WebSocket

### LOW PRIORITY — Polish & Optimization

#### 10. UI/UX Improvements
- [ ] Improve touch targets for mobile (44x44px minimum)
- [ ] Add loading skeletons for better UX
- [ ] Implement error boundaries
- [ ] Add keyboard navigation support
- [ ] Improve accessibility (ARIA labels)

#### 11. Performance Optimizations
- [ ] Implement code splitting and lazy loading for routes
- [ ] Optimize bundle size
- [ ] Add service worker for offline support
- [ ] Implement caching strategies

#### 12. Testing & Quality Assurance
- [ ] Add unit tests for components
- [ ] Add integration tests for API calls
- [ ] Add end-to-end tests
- [ ] Add security testing

---

## IMPLEMENTATION PRIORITY

### Phase 1: Core Missing Pages — COMPLETED
1. ~~Expenses Management Page~~
2. ~~Reports & Analytics Page~~
3. ~~User Management Page~~
4. ~~Settings Page~~

### Phase 2: Deployment & Security — COMPLETED
- ~~Railway deployment config~~
- ~~Security hardening~~
- ~~DEPLOYMENT.md~~

### Phase 3: Feature Enhancements (Existing)
5. Drag & Drop Order Creation
6. Print Bill Functionality
7. Visual Charts in Reports
8. Dashboard Real-time Statistics

### Phase 4: Customer Self-Ordering via QR Code — COMPLETED
**4A — Backend** — COMPLETED
**4B — Frontend: Customer Pages** — COMPLETED
**4C — Staff Integration** — COMPLETED

- All 28 tasks completed (backend APIs, customer frontend, staff integration)

### Phase 5: Polish & Optimization
9. Export/Print Reports
10. UI/UX Improvements
11. Performance Optimizations
12. Testing & Quality Assurance

---

## SUCCESS METRICS

- [ ] All PRD requirements implemented
- [ ] Customer can scan QR and place order in < 2 minutes
- [ ] Staff receives customer order notification within 2 seconds
- [ ] Staff can approve/reject order from dedicated page
- [ ] Approved customer order appears in kitchen display immediately
- [ ] Customer sees real-time status updates on their phone
- [ ] Takeaway customers get queue numbers
- [ ] One order per customer session, one bill
- [ ] Mobile-responsive customer pages (optimized for phones)
- [ ] Print functionality operational
- [ ] Performance targets met (< 30s order creation, < 5s reports)

---

**Last Updated:** April 7, 2026
**Next Milestone:** Phase 5 — Polish & Optimization (or Phase 3 enhancements)
