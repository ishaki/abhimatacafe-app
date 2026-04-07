import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Search, Plus, Minus, ShoppingCart, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCustomerSession } from '../../contexts/CustomerSessionContext'
import CustomerLayout from './CustomerLayout'

const CustomerMenu = () => {
  const { tableNumber } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading: sessionLoading, customerApi, cafeSettings, hasActiveOrder } = useCustomerSession()

  const isTakeaway = location.pathname.startsWith('/order/takeaway')
  const basePath = isTakeaway ? '/order/takeaway' : `/table/${tableNumber}`

  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [noteText, setNoteText] = useState('')

  const currency = cafeSettings?.currency || 'IDR'

  // Redirect if no session
  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate(basePath, { replace: true })
    }
  }, [sessionLoading, session, navigate, basePath])

  // If already has order, redirect to tracking
  useEffect(() => {
    if (!sessionLoading && session && hasActiveOrder) {
      navigate(`${basePath}/order/${session.order_id}`, { replace: true })
    }
  }, [sessionLoading, session, hasActiveOrder, navigate, basePath])

  // Fetch menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const resp = await customerApi.get('/customer/menu')
        setMenuItems(resp.data.items || [])
        setCategories(resp.data.categories || {})
      } catch (err) {
        toast.error('Failed to load menu')
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [customerApi])

  const categoryNames = ['All', ...Object.keys(categories)]

  const filteredItems = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Cart actions
  const openAddModal = (item) => {
    setSelectedItem(item)
    setNoteText('')
    setShowNotesModal(true)
  }

  const confirmAdd = () => {
    if (!selectedItem) return
    const existing = cart.find(c => c.menu_item_id === selectedItem.id && c.notes === noteText)
    if (existing) {
      setCart(cart.map(c =>
        c.menu_item_id === selectedItem.id && c.notes === noteText
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ))
    } else {
      setCart([...cart, {
        menu_item_id: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
        quantity: 1,
        notes: noteText
      }])
    }
    toast.success(`${selectedItem.name} added`)
    setShowNotesModal(false)
    setSelectedItem(null)
  }

  const updateQty = (idx, delta) => {
    setCart(cart.map((item, i) => {
      if (i !== idx) return item
      const newQty = item.quantity + delta
      return newQty > 0 ? { ...item, quantity: newQty } : item
    }).filter((item, i) => i !== idx || item.quantity + delta > 0))
    // Remove if qty goes to 0
    setCart(prev => {
      const updated = [...prev]
      if (updated[idx] && updated[idx].quantity + delta <= 0) {
        updated.splice(idx, 1)
      } else if (updated[idx]) {
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + delta }
      }
      return updated
    })
  }

  const removeItem = (idx) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (amount) => {
    if (currency === 'IDR') return `Rp ${amount.toLocaleString()}`
    return `${currency} ${amount.toLocaleString()}`
  }

  // Submit order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return

    setSubmitting(true)
    try {
      const resp = await customerApi.post('/customer/orders', {
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes || ''
        }))
      })
      const orderId = resp.data.order?.id
      toast.success('Order submitted!')
      setCart([])
      setShowCart(false)
      if (orderId) {
        navigate(`${basePath}/order/${orderId}`)
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit order'
      toast.error(msg)
      // If already has order, redirect to add items flow
      if (err.response?.status === 409 && err.response?.data?.order_id) {
        navigate(`${basePath}/order/${err.response.data.order_id}`)
      }
    } finally {
      setSubmitting(false)
    }
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

  if (!session) return null

  return (
    <CustomerLayout>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search menu..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category tabs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {categoryNames.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-abhimata-orange text-white'
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No items found</div>
      ) : (
        <div className="space-y-3 pb-24">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🍽</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-abhimata-orange font-bold text-sm">{formatPrice(item.price)}</span>
                  <button
                    onClick={() => openAddModal(item)}
                    className="bg-abhimata-orange text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-abhimata-orange-dark flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 pb-4">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-abhimata-orange text-white py-3.5 px-5 rounded-xl shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
              </div>
              <span className="font-bold">{formatPrice(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)} />
          <div className="relative mt-auto bg-white rounded-t-2xl max-h-[80vh] flex flex-col max-w-lg mx-auto w-full">
            {/* Cart header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Your Order</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-500 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                    {item.notes && (
                      <p className="text-xs text-orange-600 mt-0.5">{item.notes}</p>
                    )}
                    <p className="text-sm font-bold text-abhimata-orange mt-1">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) removeItem(idx)
                        else setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c))
                      }}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      {item.quantity <= 1 ? <Trash2 className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c))}
                      className="w-7 h-7 rounded-full bg-abhimata-orange text-white flex items-center justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div className="border-t p-4 space-y-2">
              {cafeSettings?.showPriceBreakdown ? (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  {cafeSettings.taxRate > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax ({cafeSettings.taxRate}%)</span>
                      <span>{formatPrice(Math.round(cartTotal * cafeSettings.taxRate / 100))}</span>
                    </div>
                  )}
                  {cafeSettings.serviceCharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Service ({cafeSettings.serviceCharge}%)</span>
                      <span>{formatPrice(Math.round(cartTotal * cafeSettings.serviceCharge / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total</span>
                    <span className="text-abhimata-orange">
                      {formatPrice(Math.round(cartTotal * (1 + (cafeSettings.taxRate || 0) / 100 + (cafeSettings.serviceCharge || 0) / 100)))}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-abhimata-orange">{formatPrice(cartTotal)}</span>
                </div>
              )}

              <button
                onClick={handleSubmitOrder}
                disabled={submitting || cart.length === 0}
                className="w-full bg-abhimata-orange text-white py-3.5 rounded-xl text-base font-semibold hover:bg-abhimata-orange-dark disabled:opacity-50 transition-colors mt-2"
              >
                {submitting ? 'Submitting...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {showNotesModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowNotesModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5">
            <h3 className="font-bold text-lg mb-1">{selectedItem.name}</h3>
            <p className="text-abhimata-orange font-semibold text-sm mb-3">{formatPrice(selectedItem.price)}</p>
            {selectedItem.description && (
              <p className="text-sm text-gray-500 mb-4">{selectedItem.description}</p>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
            <textarea
              placeholder="e.g. No onions, Extra spicy..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange resize-none text-sm"
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNotesModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="flex-1 bg-abhimata-orange text-white py-2.5 rounded-lg font-medium hover:bg-abhimata-orange-dark"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}

export default CustomerMenu
