from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit
from models import db, Order, OrderItem, MenuItem, User
from datetime import datetime
from socketio_instance import get_socketio
from utils.validators import (
    validate_table_number, validate_quantity, 
    sanitize_string, validate_phone, validate_order_type
)

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    status = request.args.get('status')
    query = Order.query
    
    if status:
        query = query.filter_by(status=status)
    
    # Role-based filtering
    if current_user.role == 'kitchen':
        query = query.filter_by(status='pending')
    elif current_user.role == 'cashier':
        query = query.filter_by(status='complete')
    # Waitress and admin can see all orders (no additional filtering)
    
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders]), 200

@orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress access required'}), 403
    
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
    
    # Create order
    order = Order(
        table_number=table_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        order_type=order_type,
        total_amount=total_amount
    )
    
    db.session.add(order)
    db.session.flush()  # Get the order ID
    
    # Create order items
    for item in items:
        menu_item = MenuItem.query.get(item['menu_item_id'])
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=menu_item.price * item['quantity']
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
    
    return jsonify(order.to_dict()), 200

@orders_bp.route('/<int:order_id>/items', methods=['POST'])
@jwt_required()
def add_items_to_order(order_id):
    """Add new items to an existing order"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress access required'}), 403
    
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
        
        # Create new order item
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item['menu_item_id'],
            quantity=item['quantity'],
            notes=item.get('notes'),
            subtotal=item_total,
            is_new_addition=True  # Mark as newly added
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
    
    if current_user.role not in ['admin', 'waitress']:
        return jsonify({'error': 'Waitress access required'}), 403
    
    order = Order.query.get_or_404(order_id)
    order_item = OrderItem.query.filter_by(id=item_id, order_id=order_id).first()
    
    if not order_item:
        return jsonify({'error': 'Order item not found'}), 404
    
    # Check if the order item is marked as completed (not a new addition)
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