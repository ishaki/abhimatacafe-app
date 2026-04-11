from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit
from models import db, Order, OrderItem, MenuItem, Settings, User
from datetime import datetime
from socketio_instance import get_socketio
from utils.validators import (
    validate_table_number, validate_quantity,
    sanitize_string, validate_phone, validate_order_type
)
from utils.audit import log_audit

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    status = request.args.get('status')
    source = request.args.get('source')  # 'staff', 'customer', or None (all)
    query = Order.query

    if status:
        query = query.filter_by(status=status)

    if source:
        query = query.filter_by(order_source=source)

    # Role-based filtering
    if current_user.role == 'kitchen':
        query = query.filter_by(status='pending')
    elif current_user.role == 'cashier':
        # Cashier sees pending (orders they may have just created or
        # need to mark complete) and complete (ready for payment)
        query = query.filter(Order.status.in_(['pending', 'complete']))
    # Waitress and admin can see all orders (no additional filtering)

    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders]), 200


@orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress', 'cashier']:
        return jsonify({'error': 'Order creation requires waitress, cashier, or admin access'}), 403

    data = request.get_json()

    # Validate table number
    is_valid, result = validate_table_number(data.get('table_number'))
    if not is_valid:
        return jsonify({'error': result}), 400
    table_number = result

    # Sanitize customer info
    customer_name = sanitize_string(data.get('customer_name', ''), max_length=100)
    customer_phone_input = data.get('customer_phone', '')
    is_valid, customer_phone = validate_phone(customer_phone_input)
    if not is_valid:
        return jsonify({'error': customer_phone}), 400

    # Validate order type
    order_type_input = data.get('order_type', 'dine_in')
    is_valid, order_type = validate_order_type(order_type_input)
    if not is_valid:
        return jsonify({'error': order_type}), 400

    items = data.get('items', [])
    if not items or len(items) > 50:
        return jsonify({'error': 'Must have 1-50 items'}), 400

    # Validate each item
    for item in items:
        is_valid, qty = validate_quantity(item.get('quantity', 0))
        if not is_valid:
            return jsonify({'error': qty}), 400
        item['quantity'] = qty

        # Sanitize notes
        item['notes'] = sanitize_string(item.get('notes', ''), max_length=500, allow_special=True)

    # Calculate total amount
    total_amount = 0
    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        if not menu_item:
            return jsonify({'error': f'Menu item {item["menu_item_id"]} not found'}), 400
        total_amount += menu_item.price * item['quantity']

    # Create order (staff orders go directly to pending)
    order = Order(
        table_number=table_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        order_type=order_type,
        order_source='staff',
        total_amount=total_amount
    )

    db.session.add(order)
    db.session.flush()  # Get the order ID

    # Create order items (staff items are auto-approved)
    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=menu_item.price * item['quantity'],
            item_status='approved'
        )
        db.session.add(order_item)

    db.session.commit()

    # Emit WebSocket event for real-time updates
    socketio = get_socketio()
    socketio.emit('new_order', order.to_dict())

    return jsonify(order.to_dict()), 201


@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify(order.to_dict()), 200


@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    new_status = data.get('status')

    if not new_status:
        return jsonify({'error': 'Status required'}), 400

    # Role-based status updates
    if current_user.role == 'kitchen' and new_status == 'complete':
        order.status = 'complete'
        order.completed_at = datetime.utcnow()
    elif current_user.role == 'cashier' and new_status == 'paid':
        order.status = 'paid'
        order.paid_at = datetime.utcnow()
        order.payment_method = data.get('payment_method')
    else:
        return jsonify({'error': 'Invalid status update for your role'}), 403

    db.session.commit()

    # Emit WebSocket event for real-time updates
    socketio = get_socketio()
    socketio.emit('order_updated', order.to_dict())

    # Notify customer if this is a customer order
    if order.order_source == 'customer':
        room = _get_customer_room(order)
        if room:
            socketio.emit('order_status_update', {
                'order_id': order.id,
                'status': order.status
            }, room=room)

    return jsonify(order.to_dict()), 200


# --- Mark order as served (waitress flow when kitchen display is disabled) ---

