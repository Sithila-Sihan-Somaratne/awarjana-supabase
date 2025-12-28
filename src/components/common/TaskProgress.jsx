function TaskProgress({ current, total, label, showPercentage = true, color = 'primary' }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  const colorClasses = {
    primary: 'bg-primary',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          {showPercentage && (
            <span className="text-sm font-semibold text-white">
              {percentage}%
            </span>
          )}
        </div>
      )}
      
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {!label && showPercentage && (
        <div className="text-center mt-2">
          <span className="text-xs text-gray-400">
            {current} / {total} ({percentage}%)
          </span>
        </div>
      )}
    </div>
  )
}

export { TaskProgress }
export default TaskProgress