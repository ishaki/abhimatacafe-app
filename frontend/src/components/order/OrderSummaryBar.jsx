import { ShoppingCart } from 'lucide-react'

/**
 * Sticky bottom bar showing cart summary + action buttons.
 * Hidden entirely when itemCount is 0.
 */
const OrderSummaryBar = ({
  itemCount,
  total,
  onViewDetails,
  onSubmit,
  submitting,
  submitLabel = 'Submit Order',
}) => {
  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <ShoppingCart className="h-6 w-6 text-abhimata-orange" />
            <span className="absolute -top-2 -right-2 bg-abhimata-orange text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 leading-tight">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
            </p>
            <p className="text-lg font-bold text-gray-900 leading-tight truncate">
              Rp {total.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onViewDetails}
            className="px-4 sm:px-5 py-2.5 border-2 border-abhimata-orange text-abhimata-orange font-semibold rounded-lg hover:bg-orange-50 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 sm:px-6 py-2.5 bg-abhimata-orange text-white font-semibold rounded-lg hover:bg-abhimata-orange-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderSummaryBar
