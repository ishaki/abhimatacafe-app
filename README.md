# Abhimata Cafe Management System

A comprehensive web-based cafe management system built with Python Flask backend and React frontend, designed for local network deployment.

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
- **Local Network Deployment**: Runs on local network for multi-device access
- **Touch-friendly Interface**: Large buttons and drag-and-drop support
- **Orange Branding**: Consistent Abhimata Cafe branding throughout

## Technology Stack

### Backend
- **Python 3.8+**
- **Flask**: Web framework
- **Flask-SocketIO**: Real-time WebSocket communication
- **Flask-JWT-Extended**: JWT authentication
- **SQLAlchemy**: Database ORM
- **SQLite**: Database (for simplicity)
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

### Quick Start (Windows)
1. Clone or download the project
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

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

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
- `GET /api/auth/me` - Get current user
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

## WebSocket Events

### Client to Server
- Connection established automatically

### Server to Client
- `new_order` - New order created
- `order_updated` - Order status updated

## Database Schema

The system uses SQLite with the following main tables:
- `users` - User accounts and roles
- `menu_items` - Menu items with categories and pricing
- `orders` - Order information and status
- `order_items` - Individual items within orders
- `expenses` - Daily expense tracking

## Local Network Deployment

To deploy on local network:

1. **Backend**: The Flask app runs on `0.0.0.0:5000` by default
2. **Frontend**: The Vite dev server runs on `0.0.0.0:3000` by default
3. **Access**: Other devices on the same network can access via `http://[SERVER_IP]:3000`

## Development

### Project Structure
```
AbhimataCafe/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── routes/             # API route handlers
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API and WebSocket services
│   │   └── App.jsx         # Main app component
│   └── package.json        # Node.js dependencies
├── database/
│   └── schema.sql          # Database schema
└── README.md
```

### Adding New Features
1. Backend: Add routes in `backend/routes/`
2. Frontend: Add pages in `frontend/src/pages/`
3. Update navigation in Dashboard component
4. Add role permissions as needed

## Troubleshooting

### Common Issues
1. **Port already in use**: Change ports in `app.py` (backend) or `vite.config.js` (frontend)
2. **Database errors**: Delete `abhimata_cafe.db` to reset database
3. **WebSocket connection issues**: Check firewall settings and network connectivity
4. **CORS errors**: Ensure backend CORS is configured for your frontend URL

### Logs
- Backend logs appear in the terminal running `python app.py`
- Frontend logs appear in browser console and terminal running `npm run dev`

## License

This project is developed for Abhimata Cafe management purposes.

## Support

For technical support or feature requests, please contact the development team.
