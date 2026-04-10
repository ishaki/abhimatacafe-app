import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Shield, UserCheck, UserX, KeyRound } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import NavigationHeader from '../components/NavigationHeader'
import Button from '../components/Button'
import { useAuth } from '../contexts/AuthContext'

const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'waitress'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const updateData = { role: formData.role }
        if (formData.password) {
          updateData.new_password = formData.password
        }
        await api.put(`/auth/users/${editingUser.id}`, updateData)
        toast.success('User updated successfully')
      } else {
        await api.post('/auth/users', formData)
        toast.success('User created successfully')
      }
      fetchUsers()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save user')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/auth/users/${id}`)
        toast.success('User deleted successfully')
        fetchUsers()
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete user')
      }
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/auth/users/${resetPasswordUser.id}/reset-password`, {
        new_password: newPassword
      })
      toast.success(`Password reset for ${resetPasswordUser.username}`)
      setResetPasswordUser(null)
      setNewPassword('')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'waitress'
    })
    setEditingUser(null)
    setShowForm(false)
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'waitress':
        return <UserCheck className="h-4 w-4" />
      case 'kitchen':
        return <UserCheck className="h-4 w-4" />
      case 'cashier':
        return <UserCheck className="h-4 w-4" />
      default:
        return <UserX className="h-4 w-4" />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'waitress':
        return 'bg-blue-100 text-blue-800'
      case 'kitchen':
        return 'bg-green-100 text-green-800'
      case 'cashier':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'waitress':
        return 'Waitress'
      case 'kitchen':
        return 'Kitchen Staff'
      case 'cashier':
        return 'Cashier'
      default:
        return role
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleStats = () => {
    const stats = {
      admin: 0,
      waitress: 0,
      kitchen: 0,
      cashier: 0,
      total: users.length
    }
    
    users.forEach(user => {
      if (stats.hasOwnProperty(user.role)) {
        stats[user.role]++
      }
    })
    
    return stats
  }

  const roleStats = getRoleStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-abhimata-orange"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="User Management" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="mt-2 text-gray-600">Manage staff accounts and permissions</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              icon={Plus}
              size="lg"
            >
              Add User
            </Button>
          </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-purple-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-xl font-bold text-purple-600">{roleStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-600">Waitresses</p>
              <p className="text-xl font-bold text-blue-600">{roleStats.waitress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <UserCheck className="h-6 w-6 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-600">Kitchen</p>
              <p className="text-xl font-bold text-green-600">{roleStats.kitchen}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <UserCheck className="h-6 w-6 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-600">Cashiers</p>
              <p className="text-xl font-bold text-yellow-600">{roleStats.cashier}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-abhimata-orange mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-xl font-bold text-abhimata-orange">{roleStats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required={!editingUser}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="waitress">Waitress</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Role Permissions:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Waitress:</strong> Create orders, view menu</li>
                  <li>• <strong>Kitchen:</strong> View pending orders, mark complete</li>
                  <li>• <strong>Cashier:</strong> Process payments, manage expenses, view reports</li>
                  <li>• <strong>Admin:</strong> Full access to all features</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-abhimata-orange text-white py-2 px-4 rounded-md hover:bg-abhimata-orange-dark"
                >
                  {editingUser ? 'Update User' : 'Create User'}
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

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Reset Password for {resetPasswordUser.username}
            </h2>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 characters, must include uppercase, lowercase, and a number
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-abhimata-orange text-white py-2 px-4 rounded-md hover:bg-abhimata-orange-dark"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => { setResetPasswordUser(null); setNewPassword('') }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-abhimata-orange flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                          {currentUser && user.id === currentUser.id && (
                            <span className="ml-1 text-xs text-abhimata-orange font-normal">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{getRoleDisplayName(user.role)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setFormData({
                            username: user.username,
                            password: '',
                            role: user.role
                          })
                          setShowForm(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {(!currentUser || user.id !== currentUser.id) && (
                        <>
                          <button
                            onClick={() => setResetPasswordUser(user)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400 text-sm mt-2">Click "Add User" to create the first user</p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <Shield className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <p className="text-sm text-yellow-700 mt-1">
              User management is restricted to administrators only. Always use strong passwords and 
              regularly review user access permissions.
            </p>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
