# Abhimata Cafe Management System

A comprehensive web-based cafe management system built with Python Flask backend and React frontend. Supports both local network and cloud deployment (Railway).

## Features

### Core Functionality
- **Authentication & User Management**: Role-based access control (Admin, Waitress, Kitchen Staff, Cashier)
- **Menu Management**: Add, edit, delete menu items with categories and availability status
- **Order Management**: Create orders with drag-and-drop interface, real-time updates
- **Kitchen Display**: Real-time order display for kitchen staff with completion tracking
- **Billing & Payment**: Process payments with multiple payment methods (Cash, Card, QRIS)
- **Expense Tracking**: Record and manage daily expenses
- **Reports & Analytics**: Daily, weekly, and monthly reports with profit calculations

### Technical Features
- **Real-time Updates**: WebSocket integration for instant order updates
- **Responsive Design**: Optimized for tablets and phones
- **Touch-friendly Interface**: Large buttons and drag-and-drop support
- **Orange Branding**: Consistent Abhimata Cafe branding throughout
- **Production Ready**: Railway deployment config, security hardening, health checks

### Security Features
- Environment-enforced secret keys (no fallback in production)
- Account lockout after 5 failed login attempts (15 min cooldown)
- Password strength validation (uppercase, lowercase, number, min 8 chars)
- Password change endpoint
- Proper input sanitization using `markupsafe`
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Environment-based CORS (no wildcards)
- Rate limiting on auth and financial endpoints
- Audit logging for sensitive operations
- No error detail leaks in production

## Technology Stack

### Backend
- **Python 3.8+**
- **Flask**: Web framework
- **Flask-SocketIO**: Real-time WebSocket communication
- **Flask-JWT-Extended**: JWT authentication
- **SQLAlchemy**: Database ORM
- **SQLite**: Database
- **Gunicorn + Eventlet**: Production WSGI server
- **bcrypt**: Password hashing

### Frontend
- **React 18**: Frontend framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Socket.io-client**: WebSocket client
- **React Hot Toast**: Notifications
- **Lucide React**: Icons

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Quick Start (Windows — Local Development)
1. Clone the project
2. Run `start_all.bat` to start both servers automatically
3. Access the application at `http://localhost:3000`

### Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Copy `backend/env.example` to `backend/.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Flask session secret (required in production) | `fallback-dev-key` |
| `JWT_SECRET_KEY` | JWT signing key (required in production) | `fallback-jwt-key` |
| `FLASK_ENV` | `development` or `production` | `development` |
| `DATABASE_PATH` | SQLite database file path | `abhimata_cafe.db` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `PORT` | Server port | `5000` |

Generate secure keys with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Deployment

### Railway (Recommended for Cloud)

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

Quick steps:
1. Connect GitHub repo to Railway
2. Add a persistent volume mounted at `/data`
3. Set environment variables (`SECRET_KEY`, `JWT_SECRET_KEY`, `FLASK_ENV=production`, `DATABASE_PATH=/data/abhimata_cafe.db`, `ALLOWED_ORIGINS=https://your-app.up.railway.app`)
4. Railway auto-deploys from `main` branch

Estimated cost: ~$2-5/month for small cafe usage.

### Local Network
1. **Backend**: Flask runs on `0.0.0.0:5000` by default
2. **Frontend**: Vite dev server runs on `0.0.0.0:3000` by default
3. **Access**: Other devices on the same network can access via `http://[SERVER_IP]:3000`

## User Roles & Permissions

### Admin
- Full access to all features
- User management
- Menu management
- All reports and analytics

### Waitress
- Create new orders
- View menu items
- Input customer information

### Kitchen Staff
- View pending orders
- Mark orders as complete
- View order details and notes

