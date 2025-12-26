// src/pages/dashboard/CustomerDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  Package, Clock, CheckCircle, AlertCircle, Plus,
  DollarSign, Ruler, User, Calendar, Filter, Download
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import OrderCard from '../../components/orders/OrderCard'
import StatsCard from '../../components/common/StatsCard'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalSpent: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchCustomerData()
  }, [user, navigate])

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      
      // Fetch customer's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_worker:users!orders_assigned_worker_id_fkey(
            email,
            profiles(full_name)
          ),
          drafts(status)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Calculate statistics
      const total = ordersData?.length || 0
      const pending = ordersData?.filter(o => o.status === 'pending').length || 0
      const inProgress = ordersData?.filter(o => ['assigned', 'in_progress', 'draft_submitted'].includes(o.status)).length || 0
      const completed = ordersData?.filter(o => o.status === 'completed').length || 0
      const totalSpent = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // Get recent orders (last 5)
      const recent = ordersData?.slice(0, 5) || []

      setOrders(ordersData || [])
      setRecentOrders(recent)
      setStats({ total, pending, inProgress, completed, totalSpent })
    } catch (err) {
      console.error('Customer dashboard error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders
    return orders.filter(order => {
      if (activeTab === 'active') {
        return ['pending', 'assigned', 'in_progress'].includes(order.status)
      }
      if (activeTab === 'completed') {
        return order.status === 'completed'
      }
      if (activeTab === 'drafts') {
        return order.drafts && order.drafts.length > 0
      }
      return order.status === activeTab
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <p className="text-gray-600 mt-1">Track and manage your orders</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/orders/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </button>
              <button
                onClick={() => fetchCustomerData()}
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
        {error && (
          <Alert
            type="error"
            message={`Failed to load dashboard: ${error}`}
            onClose={() => setError(null)}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Total Orders"
            value={stats.total}
            icon={<Package className="h-6 w-6 text-blue-500" />}
            trend="+12%"
            color="blue"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={<Clock className="h-6 w-6 text-yellow-500" />}
            color="yellow"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle className="h-6 w-6 text-green-500" />}
            color="green"
          />
          <StatsCard
            title="Total Spent"
            value={`$${stats.totalSpent.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6 text-purple-500" />}
            trend="+8%"
            color="purple"
          />
        </div>

        {/* Orders Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                { id: 'all', label: 'All Orders', count: orders.length },
                { id: 'active', label: 'Active', count: stats.inProgress },
                { id: 'pending', label: 'Pending', count: stats.pending },
                { id: 'completed', label: 'Completed', count: stats.completed },
                { id: 'drafts', label: 'Drafts', count: orders.filter(o => o.drafts?.length > 0).length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`
                      ml-2 py-0.5 px-2 text-xs rounded-full
                      ${activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
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
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'all' ? 'Get started by creating a new order.' : 'No orders match this filter.'}
                </p>
                {activeTab === 'all' && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => navigate('/orders/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      New Order
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredOrders().map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => navigate(`/orders/${order.id}`)}
                    userRole="customer"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                  <Link
                    to="/orders/track"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentOrders.map((order, orderIdx) => (
                      <li key={order.id}>
                        <div className="relative pb-8">
                          {orderIdx !== recentOrders.length - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`
                                h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                                ${order.status === 'completed' ? 'bg-green-500' :
                                  order.status === 'in_progress' ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }
                              `}>
                                {order.status === 'completed' ? (
                                  <CheckCircle className="h-5 w-5 text-white" />
                                ) : order.status === 'in_progress' ? (
                                  <Clock className="h-5 w-5 text-white" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-white" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Order <span className="font-medium text-gray-900">{order.order_number}</span> is{' '}
                                  <span className="font-medium text-gray-900">
                                    {order.status.replace('_', ' ')}
                                  </span>
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  Created on {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <div className="font-medium text-gray-900">${order.total_amount}</div>
                                <button
                                  onClick={() => navigate(`/orders/${order.id}`)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="space-y-6">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Total Orders</dt>
                    <dd className="text-sm text-gray-900">{stats.total}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Avg. Order Value</dt>
                    <dd className="text-sm text-gray-900">
                      ${stats.total > 0 ? (stats.totalSpent / stats.total).toFixed(2) : '0.00'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
                    <dd className="text-sm text-gray-900">
                      {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0'}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Active Orders</dt>
                    <dd className="text-sm text-gray-900">{stats.inProgress}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Pending Approval</dt>
                    <dd className="text-sm text-gray-900">
                      {orders.filter(o => o.status === 'draft_submitted').length}
                    </dd>
                  </div>
                </dl>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/orders/track')}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Track All Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}