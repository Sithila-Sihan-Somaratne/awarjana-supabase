import { Eye, Filter, Download, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react'

function RecentOrdersTable({ orders = [], onViewOrder, onFilter, onExport, showActions = true }) {
  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
      in_progress: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: RefreshCw },
      completed: { color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      cancelled: { color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle }
    }
    return badges[status] || { color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: Clock }
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
        <div className="flex gap-2">
          {onFilter && (
            <button
              onClick={onFilter}
              className="btn-secondary text-sm flex items-center gap-1 px-3 py-1"
            >
              <Filter size={16} />
              Filter
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="btn-secondary text-sm flex items-center gap-1 px-3 py-1"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Order #</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Description</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-sm text-gray-400 font-medium">Amount</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Date</th>
                {showActions && (
                  <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusConfig = getStatusBadge(order.status)
                const StatusIcon = statusConfig.icon

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      #{order.order_number || order.id}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {order.customer?.email || order.customer_email || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
                      {order.description || 'No description'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-semibold">
                      ${order.cost || order.total_amount || 0}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    {showActions && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 text-sm"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export { RecentOrdersTable }
export default RecentOrdersTable
