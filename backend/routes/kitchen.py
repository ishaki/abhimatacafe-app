from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, User
from datetime import datetime
from socketio_instance import get_socketio

kitchen_bp = Blueprint('kitchen', __name__)


@kitchen_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_pending_orders():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role not in ['admin', 'kitchen']:
        return jsonify({'error': 'Kitchen access required'}), 403

    orders = Order.query.filter_by(status='pending').order_by(Order.created_at.asc()).all()
    return jsonify([order.to_dict() for order in orders]), 200


@kitchen_bp.route('/orders/<int:order_id>/complete', methods=['PATCH'])
@jwt_required()
def mark_order_complete(order_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role not in ['admin', 'kitchen']:
        return jsonify({'error': 'Kitchen access required'}), 403

    order = Order.query.get_or_404(order_id)

    if order.status != 'pending':
        return jsonify({'error': 'Order is not pending'}), 400

    order.status = 'complete'
    order.completed_at = datetime.utcnow()

    db.session.commit()

    # Notify staff via existing event
    socketio = get_socketio()
    socketio.emit('order_updated', order.to_dict())

    # Notify customer if this is a customer order
    if order.order_source == 'customer':
        room = None
        if order.queue_number:
            room = f'takeaway_{order.queue_number}'
        elif order.table_number:
            room = f'table_{order.table_number}'

        if room:
            socketio.emit('order_status_update', {
                'order_id': order.id,
                'status': 'complete',
                'message': 'Your order is ready!'
            }, room=room)

    return jsonify(order.to_dict()), 200
