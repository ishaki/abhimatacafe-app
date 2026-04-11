import uuid
from functools import wraps
from flask import Blueprint, request, jsonify
from models import db, CustomerSession, MenuItem, Order, OrderItem, Settings, DailyCounter
from datetime import datetime, timedelta
from socketio_instance import get_socketio
from utils.validators import sanitize_string, validate_phone, validate_quantity, validate_order_type

customer_bp = Blueprint('customer', __name__)


# --- Decorator: require valid customer session ---

def customer_session_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('X-Customer-Token')
        if not token:
            return jsonify({'error': 'Customer session token required'}), 401

        session = CustomerSession.query.filter_by(session_token=token, is_active=True).first()
        if not session:
            return jsonify({'error': 'Invalid or expired session'}), 401

        if session.is_expired():
            session.is_active = False
            db.session.commit()
            return jsonify({'error': 'Session has expired. Please scan the QR code again.'}), 401

        request.customer_session = session
        return f(*args, **kwargs)
    return decorated


# --- Session endpoints ---

@customer_bp.route('/session', methods=['POST'])
def create_session():
    """Create a guest customer session."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    # Validate customer name (required)
    customer_name = sanitize_string(data.get('customer_name', ''), max_length=100)
    if len(customer_name) < 1:
        return jsonify({'error': 'Name is required'}), 400

    # Validate phone (optional)
    customer_phone_input = data.get('customer_phone', '')
    if customer_phone_input:
        is_valid, customer_phone = validate_phone(customer_phone_input)
        if not is_valid:
            return jsonify({'error': customer_phone}), 400
    else:
        customer_phone = ''

    # Validate order type
    order_type_input = data.get('order_type', 'dine_in')
    is_valid, order_type = validate_order_type(order_type_input)
    if not is_valid:
        return jsonify({'error': order_type}), 400

    # Validate table number (required for dine_in, null for takeaway)
    table_number = data.get('table_number')
    is_takeaway = (table_number is None) or (order_type == 'take_away' and table_number is None)

    if not is_takeaway:
        settings = Settings.get_settings()
        try:
            table_number = int(table_number)
            if table_number < 1 or table_number > settings.total_tables:
                return jsonify({'error': f'Table number must be between 1 and {settings.total_tables}'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid table number'}), 400

    # Generate session token
    session_token = str(uuid.uuid4())

    session = CustomerSession(
        table_number=table_number if not is_takeaway else None,
        order_type=order_type,
        customer_name=customer_name,
        customer_phone=customer_phone,
        session_token=session_token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.session.add(session)
    db.session.commit()

    return jsonify({
        'session_token': session_token,
        'session': session.to_dict()
    }), 201


@customer_bp.route('/session', methods=['GET'])
@customer_session_required
def get_session():
    """Validate and return current session info."""
    session = request.customer_session
    return jsonify({'session': session.to_dict()}), 200


# --- Public menu endpoint ---

@customer_bp.route('/menu', methods=['GET'])
def get_public_menu():
    """Public menu — returns only available items grouped by category."""
    items = MenuItem.query.filter_by(status='available').order_by(MenuItem.category, MenuItem.name).all()

    # Group by category
    categories = {}
    for item in items:
        cat = item.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item.to_public_dict())

    return jsonify({
        'categories': categories,
        'items': [item.to_public_dict() for item in items]
    }), 200


# --- Public settings endpoint ---

@customer_bp.route('/settings', methods=['GET'])
def get_public_settings():
    """Public settings for customer UI (cafe name, currency, tax display).

    Never cache this: admin changes to tax rate / service charge must be
    reflected immediately on customer devices. Without these headers, mobile
    browsers (especially Safari) cache the response and show stale values
    long after the admin has updated Settings.
    """
    settings = Settings.get_settings()
    response = jsonify(settings.to_public_dict())
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response, 200


# --- Customer order endpoints ---

@customer_bp.route('/orders', methods=['POST'])
@customer_session_required
def create_customer_order():
    """Submit a new customer order. One order per session."""
    session = request.customer_session

    # Check if session already has an active order
    if session.order_id:
        existing = Order.query.get(session.order_id)
        if existing and existing.status not in ('paid', 'rejected'):
            return jsonify({
                'error': 'You already have an active order. Use "Add Items" to add more.',
                'order_id': session.order_id
            }), 409

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    items = data.get('items', [])
    if not items or len(items) > 50:
        return jsonify({'error': 'Must have 1-50 items'}), 400

    # Validate each item
    for item in items:
        if 'menu_item_id' not in item:
            return jsonify({'error': 'menu_item_id required for each item'}), 400
        is_valid, qty = validate_quantity(item.get('quantity', 0))
        if not is_valid:
            return jsonify({'error': qty}), 400
        item['quantity'] = qty
        item['notes'] = sanitize_string(item.get('notes', ''), max_length=500, allow_special=True)

    # Calculate total from DB prices (never trust client)
    total_amount = 0
    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        if not menu_item:
            return jsonify({'error': f'Menu item {item["menu_item_id"]} not found'}), 400
        if menu_item.status != 'available':
            return jsonify({'error': f'"{menu_item.name}" is currently unavailable'}), 400
        total_amount += menu_item.price * item['quantity']

    # Generate queue number for takeaway
    queue_number = None
    if session.order_type == 'take_away' or session.table_number is None:
        queue_number = DailyCounter.get_next_queue_number()

    # Create order with waiting_approval status
    order = Order(
        table_number=session.table_number,
        customer_name=session.customer_name,
        customer_phone=session.customer_phone,
        order_type=session.order_type,
        status='waiting_approval',
        order_source='customer',
        queue_number=queue_number,
        customer_session_id=session.id,
        total_amount=total_amount
    )

    db.session.add(order)
    db.session.flush()

    # Create order items with waiting_approval status
    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=menu_item.price * item['quantity'],
            item_status='waiting_approval'
        )
        db.session.add(order_item)

    # Link order to session
    session.order_id = order.id

    db.session.commit()

    # Notify staff via WebSocket
    socketio = get_socketio()
    socketio.emit('customer_order_pending', {
        'order': order.to_dict(),
        'source': 'customer',
        'table_number': session.table_number,
        'queue_number': queue_number,
        'customer_name': session.customer_name
    })

    return jsonify({
        'message': 'Order submitted! Waiting for staff approval.',
        'order': order.to_dict(),
        'queue_number': queue_number
    }), 201


@customer_bp.route('/orders/<int:order_id>', methods=['GET'])
@customer_session_required
def get_customer_order(order_id):
    """Track order status. Customer can only see their own order."""
    session = request.customer_session

    order = Order.query.get_or_404(order_id)

    # Verify order belongs to this session
    if order.customer_session_id != session.id:
        return jsonify({'error': 'Order not found'}), 404

    return jsonify({'order': order.to_dict()}), 200


@customer_bp.route('/orders/<int:order_id>/items', methods=['POST'])
@customer_session_required
def add_items_to_customer_order(order_id):
    """Add more items to an existing customer order."""
    session = request.customer_session

    order = Order.query.get_or_404(order_id)

    # Verify order belongs to this session
    if order.customer_session_id != session.id:
        return jsonify({'error': 'Order not found'}), 404

    # Can't add to rejected or paid orders
    if order.status in ('rejected', 'paid'):
        return jsonify({'error': f'Cannot add items to a {order.status} order'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    items = data.get('items', [])
    if not items or len(items) > 50:
        return jsonify({'error': 'Must have 1-50 items'}), 400

    # Validate items
    for item in items:
        if 'menu_item_id' not in item:
            return jsonify({'error': 'menu_item_id required for each item'}), 400
        is_valid, qty = validate_quantity(item.get('quantity', 0))
        if not is_valid:
            return jsonify({'error': qty}), 400
        item['quantity'] = qty
        item['notes'] = sanitize_string(item.get('notes', ''), max_length=500, allow_special=True)

    # Calculate additional amount from DB prices
    additional_amount = 0
    new_order_items = []

    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        if not menu_item:
            return jsonify({'error': f'Menu item {item["menu_item_id"]} not found'}), 400
        if menu_item.status != 'available':
            return jsonify({'error': f'"{menu_item.name}" is currently unavailable'}), 400

        item_total = menu_item.price * item['quantity']
        additional_amount += item_total

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=item_total,
            is_new_addition=True,
            item_status='waiting_approval'
        )
        new_order_items.append(order_item)
        db.session.add(order_item)

    # Update order total
    order.total_amount += additional_amount

    db.session.commit()

    # Notify staff
    socketio = get_socketio()
    socketio.emit('customer_items_pending', {
        'order_id': order.id,
        'new_items': [item.to_dict() for item in new_order_items],
        'updated_total': order.total_amount,
        'table_number': session.table_number,
        'queue_number': order.queue_number,
        'customer_name': session.customer_name
    })

    return jsonify({
        'message': 'New items submitted! Waiting for staff approval.',
        'order': order.to_dict(),
        'new_items': [item.to_dict() for item in new_order_items]
    }), 200
