import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import NavigationHeader from '../components/NavigationHeader'
import useOrderCart from '../hooks/useOrderCart'
import MenuBrowser from '../components/order/MenuBrowser'
import NotesModal from '../components/order/NotesModal'
import OrderSummaryBar from '../components/order/OrderSummaryBar'
import OrderDetailsDrawer from '../components/order/OrderDetailsDrawer'

const OrderEdit = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    fetchOrderAndMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const fetchOrderAndMenu = async () => {
    try {
      const [orderResponse, menuResponse] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get('/menu/'),
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

  const submitAddItems = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart')
      return
    }

    setSubmitting(true)
    try {
      const orderData = {
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      }
      await api.post(`/orders/${orderId}/items`, orderData)
      toast.success('Items added to order successfully!')
      resetCart()
      setDrawerOpen(false)
      await fetchOrderAndMenu()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add items to order')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteExistingItem = async (itemId) => {
    try {
      await api.delete(`/orders/${orderId}/items/${itemId}`)
      toast.success('Item removed from order successfully!')
      await fetchOrderAndMenu()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove item from order')
    }
  }

  const canDeleteItem = (item) =>
    order?.status === 'pending' &&
    (item.is_new_addition || user?.role === 'admin')

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

  const itemCount = getItemCount()
  const total = getTotalAmount()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <NavigationHeader title="Edit Order" />
      <div className="p-6">
        <div className="flex items-center mb-6 gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 truncate">
              Edit Order #{order.id}
            </h1>
            <p className="text-gray-600 truncate">
              Table {order.table_number} •{' '}
              {order.customer_name || 'Walk-in Customer'}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-abhimata-orange text-abhimata-orange font-semibold rounded-lg hover:bg-orange-50 transition-colors shrink-0"
          >
            <Receipt className="h-5 w-5" />
            <span className="hidden sm:inline">View Order</span>
          </button>
        </div>

        <MenuBrowser
          menuItems={menuItems}
          onAddItem={openNotesModal}
          title="Add More Items"
        />
      </div>

      <OrderSummaryBar
        itemCount={itemCount}
        total={total}
        onViewDetails={() => setDrawerOpen(true)}
        onSubmit={submitAddItems}
        submitting={submitting}
        submitLabel="Add to Order"
      />

      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="edit"
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onUpdateNotes={updateNotes}
        total={total}
        order={order}
        onDeleteExistingItem={deleteExistingItem}
        canDeleteItem={canDeleteItem}
        onSubmit={submitAddItems}
        submitting={submitting}
        submitLabel="Add to Order"
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

export default OrderEdit
