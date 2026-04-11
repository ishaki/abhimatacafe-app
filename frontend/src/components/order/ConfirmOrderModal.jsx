import { useEffect } from 'react'
import { Utensils, ShoppingBag, ShoppingCart, X } from 'lucide-react'

/**
 * Confirmation dialog shown right before an order is submitted.
 * Renders on top of the OrderDetailsDrawer (z-60 > drawer's z-50).
 */
const ConfirmOrderModal = ({
  open,
  onClose,
  onConfirm,
  orderForm,
  itemCount,
  total,
  submitting,
}) => {
  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose, submitting])

  if (!open) return null

  const isDineIn = orderForm.order_type === 'dine_in'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Confirm Order</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Please review the order details before submitting.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Table Number</span>
              <span className="font-semibold text-gray-900">
                {orderForm.table_number}
              </span>
            </div>

            {orderForm.customer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer</span>
                <span className="font-semibold text-gray-900">
                  {orderForm.customer_name}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Order Type</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                {isDineIn ? (
                  <Utensils className="h-4 w-4 text-abhimata-orange" />
                ) : (
                  <ShoppingBag className="h-4 w-4 text-abhimata-orange" />
                )}
                {isDineIn ? 'Dine In' : 'Take Away'}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <ShoppingCart className="h-4 w-4 text-abhimata-orange" />
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-abhimata-orange">
                Rp {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-abhimata-orange text-white font-semibold rounded-lg hover:bg-abhimata-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmOrderModal
