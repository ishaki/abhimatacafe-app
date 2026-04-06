from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

def get_local_time():
    """Get current local time"""
    return datetime.now()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(500), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref='sessions')

class MenuItem(db.Model):
    __tablename__ = 'menu_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Integer, default=5)
    status = db.Column(db.String(20), default='available')
    image_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'price': self.price,
            'rating': self.rating,
            'status': self.status,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.Integer, nullable=False)
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    order_type = db.Column(db.String(20), default='dine_in')  # 'dine_in' or 'take_away'
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(20))
    total_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time)
    completed_at = db.Column(db.DateTime)
    paid_at = db.Column(db.DateTime)
    
    # Relationship
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'table_number': self.table_number,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'order_type': self.order_type,
            'status': self.status,
            'payment_method': self.payment_method,
            'total_amount': self.total_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'items': [item.to_dict() for item in self.items]
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_items.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    notes = db.Column(db.Text)
    subtotal = db.Column(db.Float, nullable=False)
    is_new_addition = db.Column(db.Boolean, default=False)  # Track if item was added later
    
    # Relationship
    menu_item = db.relationship('MenuItem', backref='order_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'menu_item_id': self.menu_item_id,
            'menu_item_name': self.menu_item.name if self.menu_item else None,
            'quantity': self.quantity,
            'notes': self.notes,
            'subtotal': self.subtotal,
            'is_new_addition': self.is_new_addition
        }

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    item = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    amount = db.Column(db.Float, nullable=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    recorder = db.relationship('User', backref='expenses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'item': self.item,
            'description': self.description,
            'amount': self.amount,
            'recorded_by': self.recorded_by,
            'recorder_name': self.recorder.username if self.recorder else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Settings(db.Model):
    __tablename__ = 'settings'
    
    id = db.Column(db.Integer, primary_key=True)
    cafe_name = db.Column(db.String(100), default='Abhimata Cafe')
    cafe_address = db.Column(db.Text, default='')
    cafe_phone = db.Column(db.String(20), default='')
    cafe_email = db.Column(db.String(100), default='')
    currency = db.Column(db.String(10), default='IDR')
    tax_rate = db.Column(db.Float, default=11.0)
    service_charge = db.Column(db.Float, default=5.0)
    auto_print = db.Column(db.Boolean, default=False)
    sound_notifications = db.Column(db.Boolean, default=True)
    dark_mode = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def get_settings(cls):
        """Get the current settings, create default if none exist"""
        settings = cls.query.first()
        if not settings:
            settings = cls()
            db.session.add(settings)
            db.session.commit()
        return settings
    
    def to_dict(self):
        return {
            'cafeName': self.cafe_name,
            'cafeAddress': self.cafe_address,
            'cafePhone': self.cafe_phone,
            'cafeEmail': self.cafe_email,
            'currency': self.currency,
            'taxRate': float(self.tax_rate),
            'serviceCharge': float(self.service_charge),
            'autoPrint': self.auto_print,
            'soundNotifications': self.sound_notifications,
            'darkMode': self.dark_mode,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def update_from_dict(self, data):
        """Update settings from dictionary"""
        self.cafe_name = data.get('cafeName', self.cafe_name)
        self.cafe_address = data.get('cafeAddress', self.cafe_address)
        self.cafe_phone = data.get('cafePhone', self.cafe_phone)
        self.cafe_email = data.get('cafeEmail', self.cafe_email)
        self.currency = data.get('currency', self.currency)
        self.tax_rate = data.get('taxRate', self.tax_rate)
        self.service_charge = data.get('serviceCharge', self.service_charge)
        self.auto_print = data.get('autoPrint', self.auto_print)
        self.sound_notifications = data.get('soundNotifications', self.sound_notifications)
        self.dark_mode = data.get('darkMode', self.dark_mode)
        self.updated_at = datetime.utcnow

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)  # login, logout, create_order, delete_user, etc.
    resource_type = db.Column(db.String(50))  # order, user, menu_item, etc.
    resource_id = db.Column(db.Integer)
    details = db.Column(db.Text)  # JSON string with additional details
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='audit_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }