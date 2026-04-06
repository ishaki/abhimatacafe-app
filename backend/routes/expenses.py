from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Expense, User
from datetime import datetime, date

expenses_bp = Blueprint('expenses', __name__)

@expenses_bp.route('/', methods=['GET'])
@jwt_required()
def get_expenses():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Expense.query
    
    if start_date:
        query = query.filter(Expense.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Expense.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    expenses = query.order_by(Expense.date.desc()).all()
    return jsonify([expense.to_dict() for expense in expenses]), 200

@expenses_bp.route('/', methods=['POST'])
@jwt_required()
def create_expense():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    data = request.get_json()
    expense_date = data.get('date')
    item = data.get('item')
    description = data.get('description')
    amount = data.get('amount')
    
    if not expense_date or not item or not amount:
        return jsonify({'error': 'Date, item, and amount required'}), 400
    
    try:
        expense_date = datetime.strptime(expense_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    expense = Expense(
        date=expense_date,
        item=item,
        description=description,
        amount=amount,
        recorded_by=current_user_id
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify(expense.to_dict()), 201

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    expense = Expense.query.get_or_404(expense_id)
    data = request.get_json()
    
    if 'date' in data:
        try:
            expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    expense.item = data.get('item', expense.item)
    expense.description = data.get('description', expense.description)
    expense.amount = data.get('amount', expense.amount)
    
    db.session.commit()
    
    return jsonify(expense.to_dict()), 200

@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({'message': 'Expense deleted'}), 200
