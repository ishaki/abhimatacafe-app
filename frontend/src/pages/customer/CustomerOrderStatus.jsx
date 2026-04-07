import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, ChefHat, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useCustomerSession } from '../../contexts/CustomerSessionContext'
import CustomerLayout from './CustomerLayout'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

const STATUS_CONFIG = {
  waiting_approval: { label: 'Waiting Approval', color: 'text-yellow-600', bg: 'bg-yellow-100', step: 0 },
  pending: { label: 'Preparing', color: 'text-blue-600', bg: 'bg-blue-100', step: 1 },
  complete: { label: 'Ready', color: 'text-green-600', bg: 'bg-green-100', step: 2 },
  paid: { label: 'Paid', color: 'text-gray-600', bg: 'bg-gray-100', step: 3 },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', step: -1 }
}

const STEPS = [
  { key: 'waiting_approval', label: 'Submitted', icon: Clock },
  { key: 'pending', label: 'Preparing', icon: ChefHat },
  { key: 'complete', label: 'Ready', icon: CheckCircle }
]

const CustomerOrderStatus = () => {
  const { tableNumber, orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading: sessionLoading, customerApi, cafeSettings, clearSession } = useCustomerSession()

  const isTakeaway = location.pathname.startsWith('/order/takeaway')
  const basePath = isTakeaway ? '/order/takeaway' : `/table/${tableNumber}`

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddItems, setShowAddItems] = useState(false)

  const currency = cafeSettings?.currency || 'IDR'

  const formatPrice = (amount) => {
    if (currency === 'IDR') return `Rp ${amount.toLocaleString()}`
    return `${currency} ${amount.toLocaleString()}`
  }

  // Fetch order
  const fetchOrder = useCallback(async () => {
    try {
      const resp = await customerApi.get(`/customer/orders/${orderId}`)
      setOrder(resp.data.order)
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Order not found')
        navigate(basePath, { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }, [customerApi, orderId, navigate, basePath])

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate(basePath, { replace: true })
      return
    }
    if (session) fetchOrder()
  }, [sessionLoading, session, fetchOrder, navigate, basePath])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!session || !order) return

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })

    const room = order.table_number
      ? `table_${order.table_number}`
      : `takeaway_${order.queue_number}`

    socket.on('connect', () => {
      socket.emit('join_customer_room', { room })
    })

    socket.on('order_approved', (data) => {
      if (data.order_id === parseInt(orderId)) {
        setOrder(prev => prev ? { ...prev, status: 'pending', items: data.items || prev.items } : prev)
        toast.success('Your order has been approved!')
      }
    })

    socket.on('order_rejected', (data) => {
      if (data.order_id === parseInt(orderId)) {
        setOrder(prev => prev ? { ...prev, status: 'rejected', rejection_reason: data.reason } : prev)
        toast.error('Your order was not approved')
      }
    })

    socket.on('order_status_update', (data) => {
      if (data.order_id === parseInt(orderId)) {
        setOrder(prev => prev ? { ...prev, status: data.status } : prev)
        if (data.status === 'complete') {
          toast.success('Your order is ready!')
        }
      }
    })

    socket.on('items_approved', (data) => {
      if (data.order_id === parseInt(orderId)) {
        fetchOrder()
        toast.success('Your additional items have been approved!')
      }
    })

    return () => {
      socket.emit('leave_customer_room', { room })
      socket.disconnect()
    }
  }, [session, order?.table_number, order?.queue_number, orderId, fetchOrder])

  const handleAddMore = () => {
    navigate(`${basePath}/menu`, { state: { addToOrder: orderId } })
  }

  const handleNewOrder = () => {
    clearSession()
    navigate(basePath, { replace: true })
  }

  if (sessionLoading || loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abhimata-orange"></div>
        </div>
      </CustomerLayout>
    )
  }

  if (!session || !order) return null

  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.waiting_approval
  const currentStep = statusInfo.step
  const isRejected = order.status === 'rejected'
  const isPaid = order.status === 'paid'
  const canAddItems = !isRejected && !isPaid

  const approvedItems = order.items?.filter(i => i.item_status === 'approved') || []
  const waitingItems = order.items?.filter(i => i.item_status === 'waiting_approval') || []
  const rejectedItems = order.items?.filter(i => i.item_status === 'rejected') || []

  return (
    <CustomerLayout>
      <div className="py-4 space-y-4">
        {/* Order header */}
        <div className="bg-white rounded-xl shadow-sm p-5 text-center">
          {order.queue_number && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Queue Number</span>
              <div className="text-4xl font-bold text-abhimata-orange">{order.queue_number}</div>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Order #{order.id} &middot; {order.order_type === 'take_away' ? 'Take Away' : `Table ${order.table_number}`}
          </div>
          <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
        </div>

        {/* Rejection reason */}
        {isRejected && order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 text-sm">Order Not Approved</h4>
                <p className="text-red-600 text-sm mt-1">{order.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status tracker */}
        {!isRejected && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200" />
              <div
                className="absolute top-5 left-8 h-0.5 bg-abhimata-orange transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(currentStep, 2)) * 50}%` }}
              />

              {STEPS.map((step, idx) => {
                const Icon = step.icon
                const isActive = currentStep >= idx
                const isCurrent = currentStep === idx

                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-abhimata-orange text-white'
                        : 'bg-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-orange-200' : ''}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-abhimata-orange' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-900">Order Items</h3>
          </div>

          <div className="divide-y">
            {approvedItems.map(item => (
              <div key={item.id} className="p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{item.quantity}x</span>
                    <span className="text-sm text-gray-900">{item.menu_item_name}</span>
                  </div>
                  {item.notes && <p className="text-xs text-orange-600 mt-0.5">{item.notes}</p>}
                </div>
                <span className="text-sm font-medium text-gray-700">{formatPrice(item.subtotal)}</span>
              </div>
            ))}

            {waitingItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-yellow-50">
                  <span className="text-xs font-medium text-yellow-700">Waiting Approval</span>
                </div>
                {waitingItems.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-start bg-yellow-50/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{item.quantity}x</span>
                        <span className="text-sm text-gray-900">{item.menu_item_name}</span>
                      </div>
                      {item.notes && <p className="text-xs text-orange-600 mt-0.5">{item.notes}</p>}
                    </div>
                    <span className="text-sm font-medium text-gray-500">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </>
            )}

            {rejectedItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-red-50">
                  <span className="text-xs font-medium text-red-700">Rejected Items</span>
                </div>
                {rejectedItems.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-start bg-red-50/50 opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 line-through">{item.quantity}x</span>
                        <span className="text-sm text-gray-900 line-through">{item.menu_item_name}</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-400 line-through">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Total */}
          <div className="border-t p-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-abhimata-orange">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-6">
          {canAddItems && (
            <button
              onClick={handleAddMore}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-abhimata-orange text-abhimata-orange py-3 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add More Items
            </button>
          )}

          <button
            onClick={fetchOrder}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {(isPaid || isRejected) && (
            <button
              onClick={handleNewOrder}
              className="w-full bg-abhimata-orange text-white py-3 rounded-xl font-semibold hover:bg-abhimata-orange-dark transition-colors"
            >
              Start New Order
            </button>
          )}
        </div>
      </div>
    </CustomerLayout>
  )
}

export default CustomerOrderStatus
