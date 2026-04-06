import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, Search, ArrowLeft } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const OrderEdit = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [itemNotes, setItemNotes] = useState({})
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    fetchOrderAndMenu()
  }, [orderId])

  const fetchOrderAndMenu = async () => {
    try {
      const [orderResponse, menuResponse] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get('/menu/')
      ])
      
      setOrder(orderResponse.data)
      setMenuItems(menuResponse.data)
    } catch (error) {
      toast.error('Failed to fetch order or menu items')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item) => {
    // Open popup modal for special instructions
    setSelectedItem(item)
    setShowNotesModal(true)
  }

  const addToCart = (item, notes = '') => {
    const existingItem = cart.find(cartItem => cartItem.menu_item_id === item.id && cartItem.notes === notes)
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.menu_item_id === item.id && cartItem.notes === notes
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        notes: notes
      }])
    }
    toast.success(`${item.name} added to cart${notes ? ' with notes' : ''}`)
  }

  const openNotesModal = (item) => {
    setSelectedItem(item)
    setShowNotesModal(true)
  }

  const closeNotesModal = () => {
    setShowNotesModal(false)
    setSelectedItem(null)
  }

  const saveNotesAndAddToCart = () => {
    if (selectedItem) {
      const notes = itemNotes[selectedItem.id] || ''
      addToCart(selectedItem, notes)
      // Clear the notes for this item after adding to cart
      setItemNotes(prev => ({ ...prev, [selectedItem.id]: '' }))
      closeNotesModal()
    }
  }

  const updateQuantity = (itemId, newQuantity, notes = '') => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, notes)
      return
    }
    
    setCart(cart.map(item =>
      item.menu_item_id === itemId && item.notes === notes
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const removeFromCart = (itemId, notes = '') => {
    setCart(cart.filter(item => !(item.menu_item_id === itemId && item.notes === notes)))
  }

  const updateNotes = (itemId, notes, oldNotes = '') => {
    setCart(cart.map(item =>
      item.menu_item_id === itemId && item.notes === oldNotes
        ? { ...item, notes }
        : item
    ))
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (cart.length === 0) {
      toast.error('Please add items to cart')
      return
    }

    setSubmitting(true)

    try {
      const orderData = {
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      }

      await api.post(`/orders/${orderId}/items`, orderData)
      toast.success('Items added to order successfully!')
      
      // Reset cart
      setCart([])
      
      // Refresh order data
      await fetchOrderAndMenu()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add items to order')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteOrderItem = async (itemId) => {
    try {
      await api.delete(`/orders/${orderId}/items/${itemId}`)
      toast.success('Item removed from order successfully!')
      
      // Refresh order data
      await fetchOrderAndMenu()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove item from order')
    }
  }

  const categories = ['All', ...new Set(menuItems.map(item => item.category))]
  
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-abhimata-orange text-white px-4 py-2 rounded-lg hover:bg-abhimata-orange-dark"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Order #{order.id}</h1>
          <p className="text-gray-600">Table {order.table_number} • {order.customer_name || 'Walk-in Customer'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add More Items</h2>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-abhimata-orange text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-abhimata-orange font-bold">Rp {item.price.toLocaleString()}</span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <p className="text-xs text-gray-500 mb-3">{item.category}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < item.rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="bg-abhimata-orange text-white px-3 py-1 rounded text-sm hover:bg-abhimata-orange-dark flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Order Summary & New Items Cart */}
        <div className="space-y-6">
          {/* Current Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Current Order</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Table:</span>
                <span className="font-medium">{order.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{order.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'complete' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Total:</span>
                <span className="font-bold text-abhimata-orange">Rp {order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Existing Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Current Items</h2>
            {order.items.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items in this order</p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.menu_item_name}</h4>
                        <p className="text-xs text-gray-600">Quantity: {item.quantity}</p>
                        {item.notes && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            📝 {item.notes}
                          </p>
                        )}
                        {item.is_new_addition && (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mt-1">
                            New Addition
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-abhimata-orange">
                          Rp {item.subtotal.toLocaleString()}
                        </span>
                        {/* Only show delete button for new additions (waitress) or all items (admin) */}
                        {(item.is_new_addition || user.role === 'admin') && order.status === 'pending' && (
                          <button
                            onClick={() => deleteOrderItem(item.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={item.is_new_addition ? "Delete new addition" : "Admin: Delete completed item"}
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
          
          {/* New Items Cart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">New Items</h2>
              <ShoppingCart className="h-5 w-5 text-abhimata-orange" />
            </div>
            
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No new items added</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={`${item.menu_item_id}-${index}`} className="border border-gray-200 rounded-lg p-3">
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
                        onClick={() => removeFromCart(item.menu_item_id, item.notes)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1, item.notes)}
                          className="bg-gray-200 text-gray-700 w-6 h-6 rounded flex items-center justify-center text-sm"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1, item.notes)}
                          className="bg-gray-200 text-gray-700 w-6 h-6 rounded flex items-center justify-center text-sm"
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
                      onChange={(e) => updateNotes(item.menu_item_id, e.target.value, item.notes)}
                    />
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Additional Total:</span>
                    <span className="text-xl font-bold text-abhimata-orange">
                      Rp {getTotalAmount().toLocaleString()}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || cart.length === 0}
                    className="w-full bg-abhimata-orange text-white py-3 px-4 rounded-lg hover:bg-abhimata-orange-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding Items...' : 'Add Items to Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Special Instructions Modal */}
      {showNotesModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Special Instructions</h3>
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">{selectedItem.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{selectedItem.description}</p>
              <p className="text-sm font-bold text-abhimata-orange">Rp {selectedItem.price.toLocaleString()}</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                placeholder="e.g., No onions, Extra spicy, Well done..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange resize-none"
                rows={3}
                value={itemNotes[selectedItem.id] || ''}
                onChange={(e) => setItemNotes(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={closeNotesModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveNotesAndAddToCart}
                className="flex-1 bg-abhimata-orange text-white px-4 py-2 rounded-md hover:bg-abhimata-orange-dark"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderEdit
