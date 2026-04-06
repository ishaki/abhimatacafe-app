import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Coffee, Bell, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NavigationHeader = ({ title, showNotifications = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  const handleHome = () => {
    navigate('/dashboard')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = []
    
    if (pathSegments.length > 0) {
      breadcrumbs.push({ name: 'Dashboard', path: '/dashboard' })
      
      const pageNames = {
        'menu': 'Menu Management',
        'orders': 'Order Management',
        'kitchen': 'Kitchen Display',
        'billing': 'Billing & Payment',
        'expenses': 'Expense Management',
        'reports': 'Reports & Analytics',
        'users': 'User Management',
        'settings': 'Settings'
      }
      
      pathSegments.forEach((segment, index) => {
        if (segment !== 'create' && pageNames[segment]) {
          breadcrumbs.push({
            name: pageNames[segment],
            path: `/${pathSegments.slice(0, index + 1).join('/')}`
          })
        }
      })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="bg-abhimata-orange shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Cafe Name & Breadcrumbs */}
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={handleHome}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-orange-600 transition-colors touch-manipulation"
              aria-label="Go to dashboard"
            >
              <Coffee className="h-6 w-6 text-white" />
              <span className="text-white font-semibold text-lg">Abhimata Cafe</span>
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden md:flex items-center space-x-2" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center space-x-2">
                  {index > 0 && <span className="text-orange-200">/</span>}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-sm font-medium transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-white'
                        : 'text-orange-100 hover:text-white'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </nav>
          </div>


          {/* Right Section - Notifications & User */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            {showNotifications && (
              <button
                className="relative p-2 rounded-lg hover:bg-orange-600 transition-colors touch-manipulation"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6 text-white" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-orange-600 rounded-lg p-2 transition-colors"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-orange-100 capitalize">{user?.role}</p>
                </div>
                
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                  <User className="h-4 w-4 text-abhimata-orange" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3 text-gray-500" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default NavigationHeader
