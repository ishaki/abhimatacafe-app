import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const CustomerSessionContext = createContext()

export const useCustomerSession = () => {
  const context = useContext(CustomerSessionContext)
  if (!context) {
    throw new Error('useCustomerSession must be used within a CustomerSessionProvider')
  }
  return context
}

const customerApi = axios.create({ baseURL: API_BASE })

// Attach token to every request
customerApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('customer_token')
  if (token) {
    config.headers['X-Customer-Token'] = token
  }
  return config
})

export const CustomerSessionProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [token, setToken] = useState(sessionStorage.getItem('customer_token'))
  const [loading, setLoading] = useState(true)
  const [cafeSettings, setCafeSettings] = useState(null)

  // Fetch public settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await customerApi.get('/customer/settings')
        setCafeSettings(resp.data)
      } catch (err) {
        console.error('Failed to fetch cafe settings:', err)
      }
    }
    fetchSettings()
  }, [])

  // Validate existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (token) {
        try {
          const resp = await customerApi.get('/customer/session')
          setSession(resp.data.session)
        } catch (err) {
          // Session expired or invalid
          sessionStorage.removeItem('customer_token')
          setToken(null)
          setSession(null)
        }
      }
      setLoading(false)
    }
    checkSession()
  }, [token])

  const createSession = useCallback(async ({ customerName, customerPhone, tableNumber, orderType }) => {
    const resp = await customerApi.post('/customer/session', {
      customer_name: customerName,
      customer_phone: customerPhone || '',
      table_number: tableNumber || null,
      order_type: orderType
    })
    const { session_token, session: sessionData } = resp.data
    sessionStorage.setItem('customer_token', session_token)
    setToken(session_token)
    setSession(sessionData)
    return sessionData
  }, [])

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('customer_token')
    setToken(null)
    setSession(null)
  }, [])

  const value = {
    session,
    token,
    loading,
    cafeSettings,
    customerApi,
    createSession,
    clearSession,
    hasActiveOrder: session?.order_id != null
  }

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  )
}
