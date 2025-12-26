// src/pages/dashboard/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Users, Package, DollarSign, BarChart3, AlertCircle,
  CheckCircle, Clock, XCircle, TrendingUp, TrendingDown,
  Plus, Filter, Download, Settings
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import StatsCard from '../../components/common/StatsCard'
import RecentOrdersTable from '../../components/admin/RecentOrdersTable'
import UserList from '../../components/admin/UserList'
import InventoryAlerts from '../../components/admin/InventoryAlerts'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [materials, setMaterials] = useState([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    lowStockItems: 0,
    activeWorkers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('today')

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchAdminData()
  }, [user, userRole, navigate, timeRange])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Build date filter based on timeRange
      const dateFilter = getDateFilter(timeRange)

      // Fetch orders with filters
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(email, profiles(full_name)),
          worker:users!orders_assigned_worker_id_fkey(email, profiles(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (dateFilter) {
        ordersQuery = ordersQuery.gte('created_at', dateFilter)
      }

      const { data: ordersData, error: ordersError } = await ordersQuery
      if (ordersError) throw ordersError

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (usersError) throw usersError

      // Fetch materials for stock alerts
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .lt('current_stock', supabase.raw('minimum_stock * 1.5'))
        .order('current_stock', { ascending: true })

      if (materialsError) throw materialsError

      // Fetch active workers
      const { data: workersData } = await supabase
        .from('job_cards')
        .select('worker_id')
        .neq('status', 'completed')
        .not('worker_id', 'is', null)

      const uniqueWorkers = [...new Set(workersData?.map(w => w.worker_id) || [])]

      // Calculate statistics
      const totalOrders = ordersData?.length || 0
      const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0
      const inProgressOrders = ordersData?.filter(o => 
        ['assigned', 'in_progress', 'draft_submitted'].includes(o.status)
      ).length || 0
      const completedOrders = ordersData?.filter(o => o.status === 'completed').length || 0
      const totalRevenue = ordersData
        ?.filter(o => o.status === 'completed')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const totalUsers = usersData?.length || 0
      const lowStockItems = materialsData?.filter(m => m.current_stock < m.minimum_stock).length || 0
      const activeWorkers = uniqueWorkers.length

      // Calculate trends (simplified - would normally compare with previous period)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const todayOrders = ordersData?.filter(o => 
        new Date(o.created_at).toDateString() === today.toDateString()
      ).length || 0
      
      const yesterdayOrders = ordersData?.filter(o => 
        new Date(o.created_at).toDateString() === yesterday.toDateString()
      ).length || 0

      const orderTrend = yesterdayOrders > 0 
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 
        : todayOrders > 0 ? 100 : 0

      setOrders(ordersData || [])
      setUsers(usersData || [])
      setMaterials(materialsData || [])
      setStats({
        totalOrders,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        totalRevenue,
        totalUsers,
        lowStockItems,
        activeWorkers,
        orderTrend
      })

    } catch (err) {
      console.error('Admin dashboard error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getDateFilter = (range) => {
    const now = new Date()
    switch (range) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return today.toISOString()
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return weekAgo.toISOString()
      case 'month':
        const monthAgo = new Date(now)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return monthAgo.toISOString()
      default:
        return null
    }
  }

  const generateRegistrationCode = async (role) => {
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
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (error) throw error

      setError({ 
        type: 'success', 
        message: `Registration code generated: ${code} (Role: ${role}). Save this code now! It won't be shown again.` 
      })
    } catch (err) {
      console.error('Error generating code:', err)
      setError({ type: 'error', message: 'Failed to generate registration code' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage orders, inventory, and system settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="time-range" className="text-sm font-medium text-gray-700">
                  Time Range:
                </label>
                <select
                  id="time-range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <button
                onClick={() => fetchAdminData()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Alert */}
        {error && (
          <Alert
            type={error.type}
            message={error.message}
            onClose={() => setError(null)}
          />
        )}

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => generateRegistrationCode('admin')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Generate Admin Code
              </button>
              <button
                onClick={() => generateRegistrationCode('worker')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Generate Worker Code
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Users
              </button>
              <button
                onClick={() => navigate('/admin/inventory')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Inventory
              </button>
              <button
                onClick={() => navigate('/admin/analytics')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<Package className="h-6 w-6 text-blue-500" />}
            trend={`${stats.orderTrend.toFixed(1)}%`}
            trendType={stats.orderTrend >= 0 ? 'up' : 'down'}
            color="blue"
          />
          <StatsCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6 text-green-500" />}
            trend="+8.2%"
            trendType="up"
            color="green"
          />
          <StatsCard
            title="Active Users"
            value={stats.totalUsers}
            icon={<Users className="h-6 w-6 text-purple-500" />}
            trend="+12.5%"
            trendType="up"
            color="purple"
          />
          <StatsCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={<AlertCircle className="h-6 w-6 text-red-500" />}
            trend="+2"
            trendType="up"
            color="red"
          />
        </div>

        {/* Alerts Section */}
        {stats.lowStockItems > 0 && (
          <div className="mb-6">
            <InventoryAlerts materials={materials} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate('/orders/track')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all
                  </button>
                  <button
                    onClick={() => {
                      // Export orders logic
                      console.log('Export orders')
                    }}
                    className="text-sm font-medium text-gray-600 hover:text-gray-500"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <RecentOrdersTable 
                orders={orders.slice(0, 10)} 
                onView={(orderId) => navigate(`/orders/${orderId}`)}
              />
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Recent Users</h3>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Manage all
                </button>
              </div>
            </div>
            <div className="p-6">
              <UserList 
                users={users.slice(0, 5)} 
                onView={(userId) => navigate(`/admin/users/${userId}`)}
              />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Status Breakdown */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-4">
              {[
                { status: 'Pending', count: stats.pendingOrders, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                { status: 'In Progress', count: stats.inProgressOrders, color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
                { status: 'Completed', count: stats.completedOrders, color: 'bg-green-100 text-green-800', icon: CheckCircle },
                { status: 'Active Workers', count: stats.activeWorkers, color: 'bg-purple-100 text-purple-800', icon: Users },
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-md ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{item.status}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Avg. Order Value</dt>
                <dd className="text-sm text-gray-900">
                  ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Completion Rate</dt>
                <dd className="text-sm text-gray-900">
                  {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : '0'}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Avg. Processing Time</dt>
                <dd className="text-sm text-gray-900">3.2 days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Customer Satisfaction</dt>
                <dd className="text-sm text-gray-900">94.2%</dd>
              </div>
            </dl>
          </div>

          {/* System Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">API Server</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Storage</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  78% used
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Last Backup</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}