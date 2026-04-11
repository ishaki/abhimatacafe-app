import { useEffect, useRef } from 'react'
import { X, Utensils, ShoppingBag, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'

/**
 * Slide-in drawer containing order form (create mode) or existing-order
 * summary (edit mode) plus the cart editor and submit button.
 *
 * Props:
 *  - open, onClose
 *  - mode: 'create' | 'edit'
 *  - cart, onUpdateQuantity, onRemoveItem, onUpdateNotes, total
 *  - (create mode) orderForm, onFormChange, showTableNumberError, tableNumberInputRef
 *  - (edit mode) order, onDeleteExistingItem, canDeleteItem
 *  - onSubmit, submitting, submitLabel
 */
const OrderDetailsDrawer = ({
  open,
  onClose,
  mode = 'create',
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  total,
  orderForm,
  onFormChange,
  showTableNumberError,
  tableNumberInputRef,
  order,
  onDeleteExistingItem,
  canDeleteItem,
  onSubmit,
  submitting,
  submitLabel = 'Submit Order',
}) => {
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  const cartEmpty = cart.length === 0

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black bg-opacity-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="w-full max-w-md bg-gray-50 shadow-xl flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'edit' ? 'Order Details' : 'Order Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Create mode: order form */}
          {mode === 'create' && orderForm && (
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Customer Info</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <input
                  ref={tableNumberInputRef}
                  type="number"
                  required
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange transition-colors ${
                    showTableNumberError
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-300'
                  }`}
                  value={orderForm.table_number}
                  onChange={(e) =>
                    onFormChange({ ...orderForm, table_number: e.target.value })
                  }
                  placeholder={
                    showTableNumberError ? 'Please enter table number' : ''
                  }
                />
                {showTableNumberError && (
                  <p className="text-red-500 text-sm mt-1">
                    Table number is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-abhimata-orange focus:border-abhimata-orange"
                  value={orderForm.customer_name}
                  onChange={(e) =>
                    onFormChange({
                      ...orderForm,
                      customer_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange({ ...orderForm, order_type: 'dine_in' })
                    }
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      orderForm.order_type === 'dine_in'
                        ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Utensils className="h-5 w-5" />
                    <span className="font-medium">Dine In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange({ ...orderForm, order_type: 'take_away' })
                    }
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      orderForm.order_type === 'take_away'
                        ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">Take Away</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit mode: current order info + existing items */}
          {mode === 'edit' && order && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Current Order</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-medium">{order.table_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">
                      {order.customer_name || 'Walk-in'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'complete'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Total:</span>
                    <span className="font-bold text-abhimata-orange">
                      Rp {order.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Current Items</h3>
                {order.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-2 text-sm">
                    No items in this order
                  </p>
                ) : (
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {item.menu_item_name}
                            </h4>
                            <p className="text-xs text-gray-600">
                              Quantity: {item.quantity}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-orange-600 mt-1 font-medium">
                                📝 {item.notes}
                              </p>
                            )}
                            {item.is_new_addition && (
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full mt-1">
                                New Addition
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-abhimata-orange whitespace-nowrap">
                              Rp {item.subtotal.toLocaleString()}
                            </span>
                            {canDeleteItem && canDeleteItem(item) && (
                              <button
                                onClick={() => onDeleteExistingItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title={
                                  item.is_new_addition
                                    ? 'Delete new addition'
                                    : 'Admin: Delete item'
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cart (new items) */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                {mode === 'edit' ? 'New Items' : 'Items in Cart'}
              </h3>
              <ShoppingCart className="h-5 w-5 text-abhimata-orange" />
            </div>

            {cartEmpty ? (
              <p className="text-gray-500 text-center py-6 text-sm">
                {mode === 'edit' ? 'No new items added' : 'Cart is empty'}
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={`${item.menu_item_id}-${index}`}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        {item.notes && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          onRemoveItem(item.menu_item_id, item.notes)
                        }
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            onUpdateQuantity(
                              item.menu_item_id,
                              item.quantity - 1,
                              item.notes
                            )
                          }
                          className="bg-gray-200 text-gray-700 w-7 h-7 rounded flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(
                              item.menu_item_id,
                              item.quantity + 1,
                              item.notes
                            )
                          }
                          className="bg-gray-200 text-gray-700 w-7 h-7 rounded flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-abhimata-orange">
                        Rp {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Edit notes (optional)"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      value={item.notes}
                      onChange={(e) =>
                        onUpdateNotes(
                          item.menu_item_id,
                          e.target.value,
                          item.notes
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer: total + submit */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold">
              {mode === 'edit' ? 'Additional Total:' : 'Total:'}
            </span>
            <span className="text-xl font-bold text-abhimata-orange">
              Rp {total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={onSubmit}
            disabled={submitting || cartEmpty}
            className="w-full bg-abhimata-orange text-white py-3 px-4 rounded-lg hover:bg-abhimata-orange-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailsDrawer
