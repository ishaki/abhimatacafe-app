import io
import zipfile
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (
    db, Settings, User,
    Order, OrderItem, Expense, DailyCounter, CustomerSession,
)
from datetime import datetime
from utils.audit import log_audit

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

        if 'totalTables' in data:
            try:
                total = int(data['totalTables'])
                if total < 1 or total > 200:
                    return jsonify({'error': 'Total tables must be between 1 and 200'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid total tables value'}), 400

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
        settings.kitchen_display_enabled = True
        settings.show_price_breakdown = True
        settings.total_tables = 10
        settings.app_url = ''
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


@settings_bp.route('/reset-transactions', methods=['POST'])
@jwt_required()
def reset_transactions():
    """Clear transactional data while keeping users, menu, settings.

    Wipes: orders, order_items (cascade), expenses, daily_counters,
    customer_sessions.
    Keeps: users, user_sessions, menu_items, settings, audit_logs.

    Admin only. Requires `confirm: "RESET"` in the request body so a
    misclick or repeated request can't accidentally wipe data.
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json(silent=True) or {}
    if data.get('confirm') != 'RESET':
        return jsonify({
            'error': 'Confirmation required. Send {"confirm": "RESET"} in the request body.'
        }), 400

    try:
        # Count what we're about to delete so we can return a useful summary
        counts = {
            'orders': Order.query.count(),
            'order_items': OrderItem.query.count(),
            'expenses': Expense.query.count(),
            'daily_counters': DailyCounter.query.count(),
            'customer_sessions': CustomerSession.query.count(),
        }

        # Delete in dependency-safe order. order_items cascades from orders,
        # but we delete it explicitly first for clarity and to make the
        # row-count summary accurate. customer_sessions has an FK to orders,
        # so it must go before orders.
        CustomerSession.query.delete(synchronize_session=False)
        OrderItem.query.delete(synchronize_session=False)
        Order.query.delete(synchronize_session=False)
        Expense.query.delete(synchronize_session=False)
        DailyCounter.query.delete(synchronize_session=False)

        db.session.commit()

        # Audit log AFTER the wipe so the entry survives. audit_logs is
        # intentionally kept (it's a security record, not transactional).
        log_audit(
            current_user.id,
            'reset_transactions',
            'database',
            None,
            f"Cleared transactional data: {counts}"
        )

        return jsonify({
            'message': 'Transactional data cleared',
            'deleted': counts,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to reset transactions'}), 500


# --- QR Code Generation ---

def _generate_qr_png(data_url, label):
    """Generate a QR code PNG with a label. Returns bytes."""
    import qrcode
    from PIL import Image, ImageDraw, ImageFont

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data_url)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    qr_width, qr_height = qr_img.size

    # Create canvas with label space
    label_height = 50
    canvas_width = qr_width
    canvas_height = qr_height + label_height

    canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
    canvas.paste(qr_img, (0, 0))

    # Draw label text
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except (IOError, OSError):
        font = ImageFont.load_default()

    # Center the label
    bbox = draw.textbbox((0, 0), label, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (canvas_width - text_width) // 2
    text_y = qr_height + 10
    draw.text((text_x, text_y), label, fill='black', font=font)

    # Convert to bytes
    buffer = io.BytesIO()
    canvas.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


@settings_bp.route('/qr/<int:table_number>', methods=['GET'])
@jwt_required()
def generate_table_qr(table_number):
    """Generate QR code for a specific table (Admin only)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    settings = Settings.get_settings()

    if table_number < 1 or table_number > settings.total_tables:
        return jsonify({'error': f'Table number must be between 1 and {settings.total_tables}'}), 400

    app_url = settings.app_url.rstrip('/')
    if not app_url:
        return jsonify({'error': 'App URL not configured. Set it in Settings first.'}), 400

    url = f'{app_url}/table/{table_number}'
    label = f'Table {table_number}'
    buffer = _generate_qr_png(url, label)

    return send_file(buffer, mimetype='image/png', download_name=f'table_{table_number}_qr.png')


@settings_bp.route('/qr/takeaway', methods=['GET'])
@jwt_required()
def generate_takeaway_qr():
    """Generate QR code for takeaway orders (Admin only)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    settings = Settings.get_settings()

    app_url = settings.app_url.rstrip('/')
    if not app_url:
        return jsonify({'error': 'App URL not configured. Set it in Settings first.'}), 400

    url = f'{app_url}/order/takeaway'
    label = 'Takeaway Order'
    buffer = _generate_qr_png(url, label)

    return send_file(buffer, mimetype='image/png', download_name='takeaway_qr.png')


@settings_bp.route('/qr/all', methods=['GET'])
@jwt_required()
def generate_all_qr():
    """Generate all QR codes as a ZIP file (Admin only)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    settings = Settings.get_settings()

    app_url = settings.app_url.rstrip('/')
    if not app_url:
        return jsonify({'error': 'App URL not configured. Set it in Settings first.'}), 400

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Generate table QR codes
        for table_num in range(1, settings.total_tables + 1):
            url = f'{app_url}/table/{table_num}'
            label = f'Table {table_num}'
            png_buffer = _generate_qr_png(url, label)
            zf.writestr(f'table_{table_num}_qr.png', png_buffer.getvalue())

        # Generate takeaway QR code
        url = f'{app_url}/order/takeaway'
        label = 'Takeaway Order'
        png_buffer = _generate_qr_png(url, label)
        zf.writestr('takeaway_qr.png', png_buffer.getvalue())

    zip_buffer.seek(0)

    return send_file(
        zip_buffer,
        mimetype='application/zip',
        download_name='abhimata_cafe_qr_codes.zip'
    )
