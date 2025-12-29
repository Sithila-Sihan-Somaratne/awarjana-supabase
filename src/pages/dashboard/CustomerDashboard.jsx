import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Package, Clock, CheckCircle, Plus, 
  DollarSign, RefreshCcw, LayoutDashboard, 
  Search, SlidersHorizontal 
} from 'lucide-react';
import OrderCard from '../../components/common/OrderCard';
import StatsCard from '../../components/common/StatsCard';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user && userRole === 'customer') fetchCustomerData();
  }, [user, userRole]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStats({
        total: data.length,
        pending: data.filter(o => o.status === 'pending').length,
        inProgress: data.filter(o => ['assigned', 'in_progress'].includes(o.status)).length,
        completed: data.filter(o => o.status === 'completed').length,
        totalSpent: data.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0)
      });
      setOrders(data || []);
    } catch (err) {
      console.error("Dashboard Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFiltered = () => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'active') return orders.filter(o => o.status !== 'completed');
    if (activeTab === 'completed') return orders.filter(o => o.status === 'completed');
    return orders;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-bold dark:text-gray-400">Syncing Workshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-900 transition-all duration-300 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-[1.5rem] text-white shadow-2xl shadow-blue-500/40">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black dark:text-white tracking-tight">Customer Hub</h1>
              <p className="text-gray-500 font-semibold dark:text-gray-400 uppercase text-xs tracking-widest">Awarjana Premium Frameworks</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/orders/new')} 
            className="group w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[1.5rem] font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
            INITIATE NEW PROJECT
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="My Projects" value={stats.total} icon={Package} color="blue" />
          <StatsCard title="In Production" value={stats.inProgress} icon={Clock} color="amber" />
          <StatsCard title="Finished" value={stats.completed} icon={CheckCircle} color="green" />
          <StatsCard title="Spent (LKR)" value={`Rs. ${(stats.totalSpent * 320).toLocaleString()}`} icon={DollarSign} color="indigo" />
        </div>

        {/* Orders Container */}
        <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border dark:border-gray-700 overflow-hidden transition-all">
          <div className="flex flex-col sm:flex-row p-4 gap-4 bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-700 items-center justify-between">
            <div className="flex p-1.5 bg-gray-200/50 dark:bg-gray-700 rounded-2xl gap-1">
              {['all', 'active', 'completed'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveTab(t)} 
                  className={`px-8 py-2.5 rounded-xl capitalize transition-all font-bold text-sm ${
                    activeTab === t 
                    ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600 dark:text-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                placeholder="Search projects..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6">
            {getFiltered().length > 0 ? (
              getFiltered().map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onView={() => navigate(`/orders/${order.id}`)} 
                  userRole="customer" 
                />
              ))
            ) : (
              <div className="text-center py-32">
                <div className="bg-gray-100 dark:bg-gray-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-bold dark:text-white">No projects found</h3>
                <p className="text-gray-500 dark:text-gray-400">Time to start your first custom frame!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}