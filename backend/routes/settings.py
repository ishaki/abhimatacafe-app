from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Settings, User
from datetime import datetime

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    """Get current application settings"""
    try:
        settings = Settings.get_settings()
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve settings'}), 500

@settings_bp.route('', methods=['POST'])
@jwt_required()
def update_settings():
    """Update application settings (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Only admin can update settings
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if 'taxRate' in data and (data['taxRate'] < 0 or data['taxRate'] > 100):
            return jsonify({'error': 'Tax rate must be between 0 and 100'}), 400
        
        if 'serviceCharge' in data and (data['serviceCharge'] < 0 or data['serviceCharge'] > 100):
            return jsonify({'error': 'Service charge must be between 0 and 100'}), 400
        
        # Get current settings
        settings = Settings.get_settings()
        
        # Update settings
        settings.update_from_dict(data)
        
        # Save to database
        db.session.commit()
        
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': settings.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update settings'}), 500

@settings_bp.route('/reset', methods=['POST'])
@jwt_required()
def reset_settings():
    """Reset settings to default values (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Only admin can reset settings
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        # Get current settings
        settings = Settings.get_settings()
        
        # Reset to default values
        settings.cafe_name = 'Abhimata Cafe'
        settings.cafe_address = ''
        settings.cafe_phone = ''
        settings.cafe_email = ''
        settings.currency = 'IDR'
        settings.tax_rate = 11.0
        settings.service_charge = 5.0
        settings.auto_print = False
        settings.sound_notifications = True
        settings.dark_mode = False
        settings.updated_at = datetime.utcnow()
        
        # Save to database
        db.session.commit()
        
        return jsonify({
            'message': 'Settings reset to default successfully',
            'settings': settings.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to reset settings'}), 500
