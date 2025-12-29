import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

function Alert({ type = 'info', message, onClose }) {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-500'
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-300',
      iconColor: 'text-green-600 dark:text-green-500'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-300',
      iconColor: 'text-yellow-600 dark:text-yellow-500'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-500'
    }
  }

  const { icon: Icon, bg, border, text, iconColor } = config[type]

  return (
    <div className={`${bg} border ${border} rounded-lg p-4 mb-6 relative`}>
      <div className="flex items-start">
        <Icon className={`${iconColor} mr-3 mt-0.5 flex-shrink-0`} size={20} />
        <div className="flex-1">
          <p className={`${text} text-sm`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

export { Alert }
export default Alert