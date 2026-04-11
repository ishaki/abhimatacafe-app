from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from datetime import timedelta
from dotenv import load_dotenv
from models import db
from socketio_instance import init_socketio
from routes.auth import auth_bp
from routes.menu import menu_bp
from routes.orders import orders_bp
from routes.kitchen import kitchen_bp
from routes.billing import billing_bp
from routes.expenses import expenses_bp
from routes.reports import reports_bp
from routes.settings import settings_bp
from routes.customer import customer_bp

# Load environment variables
load_dotenv()

def _auto_migrate(db):
    """Run lightweight column migrations for existing databases."""
    import sqlite3
    db_path = os.environ.get('DATABASE_PATH', 'abhimata_cafe.db')
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    def column_exists(table, column):
        cursor.execute(f"PRAGMA table_info({table})")
        return column in [row[1] for row in cursor.fetchall()]

    # Add kitchen_display_enabled to settings
    if not column_exists('settings', 'kitchen_display_enabled'):
        cursor.execute("ALTER TABLE settings ADD COLUMN kitchen_display_enabled BOOLEAN DEFAULT 1")
        conn.commit()
        print("Migration: added kitchen_display_enabled to settings")

    conn.close()


def _seed_default_admin():
    """Create default admin user if no users exist in the database."""
    from models import User
    if User.query.count() == 0:
        admin = User(username='admin', role='admin')
        admin.set_password(os.environ.get('DEFAULT_ADMIN_PASSWORD', 'Admin@2024!Secure'))
        db.session.add(admin)
        db.session.commit()
        print('Default admin user created (username: admin)')


def _seed_menu_items():
    """Seed menu items from seed_menu_data.MENU_SEED if the table is empty.

    Only runs on first-time setup (when no menu items exist) so it won't
    overwrite items added/edited through the admin UI. To force a re-seed
    after editing the Excel/regenerating seed_menu_data.py, clear the
    menu_items table first.
    """
    from models import MenuItem
    if MenuItem.query.count() > 0:
        return
    try:
        from seed_menu_data import MENU_SEED
    except ImportError:
        print('Menu seed: seed_menu_data.py not found, skipping')
        return
    for item in MENU_SEED:
        db.session.add(MenuItem(
            name=item['name'],
            category=item['category'],
            description=item['description'],
            price=item['price'],
            rating=5,
            status='available',
        ))
    db.session.commit()
    print(f'Menu seed: inserted {len(MENU_SEED)} items')


def create_app():
    app = Flask(__name__,
                static_folder='static_frontend',
                static_url_path='')

    # Environment detection
    environment = os.environ.get('FLASK_ENV', 'development')
    is_production = environment == 'production'

    # Configuration — enforce secrets in production
    secret_key = os.environ.get('SECRET_KEY')
    jwt_secret = os.environ.get('JWT_SECRET_KEY')

    if is_production:
        if not secret_key or not jwt_secret:
            raise RuntimeError(
                "SECRET_KEY and JWT_SECRET_KEY must be set in production! "
                "Generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        app.config['SECRET_KEY'] = secret_key
        app.config['JWT_SECRET_KEY'] = jwt_secret
    else:
        app.config['SECRET_KEY'] = secret_key or 'fallback-dev-key'
        app.config['JWT_SECRET_KEY'] = jwt_secret or 'fallback-jwt-key'
        if not secret_key:
            app.logger.warning("Using fallback SECRET_KEY - Set SECRET_KEY in environment!")
        if not jwt_secret:
            app.logger.warning("Using fallback JWT_SECRET_KEY - Set JWT_SECRET_KEY in environment!")

    # Database — use volume path in production
    db_path = os.environ.get('DATABASE_PATH', 'abhimata_cafe.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)

    # Configure logging for production
    if is_production:
        logging.basicConfig(level=logging.WARNING)
        app.logger.setLevel(logging.WARNING)

    # Initialize extensions
    db.init_app(app)

    # CORS — use environment-based allowed origins
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    allowed_origins = [origin.strip() for origin in allowed_origins]

    CORS(app,
         origins=allowed_origins,
         methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
         allow_headers=["Content-Type", "Authorization", "X-Customer-Token"],
         supports_credentials=True,
         max_age=3600)

    jwt = JWTManager(app)
    socketio = init_socketio(app)

    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
        strategy="fixed-window"
    )

    # Apply stricter limits to auth endpoints
    limiter.limit("5 per minute")(auth_bp)
    # Financial operations
    limiter.limit("20 per minute")(billing_bp)
    limiter.limit("20 per minute")(expenses_bp)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(menu_bp, url_prefix='/api/menu')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(kitchen_bp, url_prefix='/api/kitchen')
    app.register_blueprint(billing_bp, url_prefix='/api/billing')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(customer_bp, url_prefix='/api/customer')

    # Customer endpoints — lighter rate limits
    limiter.limit("30 per minute")(customer_bp)

    # Create tables and seed default admin if no users exist
    with app.app_context():
        db.create_all()
        _auto_migrate(db)
        _seed_default_admin()
        _seed_menu_items()

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy'}), 200

    # Add security headers
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

        # CSP — allow self, inline styles (Tailwind), WebSocket, and data URIs for images.
        # upgrade-insecure-requests auto-upgrades any http:// subresource to https://
        # before CSP checks — this protects against a baked-in http:// VITE_API_URL.
        csp_directives = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self' https: wss: ws:",
            "font-src 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
        ]
        response.headers['Content-Security-Policy'] = '; '.join(csp_directives)

        return response

    # Error handlers — generic messages only, no details leaked
    @app.errorhandler(Exception)
    def handle_error(error):
        """Generic error handler to prevent information disclosure"""
        app.logger.error(f"Error: {str(error)}", exc_info=True)
        return jsonify({'error': 'An error occurred processing your request'}), 500

    @app.errorhandler(404)
    def not_found(error):
        # If API route, return JSON 404
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        # Otherwise serve frontend (SPA routing)
        if app.static_folder and os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Access forbidden'}), 403

    # Serve frontend static files (SPA catch-all)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if not app.static_folder:
            return jsonify({'error': 'Frontend not built'}), 404
        # Serve actual static files if they exist
        static_file = os.path.join(app.static_folder, path)
        if path and os.path.exists(static_file) and os.path.isfile(static_file):
            return send_from_directory(app.static_folder, path)
        # SPA fallback — serve index.html for all other routes
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Frontend not built. Run: cd frontend && npm run build'}), 404

    return app, socketio

app, socketio = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_ENV') != 'production'
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)
