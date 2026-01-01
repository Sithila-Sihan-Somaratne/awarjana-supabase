// src/components/common/OrderCard.jsx
import React from 'react';
import { Eye, Clock, CheckCircle, AlertCircle, RefreshCw, XCircle, Zap } from 'lucide-react';

const getStatusConfig = (s) => {
  const configs = {
    pending: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
    assigned: { color: 'bg-purple-500/20 text-purple-500 border-purple-500/30', icon: AlertCircle },
    in_progress: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: RefreshCw },
    completed: { color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
    cancelled: { color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle }
  };
  return configs[s] || { color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: AlertCircle };
};

const getPriorityStyle = (priority) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-100 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'medium': return 'text-blue-600 bg-blue-100 border-blue-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

const OrderCard = ({ order, jobCardId, status, onView, onAction, userRole }) => {
  const currentStatus = status || order?.status;
  const config = getStatusConfig(currentStatus);
  const StatusIcon = config.icon;

  // FIX: Format dimensions from width/height if dimensions string is missing
  const displayDimensions = order?.dimensions || 
    (order?.width && order?.height ? `${order.width}" × ${order.height}"` : 'N/A');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">
              {order?.order_number || 'N/A'}
            </h3>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${getPriorityStyle(order?.priority)}`}>
              {order?.priority || 'medium'}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-bold truncate max-w-[200px]">
            {order?.title || 'Custom Project'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border flex items-center gap-1 ${config.color}`}>
          <StatusIcon size={12} />
          {currentStatus?.replace('_', ' ') || 'Unknown'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl">
          <p className="text-[10px] text-gray-400 uppercase font-black">Size</p>
          <p className="text-sm font-bold dark:text-white">{displayDimensions}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl">
          <p className="text-[10px] text-gray-400 uppercase font-black">Project Type</p>
          {/* FIX: Using production_type from your SQL schema instead of material */}
          <p className="text-sm font-bold dark:text-white truncate">
            {order?.production_type || 'Standard'}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => onView && onView(order)} 
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all uppercase tracking-widest text-[10px]"
        >
          Details
        </button>

        {userRole === 'employer' && currentStatus === 'assigned' && (
          <button 
            onClick={() => onAction && onAction(jobCardId, 'in_progress')}
            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <Zap size={14} /> Start Work
          </button>
        )}
        
        {userRole === 'employer' && currentStatus === 'in_progress' && (
          <button 
            onClick={() => onAction && onAction(jobCardId, 'completed')}
            className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <CheckCircle size={14} /> Mark Finished
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;