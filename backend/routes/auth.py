from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, UserSession
from datetime import datetime, timedelta
from utils.validators import sanitize_string, validate_role, validate_password_strength
from utils.audit import log_audit

auth_bp = Blueprint('auth', __name__)

# In-memory login attempt tracker (resets on restart — acceptable for this scale)
_login_attempts = {}
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _check_lockout(username):
    """Check if account is locked out due to failed attempts."""
    record = _login_attempts.get(username)
    if not record:
        return False
    if record['locked_until'] and datetime.utcnow() < record['locked_until']:
        return True
    # Lockout expired, reset
    if record['locked_until'] and datetime.utcnow() >= record['locked_until']:
        _login_attempts.pop(username, None)
        return False
    return False


def _record_failed_attempt(username):
    """Record a failed login attempt and lock if threshold reached."""
    if username not in _login_attempts:
        _login_attempts[username] = {'count': 0, 'locked_until': None}
    _login_attempts[username]['count'] += 1
    if _login_attempts[username]['count'] >= MAX_ATTEMPTS:
        _login_attempts[username]['locked_until'] = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)


def _clear_attempts(username):
    """Clear failed attempts on successful login."""
    _login_attempts.pop(username, None)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Check lockout
    if _check_lockout(username):
        log_audit(None, 'login_locked', details=f"Locked account login attempt for '{username}' from {request.remote_addr}")
        return jsonify({'error': f'Account temporarily locked. Try again in {LOCKOUT_MINUTES} minutes.'}), 429

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        _clear_attempts(username)

        access_token = create_access_token(identity=str(user.id))

        # Create session record
        session = UserSession(
            user_id=user.id,
            session_token=access_token[:100],
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

    # Failed login
    _record_failed_attempt(username)
    log_audit(None, 'login_failed', details=f"Failed login for '{username}' from {request.remote_addr}")

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


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change current user's password"""
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password required'}), 400

    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401

    # Validate new password strength
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({'error': msg}), 400

    user.set_password(new_password)
    db.session.commit()

    log_audit(user.id, 'change_password', 'user', user.id,
              f"Password changed from {request.remote_addr}")

    return jsonify({'message': 'Password changed successfully'}), 200


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

    # Validate password strength
    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({'error': msg}), 400

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
