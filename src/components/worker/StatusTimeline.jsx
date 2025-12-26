import { CheckCircle, Circle, Clock } from 'lucide-react'

function StatusTimeline({ statuses = [], currentStatus }) {
  const defaultStatuses = [
    { key: 'pending', label: 'Order Placed', description: 'Order received and pending review' },
    { key: 'assigned', label: 'Assigned to Worker', description: 'Order assigned to a worker' },
    { key: 'in_progress', label: 'In Progress', description: 'Work is being done' },
    { key: 'draft_submitted', label: 'Draft Submitted', description: 'Draft submitted for review' },
    { key: 'completed', label: 'Completed', description: 'Order completed successfully' }
  ]

  const timelineStatuses = statuses.length > 0 ? statuses : defaultStatuses
  const currentIndex = timelineStatuses.findIndex(s => s.key === currentStatus)

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Order Status Timeline</h3>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

        {/* Timeline items */}
        <div className="space-y-6">
          {timelineStatuses.map((status, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={status.key} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500' 
                    : isCurrent 
                    ? 'bg-primary border-primary animate-pulse' 
                    : 'bg-gray-800 border-gray-700'
                }`}>
                  {isCompleted ? (
                    <CheckCircle size={16} className="text-white" />
                  ) : isCurrent ? (
                    <Clock size={16} className="text-white" />
                  ) : (
                    <Circle size={16} className="text-gray-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className={`font-semibold ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-gray-500'
                  }`}>
                    {status.label}
                  </div>
                  <div className={`text-sm mt-1 ${
                    isCurrent ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {status.description}
                  </div>
                  {status.timestamp && (
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(status.timestamp).toLocaleString()}
                    </div>
                  )}
                  {isCurrent && (
                    <div className="mt-2 inline-block px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                      Current Status
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { StatusTimeline }
export default StatusTimeline
