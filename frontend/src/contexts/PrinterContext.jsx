import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import printerClient from '../services/printer'
import { useSettings } from './SettingsContext'

const PrinterContext = createContext(null)

export const usePrinter = () => {
  const ctx = useContext(PrinterContext)
  if (!ctx) {
    throw new Error('usePrinter must be used within a PrinterProvider')
  }
  return ctx
}

export const PrinterProvider = ({ children }) => {
  const { settings } = useSettings()
  const [connected, setConnected] = useState(printerClient.isConnected())
  const [deviceName, setDeviceName] = useState(printerClient.getDeviceName())
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const supported = printerClient.isSupported()

  // Subscribe to connection-state changes from the singleton.
  useEffect(() => {
    const unsubscribe = printerClient.onChange(({ connected, deviceName }) => {
      setConnected(connected)
      setDeviceName(deviceName)
    })
    return unsubscribe
  }, [])

  // On mount, try to silently reconnect to a previously-paired printer.
  useEffect(() => {
    if (!supported) return
    printerClient.tryAutoReconnect().catch(() => {})
  }, [supported])

  const connect = useCallback(async () => {
    if (!supported) {
      setError('Web Bluetooth is not supported on this browser. Use Chrome on Android.')
      return false
    }
    setConnecting(true)
    setError(null)
    try {
      await printerClient.connect()
      return true
    } catch (e) {
      // User-cancelled chooser produces a NotFoundError — don't surface as error
      if (e && e.name === 'NotFoundError') {
        return false
      }
      setError(e?.message || 'Failed to connect to printer')
      return false
    } finally {
      setConnecting(false)
    }
  }, [supported])

  const disconnect = useCallback(async () => {
    await printerClient.disconnect()
  }, [])

  const printOrder = useCallback(
    async (order) => {
      setError(null)
      try {
        await printerClient.printOrder(order, {
          cafeName: settings?.cafeName || 'ABHIMATA CAFE',
        })
        return { ok: true }
      } catch (e) {
        const message = e?.message || 'Failed to print order'
        setError(message)
        return { ok: false, error: message }
      }
    },
    [settings?.cafeName]
  )

  const value = {
    supported,
    connected,
    connecting,
    deviceName,
    error,
    connect,
    disconnect,
    printOrder,
  }

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
}
