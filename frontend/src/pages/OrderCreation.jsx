import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import useOrderCart from '../hooks/useOrderCart'
import MenuBrowser from '../components/order/MenuBrowser'
import NotesModal from '../components/order/NotesModal'
import OrderSummaryBar from '../components/order/OrderSummaryBar'
import OrderDetailsDrawer from '../components/order/OrderDetailsDrawer'
import ConfirmOrderModal from '../components/order/ConfirmOrderModal'

const OrderCreation = () => {
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [showTableNumberError, setShowTableNumberError] = useState(false)
  const [orderForm, setOrderForm] = useState({
    table_number: '',
    customer_name: '',
    order_type: 'dine_in',
  })
  const tableNumberInputRef = useRef(null)

  const {
    cart,
    itemNotes,
    showNotesModal,
    selectedItem,
    openNotesModal,
    closeNotesModal,
    saveNotesAndAddToCart,
    setNotesDraft,
    removeFromCart,
    updateQuantity,
    updateNotes,
    getTotalAmount,
    getItemCount,
    resetCart,
  } = useOrderCart()

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await api.get('/menu/')
        setMenuItems(response.data)
      } catch (error) {
        toast.error('Failed to fetch menu items')
      } finally {
        setLoading(false)
      }
    }
    fetchMenuItems()
  }, [])

  useEffect(() => {
    if (showTableNumberError && drawerOpen && tableNumberInputRef.current) {
      tableNumberInputRef.current.focus()
    }
  }, [showTableNumberError, drawerOpen])

  /**
   * Validate the cart + form. If something is missing, surface it in
   * the most useful place; if everything is valid, open the confirmation
   * modal so the user can review before the order is sent.
   */
  const requestSubmit = () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart')
      return
    }

    if (!orderForm.table_number) {
      setShowTableNumberError(true)
      // Open the drawer if not already open so the user can see the
      // highlighted field. The focus effect handles the rest.
      if (!drawerOpen) setDrawerOpen(true)
      return
    }

    setConfirmOpen(true)
  }

  const confirmSubmit = async () => {
    setSubmitting(true)
    try {
      const orderData = {
        ...orderForm,
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      }
      await api.post('/orders/', orderData)
      toast.success('Order created successfully!')

      setOrderForm({
        table_number: '',
        customer_name: '',
        order_type: 'dine_in',
      })
      resetCart()
      setShowTableNumberError(false)
      setDrawerOpen(false)
      setConfirmOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFormChange = (newForm) => {
    setOrderForm(newForm)
    if (showTableNumberError && newForm.table_number) {
      setShowTableNumberError(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
      </div>
    )
  }

  const itemCount = getItemCount()
  const total = getTotalAmount()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
        </div>

        <MenuBrowser menuItems={menuItems} onAddItem={openNotesModal} />
      </div>

      <OrderSummaryBar
        itemCount={itemCount}
        total={total}
        onViewDetails={() => setDrawerOpen(true)}
        onSubmit={requestSubmit}
        submitting={submitting}
        submitLabel="Submit Order"
      />

      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="create"
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onUpdateNotes={updateNotes}
        total={total}
        orderForm={orderForm}
        onFormChange={handleFormChange}
        showTableNumberError={showTableNumberError}
        tableNumberInputRef={tableNumberInputRef}
        onSubmit={requestSubmit}
        submitting={submitting}
        submitLabel="Submit Order"
      />

      <ConfirmOrderModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSubmit}
        orderForm={orderForm}
        itemCount={itemCount}
        total={total}
        submitting={submitting}
      />

      {showNotesModal && selectedItem && (
        <NotesModal
          item={selectedItem}
          notes={itemNotes[selectedItem.id] || ''}
          onNotesChange={(v) => setNotesDraft(selectedItem.id, v)}
          onConfirm={saveNotesAndAddToCart}
          onClose={closeNotesModal}
        />
      )}
    </div>
  )
}

export default OrderCreation
