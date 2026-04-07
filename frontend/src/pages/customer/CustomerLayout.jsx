import { Coffee } from 'lucide-react'
import { useCustomerSession } from '../../contexts/CustomerSessionContext'

const CustomerLayout = ({ children }) => {
  const { cafeSettings } = useCustomerSession()
  const cafeName = cafeSettings?.cafeName || 'Abhimata Cafe'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center space-x-3">
          <div className="bg-abhimata-orange p-2 rounded-full">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">{cafeName}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {children}
      </main>
    </div>
  )
}

export default CustomerLayout
