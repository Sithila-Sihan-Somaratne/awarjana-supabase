import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Package, Clock, CheckCircle, AlertCircle, Plus, DollarSign, Calendar, RefreshCcw
} from 'lucide-react';
import Alert from '../../components/common/Alert';
import OrderCard from '../../components/common/OrderCard';
import StatsCard from '../../components/common/StatsCard';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  // State Management
  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({ 
    total: 0, pending: 0, inProgress: 0, completed: 0, totalSpent: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [roleChecking, setRoleChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const ensureRoleAndLoad = async () => {
      try {
        setRoleChecking(true);
        let effectiveRole = userRole;

        // Verify role directly if context is pending
        if (!effectiveRole) {
          const { data, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (roleError) throw new Error('Failed to verify user role');
          effectiveRole = data?.role;
        }

        if (effectiveRole !== 'customer') {
          navigate('/login');
          return;
        }

        await fetchCustomerData();
      } catch (err) {
        setError(err.message);
      } finally {
        setRoleChecking(false);
      }
    };

    ensureRoleAndLoad();
  }, [user, userRole, navigate]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Safe query: Join users table via assigned_worker_id
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_worker:assigned_worker_id(
            id, 
            email
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const normalized = ordersData || [];
      
      // Calculate Stats
      const statsObj = {
        total: normalized.length,
        pending: normalized.filter(o => o.status === 'pending').length,
        inProgress: normalized.filter(o => ['assigned', 'in_progress'].includes(o.status)).length,
        completed: normalized.filter(o => o.status === 'completed').length,
        totalSpent: normalized.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0)
      };

      setOrders(normalized);
      setRecentOrders(normalized.slice(0, 5));
      setStats(statsObj);
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'active') return orders.filter(o => ['pending', 'assigned', 'in_progress'].includes(o.status));
    if (activeTab === 'completed') return orders.filter(o => o.status === 'completed');
    return orders;
  };

  if (roleChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your workshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your framing projects and track progress</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchCustomerData}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCcw size={20} />
              </button>
              <button 
                onClick={() => navigate('/orders/new')} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <Plus size={18} /> New Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Orders" value={stats.total} icon={Package} color="blue" />
          <StatsCard title="In Progress" value={stats.inProgress} icon={Clock} color="amber" />
          <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
          <StatsCard title="Total Investment" value={`$${stats.totalSpent.toLocaleString()}`} icon={DollarSign} color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Orders Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
              <div className="flex border-b dark:border-gray-700 overflow-x-auto">
                {['all', 'active', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                      activeTab === tab 
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab} Orders
                  </button>
                ))}
              </div>

              <div className="p-6">
                {getFilteredOrders().length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium dark:text-white">No orders found</h3>
                    <p className="text-gray-500">When you place an order, it will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredOrders().map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onView={() => navigate(`/orders/${order.id}`)} 
                        userRole="customer" 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Activity & Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-blue-500" /> Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentOrders.map((order, idx) => (
                    <li key={order.id} className="relative pb-8">
                      {idx !== recentOrders.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                      <div className="relative flex space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${
                          order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {order.status === 'completed' ? <CheckCircle size={14} /> : <Package size={14} />}
                        </div>
                        <div className="min-w-0 flex-1 py-1.5">
                          <p className="text-sm dark:text-gray-300">
                            Order <span className="font-bold dark:text-white">#{order.order_number}</span> is now {order.status.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-4">Our workshop staff is available Mon-Fri for any questions regarding your framing projects.</p>
              <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}