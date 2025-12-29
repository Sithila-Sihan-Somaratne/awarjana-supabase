import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Alert from '../components/common/Alert'
import { ArrowLeft, Package, Calendar, User, DollarSign, FileText } from 'lucide-react'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [orderMaterials, setOrderMaterials] = useState([])
  const [customer, setCustomer] = useState(null)
  const [worker, setWorker] = useState(null)
  const [alertMessage, setAlertMessage] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchOrderDetails()
  }, [id, user, navigate])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError) throw orderError

      // Check permissions
      if (userRole === 'customer' && orderData.customer_id !== user.id) {
        throw new Error('You do not have permission to view this order')
      }

      if (userRole === 'worker' && orderData.assigned_worker_id !== user.id) {
        throw new Error('You do not have permission to view this order')
      }

      setOrder(orderData)

      // Fetch order materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('order_materials')
        .select(`
          *,
          materials (
            name,
            unit,
            category
          )
        `)
        .eq('order_id', id)

      if (materialsError) throw materialsError
      setOrderMaterials(materialsData || [])

      // Fetch customer info
      if (orderData.customer_id) {
        const { data: customerData } = await supabase
          .from('users')
          .select('email')
          .eq('id', orderData.customer_id)
          .single()
        
        setCustomer(customerData)
      }

      // Fetch worker info
      if (orderData.assigned_worker_id) {
        const { data: workerData } = await supabase
          .from('users')
          .select('email')
          .eq('id', orderData.assigned_worker_id)
          .single()
        
        setWorker(workerData)
      }

    } catch (err) {
      setAlertMessage({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'primary'
      case 'pending': return 'warning'
      case 'cancelled': return 'error'
      case 'delayed': return 'error'
      default: return 'primary'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <p className="text-gray-400">Loading order details...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-error text-xl mb-4">Order not found</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Order #{order.order_number}</h1>
              <p className="text-sm text-gray-400">Order Details</p>
            </div>
            <span className={`badge badge-${getStatusColor(order.status)} text-lg px-4 py-2`}>
              {order.status}
            </span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dimensions */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Package className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white">Frame Dimensions</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Primary Dimensions</p>
                  <p className="text-2xl font-bold text-primary">
                    {order.height} cm × {order.width} cm
                  </p>
                </div>
                {(order.height2 || order.width2) && (
                  <div>
                    <p className="text-sm text-gray-400">Secondary Dimensions</p>
                    <p className="text-2xl font-bold text-primary">
                      {order.height2 || 0} cm × {order.width2 || 0} cm
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Materials Used</h2>
              {orderMaterials.length === 0 ? (
                <p className="text-gray-400">No materials specified</p>
              ) : (
                <div className="space-y-3">
                  {orderMaterials.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{item.materials.name}</p>
                        <p className="text-sm text-gray-400">
                          {item.materials.category} • Quantity: {item.quantity} {item.materials.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-primary">
                          Rs. {(item.cost_at_time * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          @ Rs. {item.cost_at_time.toFixed(2)} / {item.materials.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {(order.customer_notes || order.admin_notes) && (
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-white">Notes</h2>
                </div>
                
                {order.customer_notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-400 mb-2">Customer Notes:</p>
                    <p className="text-white bg-gray-900/50 p-3 rounded-lg">{order.customer_notes}</p>
                  </div>
                )}

                {order.admin_notes && userRole !== 'customer' && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Admin Notes:</p>
                    <p className="text-white bg-gray-900/50 p-3 rounded-lg">{order.admin_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Delay Information */}
            {order.is_delayed && (
              <div className="card bg-error/10 border-2 border-error/30">
                <h3 className="text-lg font-bold text-error mb-2">Order Delayed</h3>
                {order.delay_reason && (
                  <p className="text-gray-300 mb-2">Reason: {order.delay_reason}</p>
                )}
                {order.refund_amount > 0 && (
                  <p className="text-gray-300">Refund Amount: Rs. {order.refund_amount.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Cost Summary */}
            <div className="card bg-gray-900/50 border-2 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white">Cost</h2>
              </div>
              <p className="text-4xl font-bold text-primary mb-2">
                Rs. {order.cost?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-400">Total Order Cost</p>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white">Timeline</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Order Created</p>
                  <p className="text-white font-medium">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Deadline Type</p>
                  <p className="text-white font-medium capitalize">{order.deadline_type || 'Standard'}</p>
                </div>
                {order.requested_deadline && (
                  <div>
                    <p className="text-sm text-gray-400">Requested Deadline</p>
                    <p className="text-white font-medium">{formatDate(order.requested_deadline)}</p>
                  </div>
                )}
                {order.confirmed_deadline && (
                  <div>
                    <p className="text-sm text-gray-400">Confirmed Deadline</p>
                    <p className="text-white font-medium">{formatDate(order.confirmed_deadline)}</p>
                  </div>
                )}
                {order.completed_at && (
                  <div>
                    <p className="text-sm text-gray-400">Completed On</p>
                    <p className="text-white font-medium">{formatDate(order.completed_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* People */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <User className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white">People</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="text-white font-medium">{customer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Assigned Worker</p>
                  <p className="text-white font-medium">{worker?.email || 'Not assigned yet'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
