function StatsCard({ title, value, icon: Icon, color = 'primary', trend, subtitle }) {
  const colorClasses = {
    primary: 'text-primary',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    purple: 'text-purple-500'
  }

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{title}</p>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`text-xs mt-2 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <Icon className={colorClasses[color]} size={32} />
        )}
      </div>
    </div>
  )
}

export { StatsCard }
export default StatsCard
