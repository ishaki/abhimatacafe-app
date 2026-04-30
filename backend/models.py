from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timezone
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


class CustomerSession(db.Model):
    __tablename__ = 'customer_sessions'

    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.Integer, nullable=True)  # null for takeaway
    order_type = db.Column(db.String(20), nullable=False, default='dine_in')
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20), default='')
    session_token = db.Column(db.String(100), unique=True, nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=get_local_time)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    order = db.relationship('Order', backref='customer_session', foreign_keys=[order_id])

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'table_number': self.table_number,
            'order_type': self.order_type,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'session_token': self.session_token,
            'order_id': self.order_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active
        }


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

    def to_public_dict(self):
        """Public-facing dict for customer menu (excludes internal fields)."""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'price': self.price,
            'image_url': self.image_url
        }


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.Integer, nullable=True)  # nullable for takeaway
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    order_type = db.Column(db.String(20), default='dine_in')  # 'dine_in' or 'take_away'
    status = db.Column(db.String(20), default='pending')
    # Status values: waiting_approval, pending, complete, paid, rejected
    order_source = db.Column(db.String(20), default='staff')  # 'staff' or 'customer'
    queue_number = db.Column(db.Integer, nullable=True)  # for takeaway orders
    rejection_reason = db.Column(db.String(500), nullable=True)
    customer_session_id = db.Column(db.Integer, db.ForeignKey('customer_sessions.id'), nullable=True)
    payment_method = db.Column(db.String(20))
    total_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time)
    completed_at = db.Column(db.DateTime)
    paid_at = db.Column(db.DateTime)

    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'table_number': self.table_number,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'order_type': self.order_type,
            'status': self.status,
            'order_source': self.order_source,
            'queue_number': self.queue_number,
            'rejection_reason': self.rejection_reason,
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
    is_new_addition = db.Column(db.Boolean, default=False)
    item_status = db.Column(db.String(20), default='approved')
    # item_status values: approved, waiting_approval, rejected

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
            'is_new_addition': self.is_new_addition,
            'item_status': self.item_status
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
    tax_rate = db.Column(db.Float, default=10.0)
    service_charge = db.Column(db.Float, default=0.0)
    auto_print = db.Column(db.Boolean, default=False)
    sound_notifications = db.Column(db.Boolean, default=True)
    dark_mode = db.Column(db.Boolean, default=False)
    # Workflow settings
    kitchen_display_enabled = db.Column(db.Boolean, default=True)
    # Customer ordering settings
    show_price_breakdown = db.Column(db.Boolean, default=True)
    total_tables = db.Column(db.Integer, default=10)
    app_url = db.Column(db.String(255), default='')
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
            'kitchenDisplayEnabled': self.kitchen_display_enabled,
            'showPriceBreakdown': self.show_price_breakdown,
            'totalTables': self.total_tables,
            'appUrl': self.app_url,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_public_dict(self):
        """Public settings for customer-facing UI."""
        return {
            'cafeName': self.cafe_name,
            'currency': self.currency,
            'taxRate': float(self.tax_rate),
            'serviceCharge': float(self.service_charge),
            'showPriceBreakdown': self.show_price_breakdown
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
        self.kitchen_display_enabled = data.get('kitchenDisplayEnabled', self.kitchen_display_enabled)
        self.show_price_breakdown = data.get('showPriceBreakdown', self.show_price_breakdown)
        self.total_tables = data.get('totalTables', self.total_tables)
        self.app_url = data.get('appUrl', self.app_url)
        self.updated_at = datetime.utcnow


class DailyCounter(db.Model):
    """Daily counter for takeaway queue numbers. Resets each day."""
    __tablename__ = 'daily_counters'

    id = db.Column(db.Integer, primary_key=True)
    counter_date = db.Column(db.Date, unique=True, nullable=False)
    last_queue_number = db.Column(db.Integer, default=0)

    @classmethod
    def get_next_queue_number(cls):
        """Get the next takeaway queue number for today."""
        today = date.today()
        counter = cls.query.filter_by(counter_date=today).first()
        if not counter:
            counter = cls(counter_date=today, last_queue_number=0)
            db.session.add(counter)
        counter.last_queue_number += 1
        db.session.flush()
        return counter.last_queue_number


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)
    resource_type = db.Column(db.String(50))
    resource_id = db.Column(db.Integer)
    details = db.Column(db.Text)
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
