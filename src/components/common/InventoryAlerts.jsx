import { AlertTriangle, Package, TrendingDown, ShoppingCart } from 'lucide-react'

function InventoryAlerts({ alerts = [], onReorder }) {
  const getSeverityConfig = (severity) => {
    const configs = {
      critical: {
        color: 'bg-red-500/20 text-red-500 border-red-500/30',
        icon: AlertTriangle,
        label: 'Critical'
      },
      warning: {
        color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        icon: TrendingDown,
        label: 'Low Stock'
      },
      info: {
        color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        icon: Package,
        label: 'Info'
      }
    }
    return configs[severity] || configs.info
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-500" />
          Inventory Alerts
        </h3>
        {alerts.length > 0 && (
          <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-semibold rounded-full">
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">All inventory levels are good</p>
          <p className="text-xs mt-1">No alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = getSeverityConfig(alert.severity)
            const AlertIcon = config.icon

            return (
              <div
                key={alert.id || index}
                className={`p-4 rounded-lg border ${config.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertIcon size={20} className={config.color.split(' ')[1]} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">
                          {alert.material_name || alert.item_name}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>
                          <span className="text-gray-500">Current Stock:</span>{' '}
                          <span className="font-semibold">
                            {alert.current_quantity} {alert.unit || 'units'}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Minimum Required:</span>{' '}
                          <span className="font-semibold">
                            {alert.minimum_quantity} {alert.unit || 'units'}
                          </span>
                        </p>
                        {alert.last_restock && (
                          <p className="text-xs text-gray-500">
                            Last restocked: {new Date(alert.last_restock).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {alert.message && (
                        <p className="text-sm text-gray-400 mt-2">
                          {alert.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {onReorder && (
                    <button
                      onClick={() => onReorder(alert)}
                      className="btn-primary text-sm px-3 py-1 flex items-center gap-1 whitespace-nowrap"
                    >
                      <ShoppingCart size={14} />
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { InventoryAlerts }
export default InventoryAlerts
