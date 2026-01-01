// src/pages/orders/OrderTracker.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Search, Filter, Package, Clock, CheckCircle,
  AlertCircle, TrendingUp, Eye, Download, RefreshCw
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import OrderCard from '../../components/common/OrderCard'

export default function OrderTracker() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    dateRange: 'all'
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchOrders()
  }, [user, navigate])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, filters])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(email, profiles(full_name)),
          employer:users!orders_assigned_employer_id_fkey(email, profiles(full_name)),
          drafts(status)
        `)
        .order('created_at', { ascending: false })

      // FIX: Strict Role-based filtering logic
      if (userRole === 'customer') {
        ordersQuery = ordersQuery.eq('customer_id', user.id)
      } else if (userRole === 'employer') {
        // Employers see orders specifically assigned to them or those they have job cards for
        ordersQuery = ordersQuery.eq('assigned_employer_id', user.id)
      }
      // Admins bypass filters automatically via the lack of an .eq() call

      const { data: ordersData, error: ordersError } = await ordersQuery

      if (ordersError) throw ordersError
      setOrders(ordersData || [])

    } catch (err) {
      console.error('Error fetching orders:', err)
      setError("Failed to load orders: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let result = [...orders]

    // FIX: Optimized Search logic including null checks for order_number
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(order =>
        (order.order_number?.toLowerCase().includes(term)) ||
        (order.title?.toLowerCase().includes(term)) ||
        (order.customer?.email?.toLowerCase().includes(term)) ||
        (order.customer?.profiles?.full_name?.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(order => order.status === filters.status)
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(order => order.priority === filters.priority)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate = new Date()

      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0,0,0,0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate = null
      }

      if (startDate) {
        result = result.filter(order => new Date(order.created_at) >= startDate)
      }
    }

    setFilteredOrders(result)
  }

  const getStats = () => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      inProgress: orders.filter(o => ['assigned', 'in_progress', 'review'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      overdue: orders.filter(o => {
        if (!o.deadline || o.status === 'completed') return false
        return new Date(o.deadline) < new Date()
      }).length
    }
  }

  const stats = getStats()

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation & Header */}
        <header className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} /> <span className="text-sm font-bold uppercase">Back to Dashboard</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Order Tracker</h1>
              <p className="text-gray-500 font-medium">Monitoring {userRole} activities for 2026</p>
            </div>
            <button
              onClick={fetchOrders}
              className="p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: <Package/>, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Pending', value: stats.pending, icon: <Clock/>, color: 'bg-amber-50 text-amber-600' },
            { label: 'Active', value: stats.inProgress, icon: <TrendingUp/>, color: 'bg-blue-50 text-blue-600' },
            { label: 'Done', value: stats.completed, icon: <CheckCircle/>, color: 'bg-green-50 text-green-600' },
            { label: 'Overdue', value: stats.overdue, icon: <AlertCircle/>, color: 'bg-red-50 text-red-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-2xl font-black dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="Search by ID, title, or customer..."
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-sm dark:text-white outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Under Review</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-sm dark:text-white outline-none cursor-pointer"
            >
              <option value="all">Any Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Order Results */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onView={() => navigate(`/orders/${order.id}`)}
                userRole={userRole}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed dark:border-gray-800">
              <Package className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest">No matching orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}