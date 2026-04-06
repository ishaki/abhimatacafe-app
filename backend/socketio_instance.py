import os
from flask_socketio import SocketIO, join_room, leave_room

# Global socketio instance that will be initialized in app.py
socketio = None


def init_socketio(app):
    global socketio
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    allowed_origins = [origin.strip() for origin in allowed_origins]
    # Use eventlet in production (Gunicorn), threading for local dev
    try:
        import eventlet  # noqa: F401
        async_mode = 'eventlet'
    except (ImportError, Exception):
        async_mode = 'threading'

    socketio = SocketIO(app, cors_allowed_origins=allowed_origins, async_mode=async_mode)

    # --- Socket.IO event handlers ---

    @socketio.on('connect')
    def handle_connect():
        pass

    @socketio.on('join_customer_room')
    def handle_join_customer_room(data):
        """Customer joins a room for real-time order updates.
        data: { room: 'table_5' or 'takeaway_12', session_token: '...' }
        """
        room = data.get('room')
        if room:
            join_room(room)

    @socketio.on('leave_customer_room')
    def handle_leave_customer_room(data):
        """Customer leaves their room."""
        room = data.get('room')
        if room:
            leave_room(room)

    return socketio


def get_socketio():
    return socketio
