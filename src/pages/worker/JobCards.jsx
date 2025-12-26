import { Calendar, Clock, User, AlertTriangle } from 'lucide-react'

export function JobCard({ jobCard, onStart, onComplete, onView }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'waiting_materials': return 'bg-yellow-100 text-yellow-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{jobCard.order?.title}</h3>
          <p className="text-sm text-gray-500">Order #{jobCard.order?.order_number}</p>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(jobCard.status)}`}>
            {jobCard.status.replace('_', ' ')}
          </span>
          {jobCard.order?.priority && (
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(jobCard.order.priority)}`}>
              {jobCard.order.priority}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <User size={14} className="mr-2" />
          <span>{jobCard.order?.customer?.full_name || jobCard.order?.customer?.email}</span>
        </div>
        
        {jobCard.order?.deadline && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={14} className="mr-2" />
            <span>Due: {new Date(jobCard.order.deadline).toLocaleDateString()}</span>
          </div>
        )}

        {jobCard.estimated_hours && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock size={14} className="mr-2" />
            <span>Est. {jobCard.estimated_hours} hours</span>
          </div>
        )}

        <div className="pt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{jobCard.progress_percentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${jobCard.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        {jobCard.status === 'assigned' && (
          <button
            onClick={onStart}
            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Start Job
          </button>
        )}
        
        {jobCard.status === 'in_progress' && (
          <button
            onClick={onComplete}
            className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Mark Complete
          </button>
        )}

        <button
          onClick={onView}
          className="py-2 px-4 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
        >
          Details
        </button>
      </div>
    </div>
  )
}