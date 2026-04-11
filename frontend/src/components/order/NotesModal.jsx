import { useEffect } from 'react'

/**
 * Modal for entering special instructions while adding an item to the cart.
 */
const NotesModal = ({ item, notes, onNotesChange, onConfirm, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Special Instructions</h3>
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
          <p className="text-sm font-bold text-abhimata-orange">
            Rp {item.price.toLocaleString()}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            placeholder="e.g., No onions, Extra spicy, Well done..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange resize-none"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-abhimata-orange text-white px-4 py-2 rounded-md hover:bg-abhimata-orange-dark"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotesModal
