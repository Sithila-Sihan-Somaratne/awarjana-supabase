import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Users, BadgeDollarSign, RefreshCcw, 
  ShieldCheck, TrendingUp, AlertCircle, Clock, 
  UserPlus, CheckCircle 
} from 'lucide-react';
import StatsCard from '../../components/common/StatsCard';
import Alert from '../../components/common/Alert';

export default function AdminDashboard() {
  const [data, setData] = useState({ 
    orders: [], 
    workers: [], 
    stats: { totalValue: 0, orderCount: 0, workerCount: 0, pendingCount: 0 } 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningId, setAssigningId] = useState(null); // Track which order is being updated

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // 2. Fetch all workers (Staff)
      const { data: workers, error: workersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker');

      if (workersError) throw workersError;

      const totalLKR = orders?.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0) || 0;

      setData({
        orders: orders || [],
        workers: workers || [],
        stats: {
          orderCount: orders?.length || 0,
          workerCount: workers?.length || 0,
          pendingCount: orders?.filter(o => o.status === 'pending').length || 0,
          totalValue: totalLKR 
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to assign a worker to an order
  const handleAssignWorker = async (orderId, workerId) => {
    if (!workerId) return;
    setAssigningId(orderId);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_worker_id: workerId,
          status: 'assigned' // Moves the order from 'pending' to 'assigned'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refresh data to show changes
      await fetchGlobalData();
    } catch (err) {
      setError("Failed to assign worker: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  if (loading && !data.orders.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black dark:text-white">Admin Control Panel</h1>
              <p className="text-gray-500 font-medium">Global Workshop Oversight</p>
            </div>
          </div>
          <button 
            onClick={fetchGlobalData}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 dark:text-white rounded-xl shadow-sm hover:shadow-md transition-all border dark:border-gray-700 font-bold"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            Sync Workshop
          </button>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="Total Orders" value={data.stats.orderCount} icon={Package} color="blue" />
          <StatsCard title="Needs Assignment" value={data.stats.pendingCount} icon={Clock} color="amber" />
          <StatsCard title="Workshop Staff" value={data.stats.workerCount} icon={Users} color="green" />
          <StatsCard title="Total Revenue" value={`Rs. ${data.stats.totalValue.toLocaleString()}`} icon={BadgeDollarSign} color="indigo" />
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-10 border dark:border-gray-700 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black dark:text-white">Active Order Stream</h2>
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm uppercase tracking-wider">
              <TrendingUp size={20} /> Live Updates
            </div>
          </div>

          <div className="space-y-4">
            {data.orders.map((order) => (
              <div 
                key={order.id} 
                className={`flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 rounded-3xl border transition-all group ${
                  order.status === 'pending' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30' : 'bg-gray-50 dark:bg-gray-700/30 border-transparent'
                }`}
              >
                <div className="flex items-center gap-4 mb-4 lg:mb-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm font-black ${
                    order.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-600 text-blue-600'
                  }`}>
                    #{order.order_number.slice(-3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-lg dark:text-white">{order.order_number}</p>
                      {order.status === 'pending' && (
                        <span className="animate-pulse bg-amber-500 w-2 h-2 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{order.title} • <span className="text-blue-500">{order.dimensions}</span></p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  {/* ASSIGNMENT UI */}
                  {order.status === 'pending' ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex-grow lg:flex-grow-0">
                      <UserPlus size={16} className="text-gray-400 ml-2" />
                      <select 
                        disabled={assigningId === order.id}
                        onChange={(e) => handleAssignWorker(order.id, e.target.value)}
                        className="bg-transparent text-sm font-bold dark:text-white outline-none pr-4 min-w-[150px] disabled:opacity-50"
                      >
                        <option value="">Assign to Staff...</option>
                        {data.workers.map(w => (
                          <option key={w.id} value={w.id}>{w.email.split('@')[0].toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl border border-green-100 dark:border-green-900/30">
                      <CheckCircle size={14} />
                      <span className="text-[10px] font-black uppercase">Assigned to Staff</span>
                    </div>
                  )}

                  <div className="text-right ml-auto lg:ml-0">
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      Rs. {order.total_amount?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Valuation</p>
                  </div>
                </div>
              </div>
            ))}

            {data.orders.length === 0 && (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-700/20 rounded-3xl border-2 border-dashed dark:border-gray-700">
                <AlertCircle className="mx-auto text-gray-400 mb-2" size={40} />
                <p className="text-gray-500 font-medium">No workshop records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}