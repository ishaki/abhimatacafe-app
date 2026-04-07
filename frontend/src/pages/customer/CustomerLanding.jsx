import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Coffee, Utensils, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCustomerSession } from '../../contexts/CustomerSessionContext'
import CustomerLayout from './CustomerLayout'

const CustomerLanding = () => {
  const { tableNumber } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading, createSession, cafeSettings, hasActiveOrder } = useCustomerSession()

  const isTakeaway = location.pathname.startsWith('/order/takeaway')
  const parsedTable = isTakeaway ? null : parseInt(tableNumber, 10)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderType, setOrderType] = useState(isTakeaway ? 'take_away' : 'dine_in')
  const [submitting, setSubmitting] = useState(false)

  // If session exists with active order, redirect to tracking
  useEffect(() => {
    if (!loading && session && hasActiveOrder) {
      const base = isTakeaway ? '/order/takeaway' : `/table/${tableNumber}`
      navigate(`${base}/order/${session.order_id}`, { replace: true })
    }
  }, [loading, session, hasActiveOrder, navigate, isTakeaway, tableNumber])

  // If session exists but no order, go to menu
  useEffect(() => {
    if (!loading && session && !hasActiveOrder) {
      const base = isTakeaway ? '/order/takeaway' : `/table/${tableNumber}`
      navigate(`${base}/menu`, { replace: true })
    }
  }, [loading, session, hasActiveOrder, navigate, isTakeaway, tableNumber])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }

    setSubmitting(true)
    try {
      await createSession({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        tableNumber: parsedTable,
        orderType
      })
      const base = isTakeaway ? '/order/takeaway' : `/table/${tableNumber}`
      navigate(`${base}/menu`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start session')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abhimata-orange"></div>
        </div>
      </CustomerLayout>
    )
  }

  // Don't render form if already redirecting
  if (session) return null

  const cafeName = cafeSettings?.cafeName || 'Abhimata Cafe'

  return (
    <CustomerLayout>
      <div className="py-6">
        {/* Welcome card */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-abhimata-orange p-4 rounded-full mb-4">
            <Coffee className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome to {cafeName}</h2>
          {isTakeaway ? (
            <p className="text-gray-500">Takeaway Order</p>
          ) : (
            <div className="inline-block bg-orange-100 text-abhimata-orange font-semibold px-4 py-1 rounded-full mt-2">
              Table {parsedTable}
            </div>
          )}
        </div>

        {/* Guest form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Start Your Order</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 081234567890"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange text-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Order type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                  orderType === 'dine_in'
                    ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Utensils className="h-5 w-5" />
                <span className="font-medium">Dine In</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('take_away')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                  orderType === 'take_away'
                    ? 'border-abhimata-orange bg-orange-50 text-abhimata-orange'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <ShoppingBag className="h-5 w-5" />
                <span className="font-medium">Take Away</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-abhimata-orange text-white py-3 px-4 rounded-lg text-lg font-semibold hover:bg-abhimata-orange-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Starting...' : 'Start Ordering'}
          </button>
        </form>
      </div>
    </CustomerLayout>
  )
}

export default CustomerLanding
