import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Coffee, Users, ShoppingCart, ChefHat, CreditCard, BarChart3, Settings, List, ClipboardList } from 'lucide-react'
import NavigationHeader from '../components/NavigationHeader'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const kitchenEnabled = settings.kitchenDisplayEnabled !== false
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: 'Administrator',
      waitress: 'Waitress',
      kitchen: 'Kitchen Staff',
      cashier: 'Cashier'
    }
    return roleNames[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      waitress: 'bg-blue-100 text-blue-800',
      kitchen: 'bg-green-100 text-green-800',
      cashier: 'bg-yellow-100 text-yellow-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getMenuItems = () => {
    const baseItems = [
      { name: 'Menu Management', icon: Coffee, path: '/menu', roles: ['admin'] },
      { name: 'Incoming Orders', icon: ClipboardList, path: '/incoming-orders', roles: ['admin', 'waitress'] },
      { name: 'Create Order', icon: ShoppingCart, path: '/orders/create', roles: ['admin', 'waitress'] },
      { name: 'Order List', icon: List, path: '/orders', roles: ['admin', 'waitress'] },
      { name: 'Kitchen Display', icon: ChefHat, path: '/kitchen', roles: ['admin', 'kitchen'], requiresKitchen: true },
      { name: 'Billing', icon: CreditCard, path: '/billing', roles: ['admin', 'cashier'] },
      { name: 'Expenses', icon: BarChart3, path: '/expenses', roles: ['admin', 'cashier'] },
      { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin', 'cashier'] },
      { name: 'User Management', icon: Users, path: '/users', roles: ['admin'] },
      { name: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] }
    ]

    return baseItems.filter(item => {
      if (!item.roles.includes(user.role)) return false
      if (item.requiresKitchen && !kitchenEnabled) return false
      return true
    })
  }

  const menuItems = getMenuItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader 
        title="Dashboard" 
        showNotifications={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user.username}!</h2>
            <p className="mt-2 text-gray-600">Manage your cafe operations efficiently</p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  onClick={() => navigate(item.path)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border border-gray-200 hover:border-abhimata-orange"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-abhimata-orange" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
