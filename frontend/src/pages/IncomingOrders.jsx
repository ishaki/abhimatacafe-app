import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Check, X, Clock, ShoppingBag, Utensils, Bell, RefreshCw } from 'lucide-react'
import api from '../services/api'
import websocket from '../services/websocket'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import { useSettings } from '../contexts/SettingsContext'

const IncomingOrders = () => {
  const [waitingOrders, setWaitingOrders] = useState([])
  const [pendingItemOrders, setPendingItemOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())
  const { settings } = useSettings()

  const currency = settings?.currency || 'IDR'

  const formatPrice = (amount) => {
    if (currency === 'IDR') return `Rp ${amount.toLocaleString()}`
    return `${currency} ${amount.toLocaleString()}`
  }

  const fetchPendingOrders = useCallback(async () => {
    try {
      const resp = await api.get('/orders/pending-approval')
      setWaitingOrders(resp.data.waiting_approval || [])
      setPendingItemOrders(resp.data.pending_items || [])
    } catch (err) {
      toast.error('Failed to fetch pending orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingOrders()
  }, [fetchPendingOrders])

  // Update time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // WebSocket for real-time incoming orders
  useEffect(() => {
    websocket.connect()

    const handleCustomerOrder = (data) => {
      fetchPendingOrders()
      const label = data.table_number ? `Table ${data.table_number}` : `Takeaway #${data.queue_number}`
      toast(`New customer order - ${label}`, {
        icon: '🔔',
        duration: 6000,
        style: { background: '#FFF7ED', border: '1px solid #FB923C' }
      })
      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {})
      } catch {}
    }

    const handleCustomerItems = (data) => {
      fetchPendingOrders()
      toast(`New items added to Order #${data.order_id}`, {
        icon: '🍽️',
        duration: 5000,
        style: { background: '#FFF7ED', border: '1px solid #FB923C' }
      })
    }

    websocket.on('customer_order_pending', handleCustomerOrder)
    websocket.on('customer_items_pending', handleCustomerItems)

    return () => {
      websocket.off('customer_order_pending', handleCustomerOrder)
      websocket.off('customer_items_pending', handleCustomerItems)
    }
  }, [fetchPendingOrders])

  const formatWaitingTime = (createdAt) => {
    const diffMinutes = Math.floor((currentTime - new Date(createdAt)) / (1000 * 60))
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return minutes === 0 ? `${hours}h ago` : `${hours}h ${minutes}m ago`
  }

  const handleApprove = async (orderId) => {
    setProcessing(prev => ({ ...prev, [orderId]: 'approve' }))
    try {
      await api.post(`/orders/${orderId}/approve`)
      toast.success(`Order #${orderId} approved`)
      fetchPendingOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve order')
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: null }))
    }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error('Please enter a reason for rejection')
      return
    }
    const orderId = rejectModal
    setProcessing(prev => ({ ...prev, [orderId]: 'reject' }))
    try {
      await api.post(`/orders/${orderId}/reject`, { reason: rejectReason.trim() })
      toast.success(`Order #${orderId} rejected`)
      setRejectModal(null)
      setRejectReason('')
      fetchPendingOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject order')
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: null }))
    }
  }

  const handleApproveItems = async (orderId) => {
    setProcessing(prev => ({ ...prev, [`items_${orderId}`]: 'approve' }))
    try {
      await api.post(`/orders/${orderId}/approve-items`)
      toast.success(`New items for Order #${orderId} approved`)
      fetchPendingOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve items')
    } finally {
      setProcessing(prev => ({ ...prev, [`items_${orderId}`]: null }))
    }
  }

  const totalPending = waitingOrders.length + pendingItemOrders.length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="Incoming Orders" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Incoming Orders" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Incoming Customer Orders</h1>
              <p className="mt-2 text-gray-600">Approve or reject customer-submitted orders</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchPendingOrders}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-abhimata-orange">{totalPending}</p>
              </div>
            </div>
          </div>

          {totalPending === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No Pending Orders</h2>
              <p className="text-gray-500">All customer orders have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Waiting Approval Orders */}
              {waitingOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-yellow-500" />
                    New Orders ({waitingOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {waitingOrders.map(order => (
                      <div key={order.id} className="bg-white rounded-lg shadow-md border-2 border-yellow-300 p-5">
                        {/* Order header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {order.order_type === 'take_away' ? (
                                <ShoppingBag className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Utensils className="h-5 w-5 text-green-600" />
                              )}
                              <h3 className="font-bold text-gray-900">
                                {order.order_type === 'take_away'
                                  ? `Takeaway #${order.queue_number || ''}`
                                  : `Table ${order.table_number}`}
                              </h3>
                            </div>
                            {order.customer_name && (
                              <p className="text-sm text-gray-600">{order.customer_name}</p>
                            )}
                            {order.customer_phone && (
                              <p className="text-xs text-gray-400">{order.customer_phone}</p>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatWaitingTime(order.created_at)}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="border-t border-b py-3 mb-3 space-y-1.5 max-h-40 overflow-y-auto">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <div className="flex-1">
                                <span className="font-medium">{item.quantity}x</span>{' '}
                                <span>{item.menu_item_name}</span>
                                {item.notes && (
                                  <p className="text-xs text-orange-600 ml-4">{item.notes}</p>
                                )}
                              </div>
                              <span className="text-gray-600 ml-2">{formatPrice(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-semibold text-gray-700">Total</span>
                          <span className="text-lg font-bold text-abhimata-orange">{formatPrice(order.total_amount)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={!!processing[order.id]}
                            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            {processing[order.id] === 'approve' ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectModal(order.id); setRejectReason('') }}
                            disabled={!!processing[order.id]}
                            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders with pending new items */}
              {pendingItemOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                    New Items to Approve ({pendingItemOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingItemOrders.map(order => {
                      const waitingItems = order.items.filter(i => i.item_status === 'waiting_approval')
                      const approvedItems = order.items.filter(i => i.item_status === 'approved')
                      return (
                        <div key={order.id} className="bg-white rounded-lg shadow-md border-2 border-blue-300 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {order.order_type === 'take_away' ? (
                                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Utensils className="h-5 w-5 text-green-600" />
                                )}
                                <h3 className="font-bold text-gray-900">
                                  Order #{order.id} - {order.order_type === 'take_away'
                                    ? `Takeaway #${order.queue_number || ''}`
                                    : `Table ${order.table_number}`}
                                </h3>
                              </div>
                              {order.customer_name && (
                                <p className="text-sm text-gray-600">{order.customer_name}</p>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {order.status}
                            </span>
                          </div>

                          {/* Approved items (dimmed) */}
                          {approvedItems.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-400 mb-1">Already Approved</p>
                              <div className="space-y-1 opacity-50">
                                {approvedItems.map(item => (
                                  <div key={item.id} className="flex justify-between text-xs text-gray-500">
                                    <span>{item.quantity}x {item.menu_item_name}</span>
                                    <span>{formatPrice(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Waiting items (highlighted) */}
                          <div className="border-t py-2 mb-3">
                            <p className="text-xs font-medium text-yellow-700 mb-1">New Items (Pending)</p>
                            <div className="space-y-1.5 bg-yellow-50 rounded-lg p-2">
                              {waitingItems.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{item.quantity}x</span>{' '}
                                    <span>{item.menu_item_name}</span>
                                    {item.notes && (
                                      <p className="text-xs text-orange-600 ml-4">{item.notes}</p>
                                    )}
                                  </div>
                                  <span className="text-gray-600 ml-2">{formatPrice(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => handleApproveItems(order.id)}
                            disabled={!!processing[`items_${order.id}`]}
                            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            {processing[`items_${order.id}`] === 'approve' ? 'Approving...' : 'Approve New Items'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Order #{rejectModal}</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejection. The customer will see this message.</p>
            <textarea
              placeholder="e.g. Item out of stock, Kitchen closed..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing[rejectModal] === 'reject'}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processing[rejectModal] === 'reject' ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncomingOrders
