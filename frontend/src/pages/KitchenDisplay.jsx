import { useState, useEffect, useCallback } from 'react'
import { ChefHat, Clock, CheckCircle, ShoppingBag, Utensils, Maximize, Minimize } from 'lucide-react'
import api from '../services/api'
import websocket from '../services/websocket'
import toast from 'react-hot-toast'
import { useSettings } from '../contexts/SettingsContext'
import NavigationHeader from '../components/NavigationHeader'

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { settings } = useSettings()

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    fetchOrders()
    setupWebSocket()
    
    return () => {
      websocket.off('new_order')
      websocket.off('order_updated')
    }
  }, [])

  // Update current time every minute to refresh waiting times
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/kitchen/orders')
      // Sort orders by creation time (oldest first) for FCFS
      const sortedOrders = response.data.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      )
      setOrders(sortedOrders)
    } catch (error) {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const setupWebSocket = () => {
    websocket.connect()
    
    websocket.on('new_order', (newOrder) => {
      if (newOrder.status === 'pending') {
        setOrders(prev => [...prev, newOrder])
        const orderTypeText = newOrder.order_type === 'take_away' ? 'Take Away' : 'Dine In'
        toast.success(`New ${orderTypeText} order #${newOrder.id} for Table ${newOrder.table_number}`)
      }
    })
    
    websocket.on('order_items_added', (data) => {
      // Show notification for newly added items to existing orders
      const { order_id, new_items } = data
      toast.success(`New items added to Order #${order_id}`, {
        duration: 5000,
        icon: '🍽️'
      })
      
      // Update the existing order with new items
      setOrders(prev => prev.map(order => {
        if (order.id === order_id) {
          return {
            ...order,
            items: [...order.items, ...new_items],
            total_amount: data.updated_total
          }
        }
        return order
      }))
    })
    
    websocket.on('order_updated', (updatedOrder) => {
      setOrders(prev => prev.filter(order => order.id !== updatedOrder.id))
    })
  }

  const markOrderComplete = async (orderId) => {
    try {
      await api.patch(`/kitchen/orders/${orderId}/complete`)
      setOrders(prev => prev.filter(order => order.id !== orderId))
      toast.success('Order marked as complete')
    } catch (error) {
      toast.error('Failed to mark order as complete')
    }
  }

  const getOrderPriority = (createdAt, orderIndex) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMinutes = Math.floor((now - created) / (1000 * 60))
    
    // First Come First Serve - different colors based on order position
    const priorityColors = [
      { bg: 'bg-red-50', border: 'border-red-200', text: 'bg-red-100 text-red-800', label: 'Priority 1' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'bg-orange-100 text-orange-800', label: 'Priority 2' },
      { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'bg-yellow-100 text-yellow-800', label: 'Priority 3' },
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'bg-blue-100 text-blue-800', label: 'Priority 4' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'bg-green-100 text-green-800', label: 'Priority 5' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'bg-purple-100 text-purple-800', label: 'Priority 6' }
    ]
    
    // Use order index to determine priority (0 = first, 1 = second, etc.)
    // Cycle through colors if more than 6 orders
    const priorityIndex = orderIndex % priorityColors.length
    const priority = priorityColors[priorityIndex]
    
    // Add time-based urgency indicator
    let urgencyText = priority.label
    if (diffMinutes > 20) urgencyText += ' - Urgent'
    else if (diffMinutes > 10) urgencyText += ' - Rush'
    
    return {
      ...priority,
      urgencyText,
      diffMinutes
    }
  }

  const formatWaitingTime = (createdAt) => {
    const diffMinutes = Math.floor((currentTime - new Date(createdAt)) / (1000 * 60))
    
    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      if (minutes === 0) {
        return `${hours}h`
      } else {
        return `${hours}h ${minutes}m`
      }
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isFullscreen && <NavigationHeader title="Kitchen Display" />}
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ChefHat className="h-8 w-8 text-abhimata-orange mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">{settings.cafeName} - List of Orders</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Pending Orders</p>
            <p className="text-2xl font-bold text-abhimata-orange">{orders.length}</p>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-abhimata-orange text-white hover:bg-abhimata-orange-dark transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Pending Orders</h2>
          <p className="text-gray-500">All orders are up to date!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 w-full">
          {orders.map((order, index) => {
            const priorityInfo = getOrderPriority(order.created_at, index)
            
            return (
              <div
                key={order.id}
                className={`${priorityInfo.bg} rounded-lg shadow-lg border-2 ${priorityInfo.border} p-6 relative`}
              >
                {/* Priority Indicator */}
                <div className={`absolute top-0 left-0 w-full h-1 ${priorityInfo.border.replace('border-', 'bg-')} rounded-t-lg`}></div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.order_type === 'take_away'
                        ? `Takeaway${order.queue_number ? ` #${order.queue_number}` : ''}`
                        : `Table ${order.table_number}`}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {order.order_type === 'take_away' ? (
                        <ShoppingBag className="h-7 w-7 text-blue-600" title="Take Away Order" />
                      ) : (
                        <Utensils className="h-7 w-7 text-green-600" title="Dine In Order" />
                      )}
                    </div>
                  </div>
                  {order.order_source === 'customer' && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mb-1">
                      Customer Order
                    </span>
                  )}
                  {order.customer_name && (
                    <p className="text-sm text-gray-600 mb-2">By {order.customer_name}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="font-medium"> {formatWaitingTime(order.created_at)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className={`bg-gray-50 rounded p-3 ${item.notes ? 'border-l-4 border-orange-400' : ''} ${item.is_new_addition ? 'border-2 border-green-400 bg-green-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <p className="font-medium text-sm">{item.menu_item_name}</p>
                                {item.is_new_addition && (
                                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-700">x{item.quantity}</span>
                            </div>
                            {item.notes && (
                              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                                <p className="text-xs font-semibold text-orange-800 mb-1">📝 Special Instructions:</p>
                                <p className="text-xs text-orange-700">{item.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => markOrderComplete(order.id)}
                    disabled={settings.kitchenDisplayEnabled === false}
                    className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                      settings.kitchenDisplayEnabled === false
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

export default KitchenDisplay
