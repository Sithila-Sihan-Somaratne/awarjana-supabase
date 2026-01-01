// src/pages/admin/AnalyticsReports.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, Calendar, Download, RefreshCw
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function AnalyticsReports() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('30')
  const [analytics, setAnalytics] = useState({
    orders: { total: 0, pending: 0, in_progress: 0, completed: 0, review: 0 },
    revenue: { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 },
    users: { total: 0, customers: 0, employers: 0 },
    materials: { total: 0, lowStock: 0 },
    recentOrders: []
  })

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch Orders for Revenue and Status charts
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (oErr) throw oErr

      // 2. Fetch User Stats
      const { data: usersData, error: uErr } = await supabase.from('users').select('role')
      if (uErr) throw uErr

      // 3. Fetch Material Stats
      const { data: matData, error: mErr } = await supabase.from('materials').select('stock_quantity, low_stock_threshold')
      if (mErr) throw mErr

      // LOGIC: Calculate Revenue
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const completedOrders = orders.filter(o => o.status === 'completed')
      
      const thisMonthRev = completedOrders
        .filter(o => new Date(o.created_at) >= thisMonthStart)
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)

      const lastMonthRev = completedOrders
        .filter(o => {
          const d = new Date(o.created_at)
          return d >= lastMonthStart && d <= lastMonthEnd
        })
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)

      // FIX: Prevent NaN if lastMonthRev is 0
      const growthPct = lastMonthRev === 0 
        ? (thisMonthRev > 0 ? 100 : 0) 
        : ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100

      setAnalytics({
        orders: {
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          in_progress: orders.filter(o => o.status === 'in_progress').length,
          completed: orders.filter(o => o.status === 'completed').length,
          review: orders.filter(o => o.status === 'review').length
        },
        revenue: {
          total: completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
          thisMonth: thisMonthRev,
          lastMonth: lastMonthRev,
          growth: growthPct
        },
        users: {
          total: usersData.length,
          customers: usersData.filter(u => u.role === 'customer').length,
          employers: usersData.filter(u => u.role === 'employer').length
        },
        materials: {
          total: matData.length,
          lowStock: matData.filter(m => m.stock_quantity <= m.low_stock_threshold).length
        },
        recentOrders: orders.slice(0, 5)
      })

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Business Intelligence</h1>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Performance Metrics 2026</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="p-3 bg-white dark:bg-gray-800 border-none rounded-xl font-bold text-xs shadow-sm dark:text-white outline-none"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last Quarter</option>
              <option value="365">Year to Date</option>
            </select>
            <button onClick={fetchAnalytics} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><DollarSign/></div>
              <span className={`flex items-center text-xs font-black ${analytics.revenue.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analytics.revenue.growth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {Math.abs(analytics.revenue.growth).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase">Monthly Revenue</p>
            <h2 className="text-2xl font-black dark:text-white">Rs. {analytics.revenue.thisMonth.toLocaleString()}</h2>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4"><Package/></div>
            <p className="text-xs font-bold text-gray-400 uppercase">Total Completed</p>
            <h2 className="text-2xl font-black dark:text-white">{analytics.orders.completed}</h2>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4"><Users/></div>
            <p className="text-xs font-bold text-gray-400 uppercase">Active Staff</p>
            <h2 className="text-2xl font-black dark:text-white">{analytics.users.employers}</h2>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl w-fit mb-4"><Calendar/></div>
            <p className="text-xs font-black text-gray-400 uppercase">Low Stock Alerts</p>
            <h2 className="text-2xl font-black text-red-600">{analytics.materials.lowStock}</h2>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 p-8 shadow-sm">
          <h3 className="text-xl font-black dark:text-white mb-6 uppercase tracking-tighter">Performance History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase border-b dark:border-gray-800">
                  <th className="pb-4">Order Number</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Value</th>
                  <th className="pb-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {analytics.recentOrders.map(order => (
                  <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 font-bold text-sm dark:text-white">{order.order_number}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                        order.status === 'completed' ? 'bg-green-100 text-green-600' : 
                        order.status === 'review' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-sm dark:text-gray-300">Rs. {parseFloat(order.total_amount).toLocaleString()}</td>
                    <td className="py-4 text-right text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}