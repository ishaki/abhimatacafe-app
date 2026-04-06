from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, MenuItem, User
from utils.validators import validate_price, sanitize_string

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/', methods=['GET'])
@jwt_required()
def get_menu_items():
    category = request.args.get('category')
    status = request.args.get('status')
    
    query = MenuItem.query
    if status:
        query = query.filter_by(status=status)
    if category:
        query = query.filter_by(category=category)
    
    menu_items = query.all()
    return jsonify([item.to_dict() for item in menu_items]), 200

@menu_bp.route('/', methods=['POST'])
@jwt_required()
def create_menu_item():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    # Sanitize and validate input
    name = sanitize_string(data.get('name', ''), max_length=100)
    category = sanitize_string(data.get('category', ''), max_length=50)
    description = sanitize_string(data.get('description', ''), max_length=1000, allow_special=True)
    image_url = sanitize_string(data.get('image_url', ''), max_length=255)
    
    is_valid, price = validate_price(data.get('price', 0))
    if not is_valid:
        return jsonify({'error': price}), 400
    
    rating = data.get('rating', 5)
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        rating = 5
    
    if not name or not category:
        return jsonify({'error': 'Name and category required'}), 400
    
    menu_item = MenuItem(
        name=name,
        category=category,
        description=description,
        price=price,
        rating=rating,
        image_url=image_url
    )
    
    db.session.add(menu_item)
    db.session.commit()
    
    return jsonify(menu_item.to_dict()), 201

@menu_bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_menu_item(item_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    menu_item = MenuItem.query.get_or_404(item_id)
    data = request.get_json()
    
    # Sanitize and validate input
    if 'name' in data:
        menu_item.name = sanitize_string(data.get('name'), max_length=100)
    if 'category' in data:
        menu_item.category = sanitize_string(data.get('category'), max_length=50)
    if 'description' in data:
        menu_item.description = sanitize_string(data.get('description'), max_length=1000, allow_special=True)
    if 'image_url' in data:
        menu_item.image_url = sanitize_string(data.get('image_url'), max_length=255)
    
    if 'price' in data:
        is_valid, price = validate_price(data.get('price'))
        if not is_valid:
            return jsonify({'error': price}), 400
        menu_item.price = price
    
    if 'rating' in data:
        rating = data.get('rating')
        if isinstance(rating, int) and 1 <= rating <= 5:
            menu_item.rating = rating
    
    db.session.commit()
    
    return jsonify(menu_item.to_dict()), 200

@menu_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_menu_item(item_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    menu_item = MenuItem.query.get_or_404(item_id)
    db.session.delete(menu_item)
    db.session.commit()
    
    return jsonify({'message': 'Menu item deleted'}), 200

@menu_bp.route('/<int:item_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_menu_item_status(item_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    menu_item = MenuItem.query.get_or_404(item_id)
    menu_item.status = 'unavailable' if menu_item.status == 'available' else 'available'
    
    db.session.commit()
    
    return jsonify(menu_item.to_dict()), 200
