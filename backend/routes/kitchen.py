from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, User
from datetime import datetime

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
    
    return jsonify(order.to_dict()), 200
