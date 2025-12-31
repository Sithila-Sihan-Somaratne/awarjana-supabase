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
      
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(email, profiles(full_name)),
          employer:users!orders_assigned_employer_id_fkey(email, profiles(full_name)),
          drafts(status)
        `)
        .order('created_at', { ascending: false })

      // Apply role-based filters
      if (userRole === 'customer') {
        ordersQuery = ordersQuery.eq('customer_id', user.id)
      } else if (userRole === 'employer') {
        ordersQuery = ordersQuery.eq('assigned_employer_id', user.id)
      }
      // Admin sees all orders

      const { data: ordersData, error: ordersError } = await ordersQuery

      if (ordersError) throw ordersError

      setOrders(ordersData || [])
      setFilteredOrders(ordersData || [])

    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let result = orders

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(order =>
        order.order_number.toLowerCase().includes(term) ||
        order.title.toLowerCase().includes(term) ||
        order.customer?.email.toLowerCase().includes(term) ||
        order.customer?.profiles?.full_name?.toLowerCase().includes(term)
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
      let startDate

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
      }

      result = result.filter(order => new Date(order.created_at) >= startDate)
    }

    setFilteredOrders(result)
  }

  const getStats = () => {
    const total = orders.length
    const pending = orders.filter(o => o.status === 'pending').length
    const inProgress = orders.filter(o => 
      ['assigned', 'in_progress', 'draft_submitted'].includes(o.status)
    ).length
    const completed = orders.filter(o => o.status === 'completed').length
    const overdue = orders.filter(o => {
      if (!o.deadline) return false
      return new Date(o.deadline) < new Date() && o.status !== 'completed'
    }).length

    return { total, pending, inProgress, completed, overdue }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your orders...</p>
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
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Order Tracker</h1>
              <p className="mt-1 text-gray-600">
                Track and manage all your orders in one place
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fetchOrders()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => {/* Export functionality */}}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inProgress}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.overdue}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search by order #, title, customer..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="draft_submitted">Draft Submitted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                id="dateRange"
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {filters.status}
                <button
                  onClick={() => setFilters({...filters, status: 'all'})}
                  className="ml-1.5 text-blue-800 hover:text-blue-900"
                >
                  &times;
                </button>
              </span>
            )}
            {filters.priority !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Priority: {filters.priority}
                <button
                  onClick={() => setFilters({...filters, priority: 'all'})}
                  className="ml-1.5 text-green-800 hover:text-green-900"
                >
                  &times;
                </button>
              </span>
            )}
            {filters.dateRange !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Date: {filters.dateRange}
                <button
                  onClick={() => setFilters({...filters, dateRange: 'all'})}
                  className="ml-1.5 text-purple-800 hover:text-purple-900"
                >
                  &times;
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1.5 text-gray-800 hover:text-gray-900"
                >
                  &times;
                </button>
              </span>
            )}
            {(filters.status !== 'all' || filters.priority !== 'all' || filters.dateRange !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilters({ status: 'all', priority: 'all', dateRange: 'all' })
                  setSearchTerm('')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filteredOrders.length} of {orders.length} orders
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option>Newest First</option>
                  <option>Oldest First</option>
                  <option>Highest Amount</option>
                  <option>Deadline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {orders.length === 0 
                    ? 'You don\'t have any orders yet.' 
                    : 'No orders match your current filters.'}
                </p>
                {orders.length === 0 && userRole === 'customer' && (
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/orders/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Your First Order
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => navigate(`/orders/${order.id}`)}
                    userRole={userRole}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">1</span> to{' '}
                      <span className="font-medium">{Math.min(filteredOrders.length, 10)}</span> of{' '}
                      <span className="font-medium">{filteredOrders.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Previous
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        1
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        2
                      </button>
                      <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}