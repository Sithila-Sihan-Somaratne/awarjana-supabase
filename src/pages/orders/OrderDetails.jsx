import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Package, User, Clock, CheckCircle, Ruler, DollarSign, Users, TrendingUp } from 'lucide-react'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user && id) fetchOrderDetails()
  }, [user, id])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey(id, full_name, avatar_url),
          employer:profiles!orders_assigned_employer_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setOrder(data)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- CRITICAL SAFETY CHECKS ---
  if (loading) return <div className="p-20 text-center dark:text-white">Loading Order Details...</div>
  
  if (error) return (
    <div className="p-20 text-center">
      <div className="text-red-500 mb-4">Error: {error}</div>
      <button onClick={() => navigate('/orders')} className="text-blue-500 underline">Back to Orders</button>
    </div>
  )

  if (!order) return <div className="p-20 text-center dark:text-white">Order not found.</div>
  // ------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Order #{order.order_number}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Description</h3>
          <p className="text-gray-600 dark:text-gray-300">{order.description || 'No description'}</p>
          
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <Ruler className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Dimensions</p>
                <p className="font-bold dark:text-white">{order.height}x{order.width} cm</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <DollarSign className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-bold dark:text-white">${order.total_amount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="font-bold mb-4 dark:text-white flex items-center"><User className="mr-2 h-5 w-5"/> Customer</h3>
            <p className="dark:text-white">{order.customer?.full_name || 'System User'}</p>
          </div>
          
          {order.employer && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="font-bold mb-4 dark:text-white flex items-center"><Users className="mr-2 h-5 w-5"/> Assigned Employer</h3>
              <p className="dark:text-white">{order.employer?.full_name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}