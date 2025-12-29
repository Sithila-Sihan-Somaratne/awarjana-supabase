// src/pages/orders/OrderDetails.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Package, User, Calendar, DollarSign,
  Ruler, Clock, CheckCircle, AlertCircle, Edit,
  Printer, Download, MessageSquare, FileText, Wrench,
  Users, TrendingUp, XCircle, Eye
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import StatusTimeline from '../../components/common/StatusTimeline'
import MaterialList from '../../components/common/MaterialList'
import DraftHistory from '../../components/common/DraftHistory'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [order, setOrder] = useState(null)
  const [materials, setMaterials] = useState([])
  const [drafts, setDrafts] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!user || !id) {
      navigate('/login')
      return
    }
    fetchOrderDetails()
  }, [user, id, navigate])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      
      // Build query based on user role
      let orderQuery = supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(
            email,
            profiles(full_name, phone)
          ),
          worker:users!orders_assigned_worker_id_fkey(
            email,
            profiles(full_name, phone)
          ),
          assigned_materials:order_materials(
            *,
            material:materials(*)
          )
        `)
        .eq('id', id)
        .single()

      // Apply RLS filters based on role
      if (userRole === 'customer') {
        orderQuery = orderQuery.eq('customer_id', user.id)
      } else if (userRole === 'worker') {
        // Workers can see if they're assigned or have a job card
        orderQuery = orderQuery.or(`assigned_worker_id.eq.${user.id},customer_id.eq.${user.id}`)
      }
      // Admin can see everything (no additional filter)

      const { data: orderData, error: orderError } = await orderQuery

      if (orderError) {
        if (orderError.code === 'PGRST116') {
          throw new Error('Order not found or you do not have permission to view it')
        }
        throw orderError
      }

      // Fetch additional data if user has permission
      let materialsData = []
      let draftsData = []
      let historyData = []

      // Fetch materials (if any)
      if (orderData.assigned_materials) {
        materialsData = orderData.assigned_materials
      }

      // Fetch drafts (workers and admins can see)
      if (userRole === 'worker' || userRole === 'admin') {
        const { data: draftsDataResult } = await supabase
          .from('drafts')
          .select(`
            *,
            worker:users(email, profiles(full_name))
          `)
          .eq('order_id', id)
          .order('submitted_at', { ascending: false })

        draftsData = draftsDataResult || []
      }

      // Fetch status history
      const { data: historyResult } = await supabase
        .from('order_status_history')
        .select(`
          *,
          user:users(email, profiles(full_name))
        `)
        .eq('order_id', id)
        .order('changed_at', { ascending: true })

      historyData = historyResult || []

      setOrder(orderData)
      setMaterials(materialsData)
      setDrafts(draftsData)
      setStatusHistory(historyData)

    } catch (err) {
      console.error('Error fetching order details:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Record status change
      await supabase
        .from('order_status_history')
        .insert({
          order_id: id,
          user_id: user.id,
          from_status: order.status,
          to_status: newStatus,
          reason: `Status changed by ${userRole}`
        })

      // Refresh data
      fetchOrderDetails()
    } catch (err) {
      console.error('Error updating status:', err)
      setError(err.message)
    }
  }

  const assignToWorker = async (workerId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_worker_id: workerId,
          status: 'assigned'
        })
        .eq('id', id)

      if (error) throw error

      // Create job card
      await supabase
        .from('job_cards')
        .insert({
          order_id: id,
          worker_id: workerId,
          title: `Job for ${order.order_number}`,
          status: 'assigned'
        })

      fetchOrderDetails()
    } catch (err) {
      console.error('Error assigning worker:', err)
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert
            type="error"
            message={error || 'Order not found'}
            onClose={() => navigate('/dashboard')}
          />
          <div className="mt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'draft_submitted': return 'bg-yellow-100 text-yellow-800'
      case 'assigned': return 'bg-purple-100 text-purple-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress': return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'draft_submitted': return <FileText className="h-5 w-5 text-yellow-500" />
      case 'assigned': return <Users className="h-5 w-5 text-purple-500" />
      case 'pending': return <Clock className="h-5 w-5 text-gray-500" />
      default: return <Package className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-dark-lighter shadow dark:shadow-none border-b dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mr-4">
                  Order #{order.order_number}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="ml-2 capitalize">{order.status.replace('_', ' ')}</span>
                </span>
              </div>
              <p className="mt-1 text-gray-600 dark:text-gray-400">{order.title}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              <button
                onClick={() => {/* Export functionality */}}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => {/* Edit functionality */}}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'materials', label: 'Materials' },
                { id: 'drafts', label: 'Drafts', count: drafts.length },
                { id: 'timeline', label: 'Timeline' },
                { id: 'messages', label: 'Messages' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Order Overview</h2>
                  
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                      <p className="text-gray-900">{order.description}</p>
                    </div>

                    {/* Specifications */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-4">Specifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Ruler className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Dimensions</p>
                            <p className="font-medium text-gray-900">
                              {order.height} × {order.width} × {order.depth} cm
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Quantity</p>
                            <p className="font-medium text-gray-900">{order.quantity}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="font-medium text-gray-900">${order.total_amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Order Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Notes</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700">{order.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Status Actions (Role-based) */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-4">Order Actions</h3>
                      <div className="flex flex-wrap gap-3">
                        {userRole === 'customer' && order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus('cancelled')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Order
                          </button>
                        )}

                        {userRole === 'worker' && order.assigned_worker_id === user.id && (
                          <>
                            {order.status === 'assigned' && (
                              <button
                                onClick={() => updateOrderStatus('in_progress')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Start Work
                              </button>
                            )}
                            {order.status === 'in_progress' && (
                              <button
                                onClick={() => navigate(`/worker/drafts/submit/${order.id}`)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Submit Draft
                              </button>
                            )}
                          </>
                        )}

                        {userRole === 'admin' && (
                          <div className="flex flex-wrap gap-3">
                            {order.status !== 'completed' && (
                              <button
                                onClick={() => updateOrderStatus('completed')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
                              </button>
                            )}
                            {!order.assigned_worker_id && (
                              <button
                                onClick={() => {/* Open worker assignment modal */}}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Assign Worker
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <MaterialList 
                    materials={materials}
                    orderId={order.id}
                    userRole={userRole}
                    onRefresh={fetchOrderDetails}
                  />
                </div>
              </div>
            )}

            {activeTab === 'drafts' && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <DraftHistory
                    drafts={drafts}
                    orderId={order.id}
                    userRole={userRole}
                    onRefresh={fetchOrderDetails}
                  />
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <StatusTimeline history={statusHistory} currentStatus={order.status} />
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Communication feature coming soon.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                Customer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm text-gray-900">
                    {order.customer?.profiles?.full_name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{order.customer?.email}</p>
                </div>
                {order.customer?.profiles?.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{order.customer.profiles.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Worker */}
            {order.assigned_worker_id && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gray-400" />
                  Assigned Worker
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">
                      {order.worker?.profiles?.full_name || order.worker?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{order.worker?.email}</p>
                  </div>
                  {order.worker?.profiles?.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{order.worker.profiles.phone}</p>
                    </div>
                  )}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => assignToWorker(null)}
                      className="w-full mt-4 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Reassign Worker
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Order Metadata */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                  <dd className="text-sm text-gray-900">{order.order_number}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(order.updated_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="text-sm text-gray-900 capitalize">{order.priority}</dd>
                </div>
                {order.deadline && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Deadline</dt>
                    <dd className={`text-sm font-medium ${
                      new Date(order.deadline) < new Date() 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {new Date(order.deadline).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {/* View invoice */}}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Invoice
                </button>
                <button
                  onClick={() => {/* Contact support */}}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}