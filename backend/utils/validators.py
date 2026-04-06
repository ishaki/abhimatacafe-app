import re
from markupsafe import escape


def validate_table_number(table_number):
    """Validate table number (1-100)"""
    try:
        num = int(table_number)
        if 1 <= num <= 100:
            return True, num
        return False, "Table number must be between 1 and 100"
    except (ValueError, TypeError):
        return False, "Invalid table number"


def validate_quantity(quantity):
    """Validate quantity (1-50)"""
    try:
        qty = int(quantity)
        if 1 <= qty <= 50:
            return True, qty
        return False, "Quantity must be between 1 and 50"
    except (ValueError, TypeError):
        return False, "Invalid quantity"


def validate_price(price):
    """Validate price (0-10000000)"""
    try:
        p = float(price)
        if 0 <= p <= 10000000:
            return True, p
        return False, "Price must be between 0 and 10,000,000"
    except (ValueError, TypeError):
        return False, "Invalid price"


def sanitize_string(text, max_length=200, allow_special=False):
    """Sanitize and validate string input using proper HTML escaping."""
    if not text:
        return ""

    text = str(text).strip()

    # Use markupsafe for proper HTML entity escaping
    text = str(escape(text))

    if not allow_special:
        # Allow only alphanumeric, spaces, and basic punctuation
        text = re.sub(r'[^a-zA-Z0-9\s\.,\-\(\)@]', '', text)

    return text[:max_length]


def validate_phone(phone):
    """Validate phone number (Indonesian format)"""
    if not phone:
        return True, ""

    phone = re.sub(r'[^\d\+]', '', str(phone))

    if len(phone) < 10 or len(phone) > 15:
        return False, "Phone number must be 10-15 digits"

    return True, phone


def validate_role(role):
    """Validate user role"""
    valid_roles = ['admin', 'waitress', 'kitchen', 'cashier']
    if role in valid_roles:
        return True, role
    return False, f"Invalid role. Must be one of: {', '.join(valid_roles)}"


def validate_order_type(order_type):
    """Validate order type"""
    valid_types = ['dine_in', 'take_away']
    if order_type in valid_types:
        return True, order_type
    return False, f"Invalid order type. Must be one of: {', '.join(valid_types)}"


def validate_password_strength(password):
    """Validate password meets minimum strength requirements."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"
