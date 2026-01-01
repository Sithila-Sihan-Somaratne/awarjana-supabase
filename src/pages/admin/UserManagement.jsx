// src/pages/admin/UserManagement.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Users, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Mail, ShieldAlert, RefreshCw
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function UserManagement() {
  const navigate = useNavigate()
  const { user: currentUser, userRole } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({
    role: '',
    full_name: ''
  })

  useEffect(() => {
    if (!currentUser || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchUsers()
  }, [currentUser, userRole])

  useEffect(() => {
    applyFilters()
  }, [users, searchTerm, filterRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // FIX: Fetching profile data along with core user role/email
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...users]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(u => 
        u.email.toLowerCase().includes(term) || 
        u.profiles?.full_name?.toLowerCase().includes(term)
      )
    }

    if (filterRole !== 'all') {
      result = result.filter(u => u.role === filterRole)
    }

    setFilteredUsers(result)
  }

  const handleEditClick = (user) => {
    setEditingUser(user)
    setEditFormData({
      role: user.role,
      full_name: user.profiles?.full_name || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Update Role in users table
      const { error: userError } = await supabase
        .from('users')
        .update({ role: editFormData.role })
        .eq('id', editingUser.id)

      if (userError) throw userError

      // 2. Update Name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editFormData.full_name })
        .eq('id', editingUser.id)

      if (profileError) throw profileError

      setSuccess("User updated successfully")
      setShowEditModal(false)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id) => {
    // FIX: Safety check to prevent self-deletion
    if (id === currentUser.id) {
      setError("Critical Error: You cannot delete your own admin account.")
      return
    }

    if (!window.confirm("Are you sure? This will revoke all access for this user.")) return

    try {
      const { error: delError } = await supabase.from('users').delete().eq('id', id)
      if (delError) throw delError
      setSuccess("User removed from system")
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading && users.length === 0) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Team & Clients</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">User Access Management</p>
          </div>
          <button onClick={fetchUsers} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 shadow-sm">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search by name or email..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold text-xs dark:text-white border-none"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="employer">Employers</option>
            <option value="customer">Customers</option>
          </select>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-6" />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-6" />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Users size={24} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditClick(u)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <Edit2 size={16} className="text-gray-400" />
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="font-black text-lg dark:text-white uppercase tracking-tight">{u.profiles?.full_name || 'No Name Set'}</h3>
              <p className="text-xs text-gray-500 font-medium mb-4 flex items-center gap-1"><Mail size={12}/> {u.email}</p>
              
              <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                  u.role === 'admin' ? 'bg-red-100 text-red-600' : 
                  u.role === 'employer' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {u.role}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Joined {new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border dark:border-gray-800">
            <div className="flex items-center gap-3 mb-8">
              <ShieldAlert className="text-indigo-600" size={28} />
              <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Edit User Access</h2>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  className="w-full p-4 mt-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
                <select 
                  className="w-full p-4 mt-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white outline-none cursor-pointer"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                >
                  <option value="customer">Customer</option>
                  <option value="employer">Employer (Staff)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                  SAVE CHANGES
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl font-black">
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}