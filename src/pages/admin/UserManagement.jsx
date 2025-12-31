// src/pages/admin/UserManagement.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Users, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Mail, Calendar
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function UserManagement() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterVerified, setFilterVerified] = useState('all')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({
    role: '',
    email_verified: false
  })

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchUsers()
  }, [user, userRole, navigate])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filterRole, filterVerified])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole)
    }

    // Verification filter
    if (filterVerified !== 'all') {
      const isVerified = filterVerified === 'verified'
      filtered = filtered.filter(u => u.email_verified === isVerified)
    }

    setFilteredUsers(filtered)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: editFormData.role,
          email_verified: editFormData.email_verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)

      if (updateError) throw updateError

      setSuccess('User updated successfully!')
      setShowEditModal(false)
      setEditingUser(null)
      fetchUsers()
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      setError(null)

      // First delete from public.users
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) throw deleteError

      // Note: Deleting from auth.users requires service role key
      // This should be done via a Supabase Edge Function or backend API
      setSuccess('User deleted from database. Note: Auth user still exists and should be removed from Supabase Auth dashboard.')
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err.message || 'Failed to delete user')
    }
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setEditFormData({
      role: user.role,
      email_verified: user.email_verified || false
    })
    setShowEditModal(true)
  }

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    employers: users.filter(u => u.role === 'employer').length,
    admins: users.filter(u => u.role === 'admin').length,
    verified: users.filter(u => u.email_verified).length,
    unverified: users.filter(u => !u.email_verified).length
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Users</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Customers</div>
            <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.customers}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Employers</div>
            <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.employers}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Admins</div>
            <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admins}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Verified</div>
            <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.verified}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Unverified</div>
            <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{stats.unverified}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-lighter text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-lighter text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-lighter text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-lighter divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Users size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-dark-light transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{u.email}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ID: {u.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            : u.role === 'employer'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        }`}>
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.email_verified ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            <CheckCircle size={14} className="mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                            <XCircle size={14} className="mr-1" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar size={14} className="mr-1" />
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                          title="Edit user"
                        >
                          <Edit2 size={18} />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Delete user"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-lighter rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit User</h2>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Mail size={18} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{editingUser.email}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="customer">Customer</option>
                    <option value="employer">Employer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editFormData.email_verified}
                      onChange={(e) => setEditFormData({ ...editFormData, email_verified: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Email Verified</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
