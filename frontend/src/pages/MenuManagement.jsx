import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import { TableSkeleton } from '../components/SkeletonLoaders'
import EmptyMenuState from '../components/EmptyStates'
import Button from '../components/Button'

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // all, available, unavailable
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    rating: 5,
    image_url: ''
  })

  useEffect(() => {
    fetchMenuItems()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [menuItems, statusFilter, categoryFilter, searchTerm, sortField, sortDirection])

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

  const applyFiltersAndSort = () => {
    let filtered = [...menuItems]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle different data types
      if (sortField === 'price') {
        aValue = parseFloat(aValue)
        bValue = parseFloat(bValue)
      } else if (sortField === 'rating') {
        aValue = parseInt(aValue)
        bValue = parseInt(bValue)
      } else {
        aValue = aValue?.toString().toLowerCase() || ''
        bValue = bValue?.toString().toLowerCase() || ''
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredItems(filtered)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, formData)
        toast.success('Menu item updated successfully')
      } else {
        await api.post('/menu/', formData)
        toast.success('Menu item created successfully')
      }
      fetchMenuItems()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save menu item')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      price: item.price.toString(),
      rating: item.rating,
      image_url: item.image_url || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await api.delete(`/menu/${id}`)
        toast.success('Menu item deleted successfully')
        fetchMenuItems()
      } catch (error) {
        toast.error('Failed to delete menu item')
      }
    }
  }

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/menu/${id}/status`)
      toast.success('Menu item status updated')
      fetchMenuItems()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      price: '',
      rating: 5,
      image_url: ''
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const categories = ['Food', 'Drinks', 'Desserts', 'Snacks']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader title="Menu Management" />
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
      <NavigationHeader title="Menu Management" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
              <p className="mt-2 text-gray-600">Manage your cafe's menu items and pricing</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              icon={Plus}
              size="lg"
            >
              Add Menu Item
            </Button>
          </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        {/* Active Filters Display */}
        {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Status: {statusFilter}
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Category: {categoryFilter}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
            >
              <option value="all">All Items</option>
              <option value="available">Available Only</option>
              <option value="unavailable">Unavailable Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-abhimata-orange focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Results Count and Clear Filters */}
          <div className="flex items-end justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredItems.length} of {menuItems.length} items
            </div>
            {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryFilter('all')
                }}
                className="text-sm text-abhimata-orange hover:text-abhimata-orange-dark font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                >
                  {[1,2,3,4,5].map(rating => (
                    <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="url"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-abhimata-orange text-white py-2 px-4 rounded-md hover:bg-abhimata-orange-dark"
                >
                  {editingItem ? 'Update' : 'Create'}
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

      {/* Menu Items Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Item {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center">
                            Category {getSortIcon('category')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center">
                            Price {getSortIcon('price')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('rating')}
                        >
                          <div className="flex items-center">
                            Rating {getSortIcon('rating')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center">
                            Status {getSortIcon('status')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="h-12 w-12 rounded-lg object-cover mr-4" 
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-abhimata-orange">
                    Rp {item.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < item.rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.status === 'available' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(item.id)}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                        title={item.status === 'available' ? 'Hide' : 'Show'}
                      >
                        {item.status === 'available' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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
        
        {filteredItems.length === 0 && (
          <EmptyMenuState 
            onAddItem={() => setShowForm(true)}
          />
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

export default MenuManagement
