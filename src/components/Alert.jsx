import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useState } from 'react'

export function Alert({ type = 'info', message, onClose, dismissible = true }) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    onClose?.()
  }

  if (!visible) return null

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  }

  const styles = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  }

  return (
    <div className={`alert ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button
          onClick={handleClose}
          className="ml-auto p-0 hover:opacity-70"
          aria-label="Close alert"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}
