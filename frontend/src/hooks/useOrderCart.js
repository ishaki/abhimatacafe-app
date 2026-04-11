import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

/**
 * Shared cart + notes-modal state for OrderCreation and OrderEdit.
 *
 * Owns:
 *  - cart: [{ menu_item_id, name, price, quantity, notes }]
 *  - notes modal (which item, draft text)
 *  - computed total
 *
 * Does NOT own: order form fields, menu items fetching, submit behavior —
 * those differ between create and edit flows and live in the page.
 */
export default function useOrderCart(initialCart = []) {
  const [cart, setCart] = useState(initialCart)
  const [itemNotes, setItemNotes] = useState({})
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const addToCart = useCallback((item, notes = '') => {
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.menu_item_id === item.id && c.notes === notes
      )
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id && c.notes === notes
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes,
        },
      ]
    })
    toast.success(`${item.name} added to cart${notes ? ' with notes' : ''}`)
  }, [])

  const openNotesModal = useCallback((item) => {
    setSelectedItem(item)
    setShowNotesModal(true)
  }, [])

  const closeNotesModal = useCallback(() => {
    setShowNotesModal(false)
    setSelectedItem(null)
  }, [])

  const saveNotesAndAddToCart = useCallback(() => {
    if (!selectedItem) return
    const notes = itemNotes[selectedItem.id] || ''
    addToCart(selectedItem, notes)
    setItemNotes((prev) => ({ ...prev, [selectedItem.id]: '' }))
    closeNotesModal()
  }, [selectedItem, itemNotes, addToCart, closeNotesModal])

  const setNotesDraft = useCallback((itemId, notes) => {
    setItemNotes((prev) => ({ ...prev, [itemId]: notes }))
  }, [])

  const removeFromCart = useCallback((itemId, notes = '') => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.menu_item_id === itemId && item.notes === notes)
      )
    )
  }, [])

  const updateQuantity = useCallback(
    (itemId, newQuantity, notes = '') => {
      if (newQuantity <= 0) {
        removeFromCart(itemId, notes)
        return
      }
      setCart((prev) =>
        prev.map((item) =>
          item.menu_item_id === itemId && item.notes === notes
            ? { ...item, quantity: newQuantity }
            : item
        )
      )
    },
    [removeFromCart]
  )

  const updateNotes = useCallback((itemId, notes, oldNotes = '') => {
    setCart((prev) =>
      prev.map((item) =>
        item.menu_item_id === itemId && item.notes === oldNotes
          ? { ...item, notes }
          : item
      )
    )
  }, [])

  const getTotalAmount = useCallback(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const getItemCount = useCallback(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const resetCart = useCallback(() => {
    setCart([])
    setItemNotes({})
  }, [])

  return {
    cart,
    itemNotes,
    showNotesModal,
    selectedItem,
    addToCart,
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
  }
}
