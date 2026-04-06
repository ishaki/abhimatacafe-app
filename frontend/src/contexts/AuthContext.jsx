import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(sessionStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data)
        } catch (error) {
          console.error('Auth check failed:', error)
          // Clear invalid token
          setToken(null)
          setUser(null)
          sessionStorage.removeItem('token')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  // Auto-refresh token every 8 hours to keep session alive
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (token) {
        try {
          const response = await api.post('/auth/refresh')
          const newToken = response.data.access_token
          setToken(newToken)
          sessionStorage.setItem('token', newToken)
        } catch (error) {
          console.error('Token refresh failed:', error)
          logout()
        }
      }
    }, 8 * 60 * 60 * 1000) // 8 hours

    return () => clearInterval(refreshInterval)
  }, [token])

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      })

      const { access_token, user: userData } = response.data

      setToken(access_token)
      setUser(userData)
      sessionStorage.setItem('token', access_token)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      }
    }
  }

  const logout = async () => {
    try {
      // Call backend logout to invalidate session
      if (token) {
        await api.post('/auth/logout')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setToken(null)
      setUser(null)
      sessionStorage.removeItem('token')
    }
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
