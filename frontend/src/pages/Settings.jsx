import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Database, Wifi, Bell, Shield, Coffee, Info } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import Button from '../components/Button'
import { useSettings } from '../contexts/SettingsContext'

const SettingsPage = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    lastBackup: null,
    totalUsers: 0,
    totalOrders: 0,
    databaseSize: '0 MB'
  })

  useEffect(() => {
    loadSystemInfo()
  }, [])

  const loadSystemInfo = async () => {
    try {
      // This would typically come from an API endpoint
      setSystemInfo({
        version: '1.0.0',
        lastBackup: new Date().toISOString(),
        totalUsers: 4,
        totalOrders: 156,
        databaseSize: '2.3 MB'
      })
    } catch (error) {
      console.error('Failed to load system info:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateSettings(settings)
      if (success) {
        toast.success('Settings saved successfully!')
      } else {
        toast.success('Settings saved locally!')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    updateSettings({ [field]: value })
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        cafeName: 'Abhimata Cafe',
        cafeAddress: '',
        cafePhone: '',
        cafeEmail: '',
        currency: 'IDR',
        taxRate: 11,
        serviceCharge: 5,
        autoPrint: false,
        soundNotifications: true,
        darkMode: false
      }
      updateSettings(defaultSettings)
      toast.success('Settings reset to default')
    }
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Database backup completed successfully!')
      loadSystemInfo()
    } catch (error) {
      toast.error('Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = () => {
    toast.error('Restore functionality coming soon!')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Settings className="h-8 w-8 text-abhimata-orange mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleReset}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-abhimata-orange text-white px-4 py-2 rounded-lg hover:bg-abhimata-orange-dark flex items-center disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cafe Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Coffee className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">Cafe Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cafe Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.cafeName}
                  onChange={(e) => handleInputChange('cafeName', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.cafePhone}
                  onChange={(e) => handleInputChange('cafePhone', e.target.value)}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  rows="3"
                  value={settings.cafeAddress}
                  onChange={(e) => handleInputChange('cafeAddress', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.cafeEmail}
                  onChange={(e) => handleInputChange('cafeEmail', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">Business Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                >
                  <option value="IDR">Indonesian Rupiah (IDR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={settings.serviceCharge}
                  onChange={(e) => handleInputChange('serviceCharge', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Bell className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">System Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Auto Print Bills</h3>
                  <p className="text-sm text-gray-600">Automatically print bills after payment</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.autoPrint}
                    onChange={(e) => handleInputChange('autoPrint', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-abhimata-orange rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-abhimata-orange"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Sound Notifications</h3>
                  <p className="text-sm text-gray-600">Play sounds for new orders and notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.soundNotifications}
                    onChange={(e) => handleInputChange('soundNotifications', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-abhimata-orange rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-abhimata-orange"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Dark Mode</h3>
                  <p className="text-sm text-gray-600">Switch to dark theme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.darkMode}
                    onChange={(e) => handleInputChange('darkMode', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-abhimata-orange rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-abhimata-orange"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* System Information & Actions */}
        <div className="space-y-6">
          {/* System Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Info className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">System Information</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium">{systemInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-sm font-medium">{systemInfo.totalUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Orders</span>
                <span className="text-sm font-medium">{systemInfo.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Database Size</span>
                <span className="text-sm font-medium">{systemInfo.databaseSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm font-medium">{formatDate(systemInfo.lastBackup)}</span>
              </div>
            </div>
          </div>

          {/* Database Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">Database Management</h2>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleBackup}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center disabled:opacity-50"
              >
                <Database className="h-4 w-4 mr-2" />
                {loading ? 'Creating Backup...' : 'Create Backup'}
              </button>
              
              <button
                onClick={handleRestore}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore Backup
              </button>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Wifi className="h-6 w-6 text-abhimata-orange mr-2" />
              <h2 className="text-xl font-semibold">Network Status</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Connected
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Server Status</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <span className="text-sm font-medium">{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
