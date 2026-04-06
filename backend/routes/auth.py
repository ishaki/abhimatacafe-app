from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, UserSession
from datetime import datetime, timedelta
from utils.validators import sanitize_string, validate_role
from utils.audit import log_audit

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        
        # Create session record
        session = UserSession(
            user_id=user.id,
            session_token=access_token[:100],  # Store first 100 chars as identifier
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        db.session.add(session)
        db.session.commit()
        
        # Log successful login
        log_audit(user.id, 'login', details=f"Successful login from {request.remote_addr}")
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Invalidate current session"""
    current_user_id = get_jwt_identity()
    
    # Mark all active sessions as inactive
    UserSession.query.filter_by(
        user_id=int(current_user_id),
        is_active=True
    ).update({'is_active': False})
    
    db.session.commit()
    
    # Log logout
    log_audit(current_user_id, 'logout', details=f"User logged out from {request.remote_addr}")
    
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    """Refresh token - extends session by another 24 hours"""
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    
    # Update session expiration
    UserSession.query.filter_by(
        user_id=int(current_user_id),
        is_active=True
    ).update({'expires_at': datetime.utcnow() + timedelta(days=1)})
    
    db.session.commit()
    
    return jsonify({'access_token': access_token}), 200

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    # Sanitize and validate input
    username = sanitize_string(data.get('username', ''), max_length=50)
    password = data.get('password', '')
    role_input = data.get('role', '')
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    is_valid, role = validate_role(role_input)
    if not is_valid:
        return jsonify({'error': role}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    user = User(username=username, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    # Log user creation
    log_audit(current_user.id, 'create_user', 'user', user.id, 
             f"Created user: {username} with role: {role}")
    
    return jsonify(user.to_dict()), 201
