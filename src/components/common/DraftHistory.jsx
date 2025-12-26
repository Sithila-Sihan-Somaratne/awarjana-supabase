import { FileText, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react'

function DraftHistory({ drafts = [] }) {
  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: Clock,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        label: 'Pending Review'
      },
      approved: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        label: 'Approved'
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'Rejected'
      }
    }
    return configs[status] || configs.pending
  }

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileText size={20} className="text-primary" />
        Draft History
      </h3>

      {drafts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No drafts submitted yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft, index) => {
            const config = getStatusConfig(draft.status)
            const StatusIcon = config.icon

            return (
              <div
                key={draft.id || index}
                className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={18} className={config.color} />
                    <span className={`text-sm font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(draft.submitted_at || draft.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-300 mb-2">
                    <span className="font-medium text-white">Version {draft.version || index + 1}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    {draft.description || draft.content || 'No description provided'}
                  </p>
                </div>

                {draft.feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-start gap-2">
                      <MessageSquare size={16} className="text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Admin Feedback:</p>
                        <p className="text-sm text-gray-300">{draft.feedback}</p>
                      </div>
                    </div>
                  </div>
                )}

                {draft.files && draft.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draft.files.map((file, fileIndex) => (
                      <a
                        key={fileIndex}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
                      >
                        <FileText size={12} />
                        {file.name || `File ${fileIndex + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { DraftHistory }
export default DraftHistory
