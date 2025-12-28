import { Eye, Clock, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react'

function OrderCard({ order, onView, onAction }) {
  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', 
        icon: Clock 
      },
      in_progress: { 
        color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', 
        icon: RefreshCw 
      },
      completed: { 
        color: 'bg-green-500/20 text-green-500 border-green-500/30', 
        icon: CheckCircle 
      },
      cancelled: { 
        color: 'bg-red-500/20 text-red-500 border-red-500/30', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', 
      icon: AlertCircle 
    }
  }

  const statusConfig = getStatusConfig(order.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="card p-4 hover:shadow-lg transition-all hover:border-primary/50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Order #{order.order_number || order.id}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {order.description || 'No description'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusConfig.color}`}>
          <StatusIcon size={12} />
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-gray-500">Cost</p>
          <p className="text-white font-semibold">${order.cost || order.total_amount || 0}</p>
        </div>
        <div>
          <p className="text-gray-500">Created</p>
          <p className="text-white">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {order.deadline && (
        <div className="mb-4 text-sm">
          <p className="text-gray-500">Deadline</p>
          <p className={`text-white ${new Date(order.deadline) < new Date() ? 'text-red-500' : ''}`}>
            {new Date(order.deadline).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onView(order.id)}
          className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <Eye size={16} />
          View Details
        </button>
        {onAction && (
          <button
            onClick={() => onAction(order)}
            className="btn-primary text-sm px-4"
          >
            Action
          </button>
        )}
      </div>
    </div>
  )
}

export { OrderCard }
export default OrderCard
