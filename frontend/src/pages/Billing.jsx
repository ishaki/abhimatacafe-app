import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock, Calculator, Receipt, Edit, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import Button from '../components/Button'
import { useSettings } from '../contexts/SettingsContext'

const Billing = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [searchTerm, setSearchTerm] = useState('')

  // Get settings from context
  const { settings, calculateTax, calculateServiceCharge, calculateTotalWithTax } = useSettings()
  const kitchenEnabled = settings.kitchenDisplayEnabled !== false

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const completedResponse = await api.get('/billing/orders')
      setOrders(completedResponse.data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const markOrderComplete = async (orderId) => {
    try {
      await api.patch(`/billing/orders/${orderId}/complete`)
      toast.success('Order marked as complete')
      fetchOrders()
    } catch (error) {
      toast.error('Failed to mark order as complete')
    }
  }

  const processPayment = async (orderId) => {
    try {
      await api.post('/billing/pay', {
        order_id: orderId,
        payment_method: paymentMethod
      })
      toast.success('Payment processed successfully!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (error) {
      toast.error('Failed to process payment')
    }
  }

  // Tax calculation functions using settings context
  const calculateSubtotal = (order) => {
    return order.items.reduce((total, item) => total + item.subtotal, 0)
  }

  const calculateTotal = (order) => {
    const subtotal = calculateSubtotal(order)
    return calculateTotalWithTax(subtotal)
  }

  const formatCurrency = (amount) => {
    return `Rp ${amount.toLocaleString()}`
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter orders based on search term
  const filterOrders = (ordersList) => {
    if (!searchTerm.trim()) return ordersList

    const term = searchTerm.toLowerCase()
    return ordersList.filter(order => {
      // Search by customer name
      if (order.customer_name && order.customer_name.toLowerCase().includes(term)) {
        return true
      }

      // Search by table number
      if (order.table_number.toString().includes(term)) {
        return true
      }

      // Search by order items
      if (order.items.some(item =>
        item.menu_item_name.toLowerCase().includes(term)
      )) {
        return true
      }

      return false
    })
  }

  const filteredOrders = filterOrders(orders)
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending')
  const completedOrders = filteredOrders.filter(o => o.status === 'complete')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="Billing & Payment" />
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

  const renderOrderCard = (order) => {
    const isPending = order.status === 'pending'

    return (
      <div key={order.id} className={`bg-white rounded-lg shadow-md border ${isPending ? 'border-yellow-300' : 'border-gray-200'} p-6`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Order #{order.id}
            </h3>
            <p className="text-sm text-gray-600">Table {order.table_number}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(isPending ? order.created_at : order.completed_at)}
            </div>
            {isPending ? (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                Pending
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Ready
              </span>
            )}
          </div>
        </div>

        {order.customer_name && (
          <p className="text-sm text-gray-700 mb-3">
            Customer: {order.customer_name}
          </p>
        )}

        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
          <div className="space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.menu_item_name} x{item.quantity}</span>
                <span>Rp {item.subtotal.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          {/* Tax Breakdown */}
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal(order))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Charge ({settings.serviceCharge}%):</span>
              <span>{formatCurrency(calculateServiceCharge(calculateSubtotal(order)))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({settings.taxRate}%):</span>
              <span>{formatCurrency(calculateTax(calculateSubtotal(order)))}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-abhimata-orange">
                  {formatCurrency(calculateTotal(order))}
                </span>
              </div>
            </div>
          </div>

          {isPending ? (
            <Button
              onClick={() => markOrderComplete(order.id)}
              icon={CheckCircle}
              size="lg"
              fullWidth
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Mark as Complete
            </Button>
          ) : (
            <Button
              onClick={() => setSelectedOrder(order)}
              icon={CreditCard}
              size="lg"
              fullWidth
            >
              Process Payment
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Billing & Payment" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing & Payment</h1>
              <p className="mt-2 text-gray-600">
                {kitchenEnabled
                  ? 'Process payments for completed orders'
                  : 'Mark orders complete and process payments'}
              </p>
            </div>
            <div className="text-right">
              {!kitchenEnabled && pendingOrders.length > 0 && (
                <div className="mb-1">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">{pendingOrders.length}</p>
                </div>
              )}
              <p className="text-sm text-gray-600">Ready for Payment</p>
              <p className="text-2xl font-bold text-abhimata-orange">{completedOrders.length}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by customer name, table number, or menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-abhimata-orange focus:border-abhimata-orange sm:text-sm"
              />
            </div>
          </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            {searchTerm ? 'No Orders Found' : 'No Orders Ready for Payment'}
          </h2>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms.'
              : 'All orders are either pending or already paid.'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Pending Orders Section (only when kitchen is OFF) */}
          {!kitchenEnabled && pendingOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                Pending Orders — Mark as Complete
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingOrders.map(renderOrderCard)}
              </div>
            </div>
          )}

          {/* Completed Orders Section */}
          {completedOrders.length > 0 && (
            <div>
              {!kitchenEnabled && pendingOrders.length > 0 && (
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                  Ready for Payment
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedOrders.map(renderOrderCard)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-abhimata-orange" />
              Process Payment
            </h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Order #{selectedOrder.id} - Table {selectedOrder.table_number}</p>

              {/* Detailed Bill Breakdown */}
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Bill Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateSubtotal(selectedOrder))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Service Charge ({settings.serviceCharge}%):</span>
                    <span>{formatCurrency(calculateServiceCharge(calculateSubtotal(selectedOrder)))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({settings.taxRate}%):</span>
                    <span>{formatCurrency(calculateTax(calculateSubtotal(selectedOrder)))}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="text-lg font-bold text-abhimata-orange">
                        {formatCurrency(calculateTotal(selectedOrder))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                {['cash', 'card', 'qris'].map(method => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className="capitalize">{method.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => processPayment(selectedOrder.id)}
                icon={CheckCircle}
                size="lg"
                fullWidth
              >
                Process Payment
              </Button>
              <Button
                onClick={() => setSelectedOrder(null)}
                variant="secondary"
                size="lg"
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default Billing
