// src/components/common/StatsCard.jsx
import React from 'react';

function StatsCard({ title, value, icon: Icon, color = 'blue', trend, subtitle }) {
  // Mapping logic for colors
  const colorClasses = {
    primary: 'text-blue-600',
    amber: 'text-amber-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    indigo: 'text-indigo-500'
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">
            {title}
          </p>
          <p className={`text-3xl font-black tracking-tighter ${colorClasses[color] || colorClasses.blue}`}>
            {value}
          </p>
          
          {subtitle && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium italic">{subtitle}</p>
          )}
          
          {trend && (
            <div className={`text-[10px] mt-3 font-black flex items-center gap-1 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              <span className="bg-current opacity-10 px-2 py-0.5 rounded-full">
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 group-hover:scale-110 transition-transform ${colorClasses[color] || colorClasses.blue}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}

export { StatsCard };
export default StatsCard;