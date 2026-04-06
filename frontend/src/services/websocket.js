import { io } from 'socket.io-client'

class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
  }

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server')
        this.isConnected = true
      })

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server')
        this.isConnected = false
      })

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        this.isConnected = false
      })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    }
  }
}

export default new WebSocketService()
