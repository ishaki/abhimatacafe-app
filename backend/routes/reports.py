from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, OrderItem, MenuItem, Expense, User
from datetime import datetime, date, timedelta
from sqlalchemy import func, extract

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/daily', methods=['GET'])
@jwt_required()
def get_daily_report():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    report_date = request.args.get('date')
    if report_date:
        try:
            report_date = datetime.strptime(report_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        report_date = date.today()
    
    # Get orders for the date
    orders = Order.query.filter(
        func.date(Order.created_at) == report_date,
        Order.status == 'paid'
    ).all()
    
    # Calculate totals
    total_sales = sum(order.total_amount for order in orders)
    total_orders = len(orders)
    
    # Get order breakdown by category
    order_items = OrderItem.query.join(Order).join(MenuItem).filter(
        func.date(Order.created_at) == report_date,
        Order.status == 'paid'
    ).all()
    
    category_breakdown = {}
    for item in order_items:
        category = item.menu_item.category
        if category not in category_breakdown:
            category_breakdown[category] = {'count': 0, 'revenue': 0}
        category_breakdown[category]['count'] += item.quantity
        category_breakdown[category]['revenue'] += item.subtotal
    
    # Get expenses for the date
    expenses = Expense.query.filter_by(date=report_date).all()
    total_expenses = sum(expense.amount for expense in expenses)
    
    # Calculate net profit
    net_profit = total_sales - total_expenses
    
    return jsonify({
        'date': report_date.isoformat(),
        'total_sales': total_sales,
        'total_orders': total_orders,
        'category_breakdown': category_breakdown,
        'total_expenses': total_expenses,
        'net_profit': net_profit
    }), 200

@reports_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_report():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    week_start = request.args.get('week_start')
    if week_start:
        try:
            week_start = datetime.strptime(week_start, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        # Default to current week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    week_end = week_start + timedelta(days=6)
    
    # Get orders for the week
    orders = Order.query.filter(
        func.date(Order.created_at) >= week_start,
        func.date(Order.created_at) <= week_end,
        Order.status == 'paid'
    ).all()
    
    # Calculate totals
    total_sales = sum(order.total_amount for order in orders)
    total_orders = len(orders)
    
    # Get expenses for the week
    expenses = Expense.query.filter(
        Expense.date >= week_start,
        Expense.date <= week_end
    ).all()
    total_expenses = sum(expense.amount for expense in expenses)
    
    # Calculate net profit
    net_profit = total_sales - total_expenses
    
    return jsonify({
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'total_sales': total_sales,
        'total_orders': total_orders,
        'total_expenses': total_expenses,
        'net_profit': net_profit
    }), 200

@reports_bp.route('/monthly', methods=['GET'])
@jwt_required()
def get_monthly_report():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'cashier']:
        return jsonify({'error': 'Admin or Cashier access required'}), 403
    
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    
    # Get orders for the month
    orders = Order.query.filter(
        extract('year', Order.created_at) == year,
        extract('month', Order.created_at) == month,
        Order.status == 'paid'
    ).all()
    
    # Calculate totals
    total_sales = sum(order.total_amount for order in orders)
    total_orders = len(orders)
    
    # Get expenses for the month
    expenses = Expense.query.filter(
        extract('year', Expense.date) == year,
        extract('month', Expense.date) == month
    ).all()
    total_expenses = sum(expense.amount for expense in expenses)
    
    # Calculate net profit
    net_profit = total_sales - total_expenses
    
    return jsonify({
        'year': year,
        'month': month,
        'total_sales': total_sales,
        'total_orders': total_orders,
        'total_expenses': total_expenses,
        'net_profit': net_profit
    }), 200
