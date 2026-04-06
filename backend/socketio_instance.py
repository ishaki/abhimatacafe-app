import os
from flask_socketio import SocketIO

# Global socketio instance that will be initialized in app.py
socketio = None

def init_socketio(app):
    global socketio
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    allowed_origins = [origin.strip() for origin in allowed_origins]
    socketio = SocketIO(app, cors_allowed_origins=allowed_origins, async_mode='eventlet')
    return socketio

def get_socketio():
    return socketio
