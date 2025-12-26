// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  LogOut, Plus, Eye, Users, Package, Settings, 
  BarChart3, AlertCircle, RefreshCw, Download, Filter,
  User, Bell, CreditCard, Calendar, CheckCircle, Clock, XCircle
} from 'lucide-react'
import { Alert } from '../components/Alert'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, userRole, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [alertMessage, setAlertMessage] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    fetchDashboardData()
  }, [user, navigate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch orders based on role
      let ordersQuery = supabase.from('orders').select('*')
      
      if (userRole === 'customer') {
        ordersQuery = ordersQuery.eq('customer_id', user.id)
      }

      const { data: ordersData, error: ordersError } = await ordersQuery
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Calculate stats from orders
      const totalOrders = ordersData?.length || 0
      const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0
      const inProgressOrders = ordersData?.filter(o => o.status === 'in_progress').length || 0
      const completedOrders = ordersData?.filter(o => o.status === 'completed').length || 0
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.cost || 0), 0) || 0

      // Admin-only data
      let recentUsersData = []
      let totalUsers = 0
      
      if (userRole === 'admin') {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, role, created_at, email_verified')
          .order('created_at', { ascending: false })
          .limit(5)

        if (usersError) console.error('Error fetching users:', usersError)
        recentUsersData = usersData || []

        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
        totalUsers = usersCount || 0
      }

      setRecentUsers(recentUsersData)
      setStats({
        totalOrders,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        totalRevenue,
        totalUsers
      })

    } catch (err) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Failed to load dashboard data: ' + err.message 
      })
      console.error('Dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      navigate('/login')
    }
  }

  const generateRegistrationCode = async (role) => {
    if (userRole !== 'admin') {
      setAlertMessage({ type: 'error', message: 'Only admins can generate registration codes' })
      return
    }

    try {
      // Generate random code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase()
      
      // Hash the code
      const encoder = new TextEncoder()
      const data = encoder.encode(code)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashedCode = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Insert into database
      const { error } = await supabase
        .from('registration_codes')
        .insert({
          code: hashedCode,
          role: role,
          created_by: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })

      if (error) throw error

      setAlertMessage({ 
        type: 'success', 
        message: `Registration code generated: ${code} (Role: ${role}). Save this code now! It won't be shown again.` 
      })
    } catch (err) {
      console.error('Error generating code:', err)
      setAlertMessage({ type: 'error', message: 'Failed to generate registration code' })
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-500', icon: <Clock size={14} /> },
      in_progress: { color: 'bg-blue-500/20 text-blue-500', icon: <RefreshCw size={14} /> },
      completed: { color: 'bg-green-500/20 text-green-500', icon: <CheckCircle size={14} /> },
      cancelled: { color: 'bg-red-500/20 text-red-500', icon: <XCircle size={14} /> }
    }
    
    return badges[status] || { color: 'bg-gray-500/20 text-gray-500', icon: null }
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Awarjana Creations</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-400">
                {userRole === 'customer' && 'Customer Dashboard'}
                {userRole === 'worker' && 'Worker Dashboard'}
                {userRole === 'admin' && 'Admin Dashboard'}
              </p>
              <span className={`text-xs px-2 py-1 rounded ${
                userRole === 'admin' ? 'bg-purple-500/20 text-purple-500' :
                userRole === 'worker' ? 'bg-blue-500/20 text-blue-500' :
                'bg-green-500/20 text-green-500'
              }`}>
                {userRole}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-sm text-gray-400 truncate max-w-[200px] sm:max-w-none">
              <User size={14} className="inline mr-1" /> {user?.email}
            </span>
            <button
              onClick={() => fetchDashboardData()}
              className="btn-secondary flex items-center gap-2 text-sm"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}

        {/* Admin Quick Actions */}
        {userRole === 'admin' && (
          <div className="mb-6 p-4 card flex flex-wrap gap-3">
            <button
              onClick={() => generateRegistrationCode('admin')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
            >
              <Users size={16} />
              Generate Admin Code
            </button>
            <button
              onClick={() => generateRegistrationCode('worker')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Users size={16} />
              Generate Worker Code
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
            >
              <Settings size={16} />
              Manage Users
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-primary">{stats.totalOrders}</p>
              </div>
              <Package className="text-primary" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pendingOrders}</p>
              </div>
              <AlertCircle className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">In Progress</p>
                <p className="text-3xl font-bold text-blue-500">{stats.inProgressOrders}</p>
              </div>
              <RefreshCw className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-500">{stats.completedOrders}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          {/* Admin-only stats */}
          {userRole === 'admin' && (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-purple-500">
                      ₹{stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <CreditCard className="text-purple-500" size={32} />
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Total Users</p>
                    <p className="text-3xl font-bold text-blue-500">{stats.totalUsers}</p>
                  </div>
                  <Users className="text-blue-500" size={32} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          {userRole === 'customer' && (
            <button
              onClick={() => navigate('/new-order')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              New Order
            </button>
          )}
          
          <button
            onClick={() => navigate('/profile')}
            className="btn-secondary flex items-center gap-2"
          >
            <User size={18} />
            My Profile
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => navigate('/admin/reports')}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Export Reports
            </button>
          )}
        </div>

        {/* Two Column Layout for Admin */}
        {userRole === 'admin' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Orders Table */}
            <div className="card">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Package size={20} />
                  Recent Orders
                </h2>
                
                {loading ? (
                  <p className="text-gray-400">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="text-gray-400">No orders found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-300">Order ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-300">Customer</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-300">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-300">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => {
                          const badge = getStatusBadge(order.status)
                          return (
                            <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                              <td className="py-3 px-4 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                              <td className="py-3 px-4">
                                {order.customer_email || 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${badge.color}`}>
                                  {badge.icon}
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">₹{order.cost?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => navigate(`/order/${order.id}`)}
                                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Users */}
            <div className="card">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Recent Users
                </h2>
                
                {recentUsers.length === 0 ? (
                  <p className="text-gray-400">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {recentUsers.map((userItem) => (
                      <div key={userItem.id} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                        <div>
                          <p className="font-medium text-sm">{userItem.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              userItem.role === 'admin' ? 'bg-purple-500/20 text-purple-500' :
                              userItem.role === 'worker' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-green-500/20 text-green-500'
                            }`}>
                              {userItem.role}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              userItem.email_verified ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {userItem.email_verified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Customer/Worker View - Full width orders table */
          <div className="card">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">My Orders</h2>
              
              {loading ? (
                <p className="text-gray-400">Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400">No orders yet</p>
                  {userRole === 'customer' && (
                    <button
                      onClick={() => navigate('/new-order')}
                      className="mt-4 btn-primary flex items-center gap-2 mx-auto"
                    >
                      <Plus size={18} />
                      Place Your First Order
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Order ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Dimensions</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Cost</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const badge = getStatusBadge(order.status)
                        return (
                          <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                            <td className="py-3 px-4 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                            <td className="py-3 px-4">
                              {order.height} x {order.width}
                            </td>
                            <td className="py-3 px-4">₹{order.cost?.toFixed(2) || '0.00'}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${badge.color}`}>
                                {badge.icon}
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => navigate(`/order/${order.id}`)}
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}