import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Users, BadgeDollarSign, RefreshCcw, 
  ShieldCheck, TrendingUp, AlertCircle, Clock 
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

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all orders - Clean Sheet (no joins to avoid 400 error)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch all workers
      const { data: workers, error: workersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker');

      if (workersError) throw workersError;

      const rawTotal = orders?.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0) || 0;

      setData({
        orders: orders || [],
        workers: workers || [],
        stats: {
          orderCount: orders?.length || 0,
          workerCount: workers?.length || 0,
          pendingCount: orders?.filter(o => o.status === 'pending').length || 0,
          totalValue: rawTotal * 320 // Convert EUR to LKR
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  if (loading) {
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
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 dark:text-white rounded-xl shadow-sm hover:shadow-md transition-all border dark:border-gray-700"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="Total Traffic" value={data.stats.orderCount} icon={Package} color="blue" />
          <StatsCard title="Pending Review" value={data.stats.pendingCount} icon={Clock} color="amber" />
          <StatsCard title="Staff Members" value={data.stats.workerCount} icon={Users} color="green" />
          <StatsCard title="System Value (LKR)" value={`Rs. ${data.stats.totalValue.toLocaleString()}`} icon={BadgeDollarSign} color="indigo" />
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-10 border dark:border-gray-700 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black dark:text-white">Recent System Activity</h2>
            <TrendingUp className="text-blue-500" />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full space-y-4">
              {data.orders.slice(0, 10).map((order) => (
                <div 
                  key={order.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-gray-50 dark:bg-gray-700/30 rounded-3xl border border-transparent hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-2xl flex items-center justify-center shadow-sm font-bold text-blue-600">
                      #{order.order_number.slice(-3)}
                    </div>
                    <div>
                      <p className="font-black text-lg dark:text-white group-hover:text-blue-600 transition-colors">{order.order_number}</p>
                      <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{order.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        Rs. {(order.total_amount * 320).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Valuation</p>
                    </div>
                    <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'completed' ? 'bg-green-100 text-green-600' :
                      order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}

              {data.orders.length === 0 && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-700/20 rounded-3xl border-2 border-dashed dark:border-gray-700">
                  <AlertCircle className="mx-auto text-gray-400 mb-2" size={40} />
                  <p className="text-gray-500 font-medium">No system records found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}