import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const SettingsContext = createContext()

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    cafeName: 'Abhimata Cafe',
    cafeAddress: '',
    cafePhone: '',
    cafeEmail: '',
    currency: 'IDR',
    taxRate: 11, // Default 11% tax rate
    serviceCharge: 5, // Default 5% service charge
    autoPrint: false,
    soundNotifications: true,
    darkMode: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Try to load from API first
      const response = await api.get('/settings')
      if (response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      // Fallback to localStorage
      const savedSettings = localStorage.getItem('cafeSettings')
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) })
      }
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings) => {
    try {
      // Save to API
      await api.post('/settings', newSettings)
      setSettings(newSettings)
      
      // Also save to localStorage as backup
      localStorage.setItem('cafeSettings', JSON.stringify(newSettings))
      
      return true
    } catch (error) {
      // Fallback to localStorage only
      localStorage.setItem('cafeSettings', JSON.stringify(newSettings))
      setSettings(newSettings)
      return false
    }
  }

  const updateSettings = async (updates) => {
    const newSettings = { ...settings, ...updates }
    return await saveSettings(newSettings)
  }

  // Tax calculation helpers
  const calculateTax = (subtotal) => {
    return subtotal * (settings.taxRate / 100)
  }

  const calculateServiceCharge = (subtotal) => {
    return subtotal * (settings.serviceCharge / 100)
  }

  const calculateTotalWithTax = (subtotal) => {
    const tax = calculateTax(subtotal)
    const serviceCharge = calculateServiceCharge(subtotal)
    return subtotal + tax + serviceCharge
  }

  const value = {
    settings,
    loading,
    saveSettings,
    updateSettings,
    calculateTax,
    calculateServiceCharge,
    calculateTotalWithTax
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
