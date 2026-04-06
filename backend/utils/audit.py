from models import db, AuditLog
from flask import request

def log_audit(user_id, action, resource_type=None, resource_id=None, details=None):
    """Log audit trail for sensitive operations"""
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        print(f"Audit logging failed: {e}")
