import { Coffee, ShoppingCart, ChefHat, CreditCard, DollarSign, BarChart3, Users, Settings, Plus } from 'lucide-react'

const EmptyState = ({ 
  type = 'default', 
  title, 
  description, 
  actionLabel, 
  onAction, 
  icon: CustomIcon,
  showAction = true 
}) => {
  const getIconAndColors = () => {
    switch (type) {
      case 'menu':
        return {
          icon: Coffee,
          colors: 'text-orange-400',
          bgColors: 'bg-orange-50'
        }
      case 'orders':
        return {
          icon: ShoppingCart,
          colors: 'text-blue-400',
          bgColors: 'bg-blue-50'
        }
      case 'kitchen':
        return {
          icon: ChefHat,
          colors: 'text-green-400',
          bgColors: 'bg-green-50'
        }
      case 'billing':
        return {
          icon: CreditCard,
          colors: 'text-purple-400',
          bgColors: 'bg-purple-50'
        }
      case 'expenses':
        return {
          icon: DollarSign,
          colors: 'text-yellow-400',
          bgColors: 'bg-yellow-50'
        }
      case 'reports':
        return {
          icon: BarChart3,
          colors: 'text-indigo-400',
          bgColors: 'bg-indigo-50'
        }
      case 'users':
        return {
          icon: Users,
          colors: 'text-pink-400',
          bgColors: 'bg-pink-50'
        }
      case 'settings':
        return {
          icon: Settings,
          colors: 'text-gray-400',
          bgColors: 'bg-gray-50'
        }
      default:
        return {
          icon: Coffee,
          colors: 'text-abhimata-orange',
          bgColors: 'bg-orange-50'
        }
    }
  }

  const { icon: Icon, colors, bgColors } = getIconAndColors()
  const DisplayIcon = CustomIcon || Icon

  return (
    <div className="text-center py-12 px-6">
      <div className={`mx-auto h-24 w-24 ${bgColors} rounded-full flex items-center justify-center mb-6`}>
        <DisplayIcon className={`h-12 w-12 ${colors}`} />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title || 'No data available'}
      </h3>
      
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        {description || 'Get started by adding your first item.'}
      </p>
      
      {showAction && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-abhimata-orange hover:bg-abhimata-orange-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abhimata-orange transition-colors touch-manipulation min-h-[48px] min-w-[48px]"
        >
          <Plus className="h-5 w-5 mr-2" />
          {actionLabel || 'Add New Item'}
        </button>
      )}
    </div>
  )
}

// Specific empty state components for different contexts
export const EmptyMenuState = ({ onAddItem }) => (
  <EmptyState
    type="menu"
    title="No menu items found"
    description="Start building your menu by adding delicious items that your customers will love."
    actionLabel="Add Menu Item"
    onAction={onAddItem}
  />
)

export const EmptyOrdersState = ({ onCreateOrder }) => (
  <EmptyState
    type="orders"
    title="No orders yet"
    description="Create your first order to start serving customers and tracking sales."
    actionLabel="Create Order"
    onAction={onCreateOrder}
  />
)

export const EmptyKitchenState = () => (
  <EmptyState
    type="kitchen"
    title="All caught up!"
    description="No pending orders. The kitchen is ready for the next order."
    showAction={false}
  />
)

export const EmptyBillingState = () => (
  <EmptyState
    type="billing"
    title="No orders ready for payment"
    description="All orders are either pending or already paid."
    showAction={false}
  />
)

export const EmptyExpensesState = ({ onAddExpense }) => (
  <EmptyState
    type="expenses"
    title="No expenses recorded"
    description="Start tracking your daily expenses to better understand your business costs."
    actionLabel="Add Expense"
    onAction={onAddExpense}
  />
)

export const EmptyReportsState = ({ onGenerateReport }) => (
  <EmptyState
    type="reports"
    title="No report data"
    description="Generate your first report to see insights about your business performance."
    actionLabel="Generate Report"
    onAction={onGenerateReport}
  />
)

export const EmptyUsersState = ({ onAddUser }) => (
  <EmptyState
    type="users"
    title="No users found"
    description="Add team members to your cafe management system to get started."
    actionLabel="Add User"
    onAction={onAddUser}
  />
)

export default EmptyState
