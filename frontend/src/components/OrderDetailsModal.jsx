import { useState } from 'react'
import { X, Clock, CheckCircle, CreditCard, ShoppingCart, ShoppingBag, Utensils } from 'lucide-react'
import Button from './Button'

const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'paid':
        return <CreditCard className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'complete':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">
                Order: Table {order.table_number}{order.customer_name ? ` (${order.customer_name})` : ''}
              </h2>
              {order.order_type === 'take_away' ? (
                <ShoppingBag className="h-6 w-6 text-blue-600" title="Take Away Order" />
              ) : (
                <Utensils className="h-6 w-6 text-green-600" title="Dine In Order" />
              )}
            </div>
            <p className="text-gray-600">{formatDateTime(order.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Order Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">Order Status:</span>
              {getStatusIcon(order.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{item.menu_item_name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          {item.is_new_addition && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                              New Addition
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        Rp {item.subtotal.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Rp {(item.subtotal / item.quantity).toLocaleString()} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-abhimata-orange bg-opacity-10 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-abhimata-orange">
                Rp {order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default OrderDetailsModal
