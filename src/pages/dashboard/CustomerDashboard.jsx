// src/pages/customer/CustomerDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, Clock, CheckCircle, Plus, BadgeDollarSign, LayoutDashboard } from 'lucide-react';
import OrderCard from '../../components/common/OrderCard';
import StatsCard from '../../components/common/StatsCard';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchCustomerData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });

      if (error) throw error;
      const validData = data || [];
      
      const totalValue = validData.reduce((sum, o) => sum + (parseFloat(o.total_amount) || parseFloat(o.cost) || 0), 0);

      setStats({
        total: validData.length,
        pending: validData.filter(o => o.status === 'pending').length,
        inProgress: validData.filter(o => ['assigned', 'in_progress', 'review'].includes(o.status)).length,
        completed: validData.filter(o => o.status === 'completed').length,
        totalSpent: totalValue
      });
      setOrders(validData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (userRole === 'customer') fetchCustomerData(); }, [user, userRole]);

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'active') return o.status !== 'completed';
    if (activeTab === 'completed') return o.status === 'completed';
    return true;
  });

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black transition-all p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20"><LayoutDashboard size={32} /></div>
            <div>
              <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Customer Hub</h1>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">My Premium Orders</p>
            </div>
          </div>
          <button onClick={() => navigate('/orders/new')} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 shadow-xl transition-all active:scale-95">
            <Plus size={24} /> NEW PROJECT
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="Total Projects" value={stats.total} icon={Package} color="blue" />
          <StatsCard title="In Production" value={stats.inProgress} icon={Clock} color="amber" />
          <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
          <StatsCard title="Total Value" value={`Rs. ${stats.totalSpent.toLocaleString()}`} icon={BadgeDollarSign} color="indigo" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border dark:border-gray-800 overflow-hidden">
          <div className="flex p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-700 gap-2">
            {['all', 'active', 'completed'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} 
                className={`px-6 py-2 rounded-xl capitalize font-black text-xs transition-all ${activeTab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-6 md:p-10 space-y-6">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => <OrderCard key={order.id} order={order} onView={() => navigate(`/orders/${order.id}`)} userRole="customer" />)
            ) : (
              <div className="text-center py-20 text-gray-400 font-bold italic">No projects found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}