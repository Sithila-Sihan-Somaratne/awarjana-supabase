import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Package, Clock, CheckCircle, AlertCircle, Plus, DollarSign, Calendar
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import OrderCard from '../../components/common/OrderCard'
import StatsCard from '../../components/common/StatsCard'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [orders, setOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState({ 
    total: 0, pending: 0, inProgress: 0, completed: 0, totalSpent: 0 
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [roleChecking, setRoleChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const ensureRoleAndLoad = async () => {
      try {
        setRoleChecking(true)
        let effectiveRole = userRole

        // If context doesn't have the role, fetch it directly from Supabase
        if (!effectiveRole) {
          const { data, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
          
          if (roleError) throw new Error('Failed to verify user role')
          effectiveRole = data?.role
        }

        if (effectiveRole !== 'customer') {
          navigate('/login')
          return
        }

        await fetchCustomerData()
      } catch (err) {
        setError(err.message)
      } finally {
        setRoleChecking(false)
      }
    }

    ensureRoleAndLoad()
  }, [user, userRole, navigate])

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_worker:users!orders_assigned_worker_id_fkey(
            id, email, profiles(full_name)
          ),
          drafts(status)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ordersError) throw ordersError

      const normalized = ordersData || []
      const total = normalized.length
      const pending = normalized.filter(o => o.status === 'pending').length
      const inProgress = normalized.filter(o => ['assigned', 'in_progress', 'draft_submitted'].includes(o.status)).length
      const completed = normalized.filter(o => o.status === 'completed').length
      const totalSpent = normalized.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0)
      const recent = normalized.slice(0, 5)

      setOrders(normalized)
      setRecentOrders(recent)
      setStats({ total, pending, inProgress, completed, totalSpent })
    } catch (err) {
      console.error('Customer dashboard error:', err)
      setError(err.message || 'Failed to load customer dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders
    return orders.filter(order => {
      if (activeTab === 'active') return ['pending', 'assigned', 'in_progress'].includes(order.status)
      if (activeTab === 'completed') return order.status === 'completed'
      if (activeTab === 'drafts') return order.drafts && order.drafts.length > 0
      return order.status === activeTab
    })
  }

  if (roleChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-dark-lighter shadow dark:shadow-none border-b dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your orders</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => navigate('/orders/new')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> New Order
              </button>
              <button onClick={fetchCustomerData} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Clock className="h-4 w-4 mr-2" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard title="Total Orders" value={stats.total} icon={Package} color="blue" trend="+12%" />
          <StatsCard title="In Progress" value={stats.inProgress} icon={Clock} color="yellow" />
          <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
          <StatsCard title="Total Spent" value={`$${stats.totalSpent.toLocaleString()}`} icon={DollarSign} color="purple" trend="+8%" />
        </div>

        {/* Orders Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              {[
                { id: 'all', label: 'All Orders', count: orders.length },
                { id: 'active', label: 'Active', count: stats.inProgress },
                { id: 'completed', label: 'Completed', count: stats.completed },
                { id: 'drafts', label: 'Drafts', count: orders.filter(o => o.drafts?.length > 0).length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 text-xs rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {getFilteredOrders().length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                <p className="mt-1 text-sm text-gray-500">No orders found matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {getFilteredOrders().map((order) => (
                  <OrderCard key={order.id} order={order} onView={() => navigate(`/orders/${order.id}`)} userRole="customer" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Activity & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <Link to="/orders/track" className="text-sm font-medium text-blue-600 hover:text-blue-500">View all</Link>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <ul className="-mb-8">
                  {recentOrders.map((order, idx) => (
                    <li key={order.id} className="relative pb-8">
                      {idx !== recentOrders.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />}
                      <div className="relative flex space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          order.status === 'completed' ? 'bg-green-500' : order.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}>
                          {order.status === 'completed' ? <CheckCircle className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Order <span className="font-medium text-gray-900">{order.order_number}</span> is <span className="font-medium">{order.status.replace('_', ' ')}</span></p>
                            <p className="mt-1 text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => navigate(`/orders/${order.id}`)} className="text-sm text-blue-600 hover:underline">View</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Avg. Order Value</dt>
                <dd className="text-sm font-medium text-gray-900">${stats.total > 0 ? (stats.totalSpent / stats.total).toFixed(2) : '0.00'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Success Rate</dt>
                <dd className="text-sm font-medium text-gray-900">{stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0'}%</dd>
              </div>
            </dl>
            <button onClick={() => navigate('/orders/track')} className="w-full mt-6 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center">
              <Package className="h-4 w-4 mr-2" /> Track All Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}