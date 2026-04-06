from flask import Flask, request, make_response, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
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

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-dev-key')
    if app.config['SECRET_KEY'] == 'fallback-dev-key':
        app.logger.warning("Using fallback SECRET_KEY - Set SECRET_KEY in environment!")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///abhimata_cafe.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'fallback-jwt-key')
    if app.config['JWT_SECRET_KEY'] == 'fallback-jwt-key':
        app.logger.warning("Using fallback JWT_SECRET_KEY - Set JWT_SECRET_KEY in environment!")
    
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)  # Expires after 24 hours
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, 
         origins=["http://localhost:3000", "http://127.0.0.1:3000"],
         methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
         allow_headers=["Content-Type", "Authorization"],
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
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    # Add security headers
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
        return response
    
    # Handle preflight requests
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", request.headers.get('Origin', '*'))
            response.headers.add('Access-Control-Allow-Headers', "Content-Type, Authorization")
            response.headers.add('Access-Control-Allow-Methods', "GET, POST, PUT, DELETE, PATCH")
            response.headers.add('Access-Control-Max-Age', '3600')
            return response
    
    # Error handlers
    @app.errorhandler(Exception)
    def handle_error(error):
        """Generic error handler to prevent information disclosure"""
        # Log the actual error for debugging
        app.logger.error(f"Error: {str(error)}", exc_info=True)
        
        # Return generic message to client
        return jsonify({'error': 'An error occurred processing your request'}), 500

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Access forbidden'}), 403
    
    return app, socketio

app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
