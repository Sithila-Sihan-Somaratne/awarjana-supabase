import { Clock, AlertTriangle, CheckCircle, Package, Calendar } from 'lucide-react'

function JobCard({ order, onStartWork, onSubmitDraft, onViewDetails }) {
  const isOverdue = order.deadline && new Date(order.deadline) < new Date()
  const isUrgent = order.deadline && 
    new Date(order.deadline) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      in_progress: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      draft_submitted: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      completed: 'bg-green-500/20 text-green-500 border-green-500/30'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }

  return (
    <div className={`card p-5 hover:shadow-lg transition-all ${
      isOverdue ? 'border-red-500/50' : isUrgent ? 'border-yellow-500/50' : ''
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">
            Order #{order.order_number || order.id}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {order.description || 'No description provided'}
          </p>
        </div>
        {(isOverdue || isUrgent) && (
          <div className={`ml-3 ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`}>
            <AlertTriangle size={20} />
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(order.status)}`}>
          {order.status === 'draft_submitted' && <CheckCircle size={12} />}
          {order.status === 'in_progress' && <Clock size={12} />}
          {order.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-start gap-2">
          <Package size={16} className="text-gray-500 mt-0.5" />
          <div>
            <p className="text-gray-500">Dimensions</p>
            <p className="text-white font-medium">{order.dimensions || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar size={16} className="text-gray-500 mt-0.5" />
          <div>
            <p className="text-gray-500">Deadline</p>
            <p className={`font-medium ${
              isOverdue ? 'text-red-500' : isUrgent ? 'text-yellow-500' : 'text-white'
            }`}>
              {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="text-sm space-y-1">
          <p className="text-gray-400">
            <span className="text-gray-500">Customer:</span>{' '}
            <span className="text-white">{order.customer?.name || order.customer_id}</span>
          </p>
          <p className="text-gray-400">
            <span className="text-gray-500">Material:</span>{' '}
            <span className="text-white">{order.material || 'Not specified'}</span>
          </p>
          <p className="text-gray-400">
            <span className="text-gray-500">Amount:</span>{' '}
            <span className="text-white font-semibold">${order.total_amount || order.cost || 0}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === 'assigned' && onStartWork && (
          <button
            onClick={() => onStartWork(order.id)}
            className="flex-1 btn-primary text-sm py-2"
          >
            Start Work
          </button>
        )}
        {order.status === 'in_progress' && onSubmitDraft && (
          <button
            onClick={() => onSubmitDraft(order)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Submit Draft
          </button>
        )}
        {order.status === 'draft_submitted' && (
          <div className="flex-1 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-lg py-2 text-sm text-center">
            Awaiting Approval
          </div>
        )}
        <button
          onClick={() => onViewDetails(order.id)}
          className="btn-secondary text-sm px-4"
        >
          Details
        </button>
      </div>
    </div>
  )
}

export { JobCard }
export default JobCard