@orders_bp.route('/<int:order_id>/serve', methods=['PATCH'])
@jwt_required()
def mark_order_served(order_id):
    """Mark a pending order as complete (served).

    Used when kitchen display is disabled and the waitress brings food
    out herself. Role gating:
      - admin / kitchen: always allowed
      - waitress: only when kitchen_display_enabled is False
      - cashier: not allowed (use /billing/orders/<id>/complete instead)
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    role = current_user.role
    if role not in ('admin', 'kitchen', 'waitress', 'cashier'):
        return jsonify({'error': 'Not allowed for your role'}), 403

    # Waitress and cashier can only mark orders served when the kitchen
    # display is disabled (otherwise the kitchen owns this transition).
    if role in ('waitress', 'cashier'):
        settings = Settings.get_settings()
        if settings.kitchen_display_enabled:
            return jsonify({
                'error': 'Kitchen display is enabled. Orders are completed from the kitchen.'
            }), 400

    order = Order.query.get_or_404(order_id)

    if order.status != 'pending':
        return jsonify({'error': f'Cannot serve order with status "{order.status}"'}), 400

    order.status = 'complete'
    order.completed_at = datetime.utcnow()
    db.session.commit()

    socketio = get_socketio()
    socketio.emit('order_updated', order.to_dict())

    # Notify customer if this is a customer order
    if order.order_source == 'customer':
        room = _get_customer_room(order)
        if room:
            socketio.emit('order_status_update', {
                'order_id': order.id,
                'status': 'complete',
                'message': 'Your order is ready!'
            }, room=room)

    log_audit(current_user.id, 'mark_served', 'order', order.id,
              f"{role} marked order #{order.id} as served")

    return jsonify(order.to_dict()), 200


# --- Approval endpoints for customer orders ---

@orders_bp.route('/<int:order_id>/approve', methods=['POST'])
@jwt_required()
def approve_order(order_id):
    """Approve a customer order (waitress/admin). Moves to pending → kitchen sees it."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress or admin access required'}), 403

    order = Order.query.get_or_404(order_id)

    if order.status != 'waiting_approval':
        return jsonify({'error': f'Cannot approve order with status "{order.status}"'}), 400

    # Approve order
    order.status = 'pending'

    # Approve all waiting items
    for item in order.items:
        if item.item_status == 'waiting_approval':
            item.item_status = 'approved'

    db.session.commit()

    log_audit(current_user.id, 'approve_customer_order', 'order', order.id,
              f"Approved customer order #{order.id} from {order.customer_name}")

    socketio = get_socketio()

    # Notify kitchen (existing event)
    socketio.emit('new_order', order.to_dict())

    # Notify customer
    room = _get_customer_room(order)
    if room:
        socketio.emit('order_approved', {
            'order_id': order.id,
            'status': 'pending',
            'message': 'Your order has been approved and is being prepared!'
        }, room=room)

    return jsonify({
        'message': 'Order approved',
        'order': order.to_dict()
    }), 200


@orders_bp.route('/<int:order_id>/reject', methods=['POST'])
@jwt_required()
def reject_order(order_id):
    """Reject a customer order with a reason."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress or admin access required'}), 403

    order = Order.query.get_or_404(order_id)

    if order.status != 'waiting_approval':
        return jsonify({'error': f'Cannot reject order with status "{order.status}"'}), 400

    data = request.get_json()
    reason = sanitize_string(data.get('reason', ''), max_length=500, allow_special=True)

    if not reason or len(reason) < 1:
        return jsonify({'error': 'Rejection reason is required'}), 400

    # Reject order
    order.status = 'rejected'
    order.rejection_reason = reason

    # Reject all waiting items
    for item in order.items:
        if item.item_status == 'waiting_approval':
            item.item_status = 'rejected'

    db.session.commit()

    log_audit(current_user.id, 'reject_customer_order', 'order', order.id,
              f"Rejected customer order #{order.id}: {reason}")

    socketio = get_socketio()

    # Notify customer
    room = _get_customer_room(order)
    if room:
        socketio.emit('order_rejected', {
            'order_id': order.id,
            'status': 'rejected',
            'reason': reason
        }, room=room)

    return jsonify({
        'message': 'Order rejected',
        'order': order.to_dict()
    }), 200


@orders_bp.route('/<int:order_id>/approve-items', methods=['POST'])
@jwt_required()
def approve_new_items(order_id):
    """Approve new items added to an already-approved order."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress or admin access required'}), 403

    order = Order.query.get_or_404(order_id)

    # Order must already be approved (pending or complete)
    if order.status not in ('pending', 'complete'):
        return jsonify({'error': 'Order must be in pending or complete status'}), 400

    # Approve all waiting items
    approved_items = []
    for item in order.items:
        if item.item_status == 'waiting_approval':
            item.item_status = 'approved'
            approved_items.append(item)

    if not approved_items:
        return jsonify({'error': 'No items waiting for approval'}), 400

    db.session.commit()

    log_audit(current_user.id, 'approve_customer_items', 'order', order.id,
              f"Approved {len(approved_items)} new items for order #{order.id}")

    socketio = get_socketio()

    # Notify kitchen about new approved items
    socketio.emit('order_items_added', {
        'order_id': order.id,
        'new_items': [item.to_dict() for item in approved_items],
        'updated_total': order.total_amount
    })

    # Notify customer
    room = _get_customer_room(order)
    if room:
        socketio.emit('order_approved', {
            'order_id': order.id,
            'status': order.status,
            'message': 'Your new items have been approved!'
        }, room=room)

    return jsonify({
        'message': f'{len(approved_items)} items approved',
        'order': order.to_dict()
    }), 200


