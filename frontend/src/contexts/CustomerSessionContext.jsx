import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

// If VITE_API_URL is baked in as http:// but the page is served over https://,
// upgrade the scheme — otherwise the browser blocks it as mixed content / CSP.
const resolveApiBase = () => {
  const raw = import.meta.env.VITE_API_URL || '/api'
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    raw.startsWith('http://')
  ) {
    return raw.replace(/^http:\/\//, 'https://')
  }
  return raw
}
const API_BASE = resolveApiBase()

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

  // Fetch public settings. Refetched whenever the tab becomes visible again
  // so admin changes to tax rate / service charge propagate to open customer
  // tabs without requiring a manual reload. A cache-buster query param also
  // defeats any intermediate HTTP cache a mobile browser may have kept.
  useEffect(() => {
    let cancelled = false

    const fetchSettings = async () => {
      try {
        const resp = await customerApi.get('/customer/settings', {
          params: { _t: Date.now() },
        })
        if (!cancelled) setCafeSettings(resp.data)
      } catch (err) {
        console.error('Failed to fetch cafe settings:', err)
      }
    }

    fetchSettings()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSettings()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', fetchSettings)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', fetchSettings)
    }
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
