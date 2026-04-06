from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, User
from datetime import datetime
from utils.audit import log_audit

billing_bp = Blueprint('billing', __name__)

@billing_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_completed_orders():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Cashier access required'}), 403
    
    orders = Order.query.filter_by(status='complete').order_by(Order.completed_at.asc()).all()
    return jsonify([order.to_dict() for order in orders]), 200

@billing_bp.route('/pay', methods=['POST'])
@jwt_required()
def process_payment():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Cashier access required'}), 403
    
    data = request.get_json()
    order_id = data.get('order_id')
    payment_method = data.get('payment_method')
    
    if not order_id or not payment_method:
        return jsonify({'error': 'Order ID and payment method required'}), 400
    
    if payment_method not in ['cash', 'card', 'qris']:
        return jsonify({'error': 'Invalid payment method'}), 400
    
    order = Order.query.get_or_404(order_id)
    
    if order.status != 'complete':
        return jsonify({'error': 'Order is not ready for payment'}), 400
    
    order.status = 'paid'
    order.payment_method = payment_method
    order.paid_at = datetime.utcnow()
    
    db.session.commit()
    
    # Log payment processing
    log_audit(current_user.id, 'process_payment', 'order', order.id,
             f"Payment: {payment_method}, Amount: {order.total_amount}")
    
    return jsonify(order.to_dict()), 200
