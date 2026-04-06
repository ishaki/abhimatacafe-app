import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Filter, Search, DollarSign } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import { TableSkeleton } from '../components/SkeletonLoaders'
import EmptyExpensesState from '../components/EmptyStates'
import Button from '../components/Button'

const Expenses = () => {
  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    description: '',
    amount: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [expenses, searchTerm, dateFilter])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate)
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate)
      
      const response = await api.get(`/expenses/?${params.toString()}`)
      setExpenses(response.data)
    } catch (error) {
      toast.error('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...expenses]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.recorder_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredExpenses(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, formData)
        toast.success('Expense updated successfully')
      } else {
        await api.post('/expenses/', formData)
        toast.success('Expense created successfully')
      }
      fetchExpenses()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save expense')
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date,
      item: expense.item,
      description: expense.description || '',
      amount: expense.amount.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`)
        toast.success('Expense deleted successfully')
        fetchExpenses()
      } catch (error) {
        toast.error('Failed to delete expense')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item: '',
      description: '',
      amount: ''
    })
    setEditingExpense(null)
    setShowForm(false)
  }

  const getTotalAmount = () => {
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const clearDateFilter = () => {
    const today = new Date().toISOString().split('T')[0]
    setDateFilter({ startDate: today, endDate: today })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="Expense Management" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
              <div className="h-12 bg-gray-200 rounded animate-pulse w-40"></div>
            </div>
            <TableSkeleton rows={8} columns={6} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Expense Management" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
              <p className="mt-2 text-gray-600">Track and manage your daily business expenses</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              icon={Plus}
              size="lg"
            >
              Add Expense
            </Button>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Active Filters Display */}
            {(searchTerm || dateFilter.startDate !== new Date().toISOString().split('T')[0] || dateFilter.endDate !== new Date().toISOString().split('T')[0]) && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {dateFilter.startDate !== new Date().toISOString().split('T')[0] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      From: {formatDate(dateFilter.startDate)}
                    </span>
                  )}
                  {dateFilter.endDate !== new Date().toISOString().split('T')[0] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      To: {formatDate(dateFilter.endDate)}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by item, description, or recorder..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
                  />
                </div>
              </div>

              {/* Results Count and Actions */}
              <div className="flex items-end justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredExpenses.length} of {expenses.length} expenses
                </div>
                {(searchTerm || dateFilter.startDate !== new Date().toISOString().split('T')[0] || dateFilter.endDate !== new Date().toISOString().split('T')[0]) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      clearDateFilter()
                    }}
                    className="text-sm text-abhimata-orange hover:text-abhimata-orange-dark font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Total Amount Summary */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-abhimata-orange mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Total Expenses</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-abhimata-orange">
                  Rp {getTotalAmount().toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Item/Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Ingredients, Utilities, Rent"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.item}
                      onChange={(e) => setFormData({...formData, item: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-abhimata-orange text-white py-2 px-4 rounded-md hover:bg-abhimata-orange-dark"
                    >
                      {editingExpense ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item/Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recorded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {expense.item}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-abhimata-orange">
                        Rp {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {expense.recorder_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredExpenses.length === 0 && (
              <EmptyExpensesState 
                onAddExpense={() => setShowForm(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Expenses