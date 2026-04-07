import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Clock, CheckCircle, CreditCard, Edit, Eye, ShoppingBag, Utensils, XCircle, AlertCircle, Users, Smartphone } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import Button from '../components/Button'
import OrderDetailsModal from '../components/OrderDetailsModal'

const OrderList = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting_approval':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'paid':
        return <CreditCard className="h-4 w-4 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting_approval':
        return 'bg-orange-100 text-orange-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'complete':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    if (status === 'waiting_approval') return 'Waiting Approval'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  // Filter orders to show only current date orders
  const getCurrentDateOrders = (orders) => {
    const today = new Date()
    const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      return orderDate === todayString
    })
  }

  const currentDateOrders = getCurrentDateOrders(orders)

  const filteredOrders = currentDateOrders.filter(order => {
    if (statusFilter === 'all') return true
    return order.status === statusFilter
  })

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleEditOrder = (orderId) => {
    navigate(`/orders/${orderId}/edit`)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="Order List" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Order List" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order List</h1>
              <p className="mt-2 text-gray-600">View and manage today's orders</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Today's Orders</p>
              <p className="text-2xl font-bold text-abhimata-orange">{currentDateOrders.length}</p>
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-6">
            <div className="flex space-x-2">
              {[
                { key: 'waiting_approval', label: 'Waiting', count: currentDateOrders.filter(o => o.status === 'waiting_approval').length },
                { key: 'pending', label: 'Pending', count: currentDateOrders.filter(o => o.status === 'pending').length },
                { key: 'complete', label: 'Complete', count: currentDateOrders.filter(o => o.status === 'complete').length },
                { key: 'paid', label: 'Paid', count: currentDateOrders.filter(o => o.status === 'paid').length },
                { key: 'rejected', label: 'Rejected', count: currentDateOrders.filter(o => o.status === 'rejected').length },
                { key: 'all', label: 'All', count: currentDateOrders.length }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.key
                      ? 'bg-abhimata-orange text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                {statusFilter === 'all' ? 'No Orders Found' : `No ${statusFilter} Orders`}
              </h2>
              <p className="text-gray-500">
                {statusFilter === 'all' 
                  ? 'No orders have been submitted yet.' 
                  : `No orders with status "${statusFilter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {order.order_type === 'take_away'
                            ? `Takeaway${order.queue_number ? ` #${order.queue_number}` : ''}`
                            : `Table ${order.table_number}`}
                        </h3>
                        {order.order_type === 'take_away' ? (
                          <ShoppingBag className="h-4 w-4 text-blue-600" title="Take Away Order" />
                        ) : (
                          <Utensils className="h-4 w-4 text-green-600" title="Dine In Order" />
                        )}
                        {order.order_source === 'customer' ? (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700" title="Customer Order">
                            <Smartphone className="h-3 w-3 inline mr-0.5" />Customer
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600" title="Staff Order">
                            <Users className="h-3 w-3 inline mr-0.5" />Staff
                          </span>
                        )}
                      </div>
                      {order.customer_name && (
                        <p className="text-sm text-gray-600">By {order.customer_name}</p>
                      )}
                      {order.customer_phone && (
                        <p className="text-xs text-gray-400">{order.customer_phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{formatTime(order.created_at)}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>


                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Items ({order.items.length}):</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.menu_item_name} x{item.quantity}</span>
                          <span>Rp {item.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-xl font-bold text-abhimata-orange">
                        Rp {order.total_amount.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleViewOrder(order)}
                        icon={Eye}
                        size="sm"
                        variant="outline"
                        fullWidth
                      >
                        View Details
                      </Button>
                      
                      {order.status === 'pending' && (
                        <Button
                          onClick={() => handleEditOrder(order.id)}
                          icon={Edit}
                          size="sm"
                          fullWidth
                        >
                          Edit Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default OrderList
