// src/pages/admin/AnalyticsReports.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, Calendar, Download
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function AnalyticsReports() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('30') // days
  const [analytics, setAnalytics] = useState({
    orders: {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    },
    revenue: {
      total: 0,
      thisMonth: 0,
      lastMonth: 0,
      growth: 0
    },
    users: {
      total: 0,
      customers: 0,
      workers: 0,
      admins: 0,
      newThisMonth: 0
    },
    materials: {
      total: 0,
      lowStock: 0,
      outOfStock: 0
    },
    topMaterials: [],
    recentActivity: []
  })

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchAnalytics()
  }, [user, userRole, navigate, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const daysAgo = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())

      if (ordersError) throw ordersError

      // Fetch all orders for revenue calculation
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')

      if (allOrdersError) throw allOrdersError

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')

      if (usersError) throw usersError

      // Fetch materials
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('*')

      if (materialsError) throw materialsError

      // Fetch material usage for top materials
      const { data: materialUsage, error: materialUsageError } = await supabase
        .from('material_usage')
        .select(`
          material_id,
          quantity_used,
          materials(name)
        `)
        .gte('created_at', startDate.toISOString())

      if (materialUsageError) throw materialUsageError

      // Calculate analytics
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const thisMonthRevenue = allOrders
        ?.filter(o => new Date(o.created_at) >= thisMonthStart && o.status === 'completed')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0

      const lastMonthRevenue = allOrders
        ?.filter(o => 
          new Date(o.created_at) >= lastMonthStart && 
          new Date(o.created_at) <= lastMonthEnd &&
          o.status === 'completed'
        )
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : 0

      const totalRevenue = allOrders
        ?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0

      // Top materials
      const materialMap = {}
      materialUsage?.forEach(mu => {
        const materialName = mu.materials?.name || 'Unknown'
        if (!materialMap[materialName]) {
          materialMap[materialName] = 0
        }
        materialMap[materialName] += mu.quantity_used
      })

      const topMaterials = Object.entries(materialMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      setAnalytics({
        orders: {
          total: orders?.length || 0,
          pending: orders?.filter(o => o.status === 'pending').length || 0,
          in_progress: orders?.filter(o => ['assigned', 'in_progress', 'draft_submitted'].includes(o.status)).length || 0,
          completed: orders?.filter(o => o.status === 'completed').length || 0,
          cancelled: orders?.filter(o => o.status === 'cancelled').length || 0
        },
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: parseFloat(revenueGrowth)
        },
        users: {
          total: users?.length || 0,
          customers: users?.filter(u => u.role === 'customer').length || 0,
          workers: users?.filter(u => u.role === 'worker').length || 0,
          admins: users?.filter(u => u.role === 'admin').length || 0,
          newThisMonth: users?.filter(u => new Date(u.created_at) >= thisMonthStart).length || 0
        },
        materials: {
          total: materials?.length || 0,
          lowStock: materials?.filter(m => m.stock_quantity <= m.low_stock_threshold && m.stock_quantity > 0).length || 0,
          outOfStock: materials?.filter(m => m.stock_quantity === 0).length || 0
        },
        topMaterials,
        recentActivity: orders?.slice(0, 10) || []
      })
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      time_range: `${timeRange} days`,
      analytics
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Business insights and performance metrics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-lighter text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={exportReport}
              className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
            >
              <Download size={20} className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Revenue Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    Rs. {analytics.revenue.total.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    Rs. {analytics.revenue.thisMonth.toLocaleString()}
                  </p>
                </div>
                <Calendar className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Month</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    Rs. {analytics.revenue.lastMonth.toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-12 w-12 text-purple-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Growth</p>
                  <p className={`mt-2 text-3xl font-bold ${analytics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth}%
                  </p>
                </div>
                {analytics.revenue.growth >= 0 ? (
                  <TrendingUp className="h-12 w-12 text-green-500" />
                ) : (
                  <TrendingDown className="h-12 w-12 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Orders (Last {timeRange} days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{analytics.orders.total}</p>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.orders.pending}</p>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.orders.in_progress}</p>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
              <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{analytics.orders.completed}</p>
            </div>
            <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancelled</p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{analytics.orders.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Users and Materials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Users */}
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="mr-2" size={24} />
              User Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Users</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.users.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Customers</span>
                <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">{analytics.users.customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Workers</span>
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">{analytics.users.workers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Admins</span>
                <span className="text-xl font-semibold text-purple-600 dark:text-purple-400">{analytics.users.admins}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">New This Month</span>
                <span className="text-xl font-semibold text-primary-600 dark:text-primary-400">{analytics.users.newThisMonth}</span>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Package className="mr-2" size={24} />
              Inventory Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Materials</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.materials.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Low Stock</span>
                <span className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">{analytics.materials.lowStock}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Out of Stock</span>
                <span className="text-xl font-semibold text-red-600 dark:text-red-400">{analytics.materials.outOfStock}</span>
              </div>
            </div>

            {/* Top Materials */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Used Materials</h4>
              <div className="space-y-2">
                {analytics.topMaterials.length > 0 ? (
                  analytics.topMaterials.map((material, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{material.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{material.quantity} units</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No material usage data</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{order.order_number || `#${order.id}`}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        Rs. {parseFloat(order.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No recent orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