### Cashier
- View completed orders
- Process payments
- Record expenses
- Generate reports

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/users` - List users (Admin only)
- `POST /api/auth/users` - Create user (Admin only)

### Menu Management
- `GET /api/menu/` - List menu items
- `POST /api/menu/` - Create menu item (Admin only)
- `PUT /api/menu/:id` - Update menu item (Admin only)
- `DELETE /api/menu/:id` - Delete menu item (Admin only)
- `PATCH /api/menu/:id/status` - Toggle availability (Admin only)

### Orders
- `GET /api/orders/` - List orders (role-filtered)
- `POST /api/orders/` - Create order (Admin/Waitress)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/items` - Add items to existing order
- `DELETE /api/orders/:id/items/:item_id` - Remove item from order

### Kitchen
- `GET /api/kitchen/orders` - Get pending orders
- `PATCH /api/kitchen/orders/:id/complete` - Mark order complete

### Billing
- `GET /api/billing/orders` - Get completed orders
- `POST /api/billing/pay` - Process payment

### Expenses
- `GET /api/expenses/` - List expenses
- `POST /api/expenses/` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/weekly` - Weekly report
- `GET /api/reports/monthly` - Monthly report

### Settings
- `GET /api/settings` - Get app settings
- `POST /api/settings` - Update settings (Admin only)
- `POST /api/settings/reset` - Reset to defaults (Admin only)

### Health
- `GET /api/health` - Health check endpoint

## WebSocket Events

### Server to Client
- `new_order` - New order created
- `order_updated` - Order status updated
- `order_items_added` - Items added to existing order
- `order_item_deleted` - Item removed from order

## Database Schema

The system uses SQLite with the following tables:
- `users` - User accounts and roles
- `user_sessions` - Active session tracking
- `menu_items` - Menu items with categories and pricing
- `orders` - Order information and status
- `order_items` - Individual items within orders
- `expenses` - Daily expense tracking
- `settings` - Application configuration
- `audit_logs` - Security audit trail

## Project Structure
```
AbhimataCafe/
├── backend/
│   ├── app.py                # Main Flask application
│   ├── models.py             # Database models
│   ├── socketio_instance.py  # WebSocket setup
│   ├── routes/               # API route handlers
│   │   ├── auth.py           # Authentication & user management
│   │   ├── menu.py           # Menu CRUD
│   │   ├── orders.py         # Order management
│   │   ├── kitchen.py        # Kitchen display
│   │   ├── billing.py        # Payment processing
│   │   ├── expenses.py       # Expense tracking
│   │   ├── reports.py        # Reports & analytics
│   │   └── settings.py       # App settings
│   ├── utils/
│   │   ├── validators.py     # Input validation & sanitization
│   │   └── audit.py          # Audit logging
│   ├── requirements.txt      # Python dependencies
│   └── env.example           # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts (Auth, Settings)
│   │   ├── services/         # API and WebSocket services
│   │   └── App.jsx           # Main app component
│   ├── vite.config.js        # Vite config with dev proxy
│   └── package.json          # Node.js dependencies
├── database/
│   └── schema.sql            # Database schema
├── DEPLOYMENT.md             # Deployment & security guide
├── Procfile                  # Railway/Gunicorn start command
├── railway.toml              # Railway deploy config
├── nixpacks.toml             # Railway build config (Python + Node)
└── README.md
```

## Troubleshooting

### Common Issues
1. **Port already in use**: Change ports in `app.py` (backend) or `vite.config.js` (frontend)
2. **Database errors**: Delete `abhimata_cafe.db` to reset database
3. **WebSocket connection issues**: Check firewall settings and network connectivity
4. **CORS errors**: Ensure `ALLOWED_ORIGINS` env var includes your frontend URL
5. **Production startup crash**: Make sure `SECRET_KEY` and `JWT_SECRET_KEY` are set

### Logs
- Backend logs appear in the terminal running `python app.py`
- Frontend logs appear in browser console and terminal running `npm run dev`
- Audit logs are stored in the `audit_logs` database table

## License

This project is developed for Abhimata Cafe management purposes.

## Support

For technical support or feature requests, please contact the development team.
