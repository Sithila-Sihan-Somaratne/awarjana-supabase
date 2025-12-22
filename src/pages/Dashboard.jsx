import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Eye } from 'lucide-react'
import { Alert } from '../components/Alert'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, userRole, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertMessage, setAlertMessage] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    fetchOrders()
  }, [user, navigate])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      
      let query = supabase.from('orders').select('*')
      
      // If customer, only show their orders
      if (userRole === 'customer') {
        query = query.eq('customer_id', user.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setOrders(data || [])
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Failed to load orders: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Awarjana Creations</h1>
            <p className="text-sm text-gray-400">
              {userRole === 'customer' && 'Customer Dashboard'}
              {userRole === 'worker' && 'Worker Dashboard'}
              {userRole === 'admin' && 'Admin Dashboard'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-sm text-gray-400 truncate max-w-[200px] sm:max-w-none">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-primary">{orders.length}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Pending</p>
            <p className="text-3xl font-bold text-warning">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">In Progress</p>
            <p className="text-3xl font-bold text-primary">
              {orders.filter(o => o.status === 'in_progress').length}
            </p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Completed</p>
            <p className="text-3xl font-bold text-success">
              {orders.filter(o => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {userRole === 'customer' && (
          <div className="mb-8">
            <button
              onClick={() => navigate('/new-order')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              New Order
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="card">
          <div className="overflow-x-auto -mx-5 sm:mx-0">
          <h2 className="text-xl font-bold text-white mb-4">Orders</h2>
          
          {loading ? (
            <p className="text-gray-400">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-400">No orders found</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Dimensions</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="py-3 px-4 font-mono text-primary">{order.id}</td>
                    <td className="py-3 px-4">
                      {order.height} x {order.width}
                    </td>
                    <td className="py-3 px-4">Rs. {order.cost?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge badge-${
                        order.status === 'completed' ? 'success' :
                        order.status === 'in_progress' ? 'primary' :
                        order.status === 'pending' ? 'warning' :
                        'error'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}