# --- Waiting approval list for staff ---

@orders_bp.route('/pending-approval', methods=['GET'])
@jwt_required()
def get_pending_approval():
    """Get all orders waiting for approval (waitress/admin)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress or admin access required'}), 403

    # Orders with waiting_approval status
    waiting_orders = Order.query.filter_by(
        status='waiting_approval'
    ).order_by(Order.created_at.asc()).all()

    # Orders with approved status but have items waiting approval
    orders_with_pending_items = Order.query.filter(
        Order.status.in_(['pending', 'complete']),
        Order.order_source == 'customer'
    ).order_by(Order.created_at.asc()).all()

    pending_item_orders = []
    for order in orders_with_pending_items:
        has_waiting = any(item.item_status == 'waiting_approval' for item in order.items)
        if has_waiting:
            pending_item_orders.append(order)

    return jsonify({
        'waiting_approval': [o.to_dict() for o in waiting_orders],
        'pending_items': [o.to_dict() for o in pending_item_orders]
    }), 200


# --- Existing endpoints ---

@orders_bp.route('/<int:order_id>/items', methods=['POST'])
@jwt_required()
def add_items_to_order(order_id):
    """Add new items to an existing order"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress', 'cashier']:
        return jsonify({'error': 'Order edit requires waitress, cashier, or admin access'}), 403

    order = Order.query.get_or_404(order_id)

    # Only allow adding items to pending orders
    if order.status != 'pending':
        return jsonify({'error': 'Can only add items to pending orders'}), 400

    data = request.get_json()
    items = data.get('items', [])

    if not items:
        return jsonify({'error': 'Items required'}), 400

    # Calculate additional amount
    additional_amount = 0
    new_order_items = []

    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        if not menu_item:
            return jsonify({'error': f'Menu item {item["menu_item_id"]} not found'}), 400

        item_total = menu_item.price * item['quantity']
        additional_amount += item_total

        # Staff-added items are auto-approved
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=item_total,
            is_new_addition=True,
            item_status='approved'
        )
        new_order_items.append(order_item)
        db.session.add(order_item)

    # Update order total
    order.total_amount += additional_amount

    db.session.commit()

    # Emit WebSocket event for kitchen display (only new items)
    socketio = get_socketio()
    socketio.emit('order_items_added', {
        'order_id': order.id,
        'new_items': [item.to_dict() for item in new_order_items],
        'updated_total': order.total_amount
    })

    return jsonify({
        'message': 'Items added successfully',
        'order': order.to_dict(),
        'new_items': [item.to_dict() for item in new_order_items]
    }), 200


@orders_bp.route('/<int:order_id>/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_order_item(order_id, item_id):
    """Delete an item from an existing order"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if current_user.role not in ['admin', 'waitress', 'cashier']:
        return jsonify({'error': 'Order edit requires waitress, cashier, or admin access'}), 403

    order = Order.query.get_or_404(order_id)
    order_item = OrderItem.query.filter_by(id=item_id, order_id=order_id).first()

    if not order_item:
        return jsonify({'error': 'Order item not found'}), 404

    # Only admin can delete completed items, waitress can only delete new additions
    if not order_item.is_new_addition and current_user.role != 'admin':
        return jsonify({'error': 'Only admin can delete completed items'}), 403

    # Only allow deleting items from pending orders
    if order.status != 'pending':
        return jsonify({'error': 'Can only delete items from pending orders'}), 400

    # Update order total
    order.total_amount -= order_item.subtotal

    # Delete the order item
    db.session.delete(order_item)
    db.session.commit()

    # Emit WebSocket event for real-time updates
    socketio = get_socketio()
    socketio.emit('order_item_deleted', {
        'order_id': order.id,
        'deleted_item_id': item_id,
        'updated_total': order.total_amount
    })

    return jsonify({
        'message': 'Order item deleted successfully',
        'order': order.to_dict()
    }), 200


def _get_customer_room(order):
    """Get the WebSocket room name for a customer order."""
    if order.queue_number:
        return f'takeaway_{order.queue_number}'
    if order.table_number:
        return f'table_{order.table_number}'
    return None
