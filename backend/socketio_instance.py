from flask_socketio import SocketIO

# Global socketio instance that will be initialized in app.py
socketio = None

def init_socketio(app):
    global socketio
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    return socketio

def get_socketio():
    return socketio
