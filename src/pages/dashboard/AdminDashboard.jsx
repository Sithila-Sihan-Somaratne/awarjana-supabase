import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Users, BadgeDollarSign, RefreshCcw, 
  ShieldCheck, TrendingUp, AlertCircle, Clock, 
  UserPlus, CheckCircle, TicketPlus, Hash
} from 'lucide-react';
import StatsCard from '../../components/common/StatsCard';
import Alert from '../../components/common/Alert';

export default function AdminDashboard() {
  const [data, setData] = useState({ 
    orders: [], employers: [], codes: [],
    stats: { totalValue: 0, orderCount: 0, employerCount: 0, pendingCount: 0 } 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: employers } = await supabase.from('users').select('*').eq('role', 'employer');
      const { data: codes } = await supabase.from('registration_codes').select('*').order('created_at', { ascending: false });

      const totalLKR = orders?.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0) || 0;

      setData({
        orders: orders || [],
        employers: employers || [],
        codes: codes || [],
        stats: {
          orderCount: orders?.length || 0,
          employerCount: employers?.length || 0,
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

  const generateNewCode = async () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const { error } = await supabase.from('registration_codes').insert([{ code: newCode, used: false }]);
      if (error) throw error;
      fetchGlobalData();
    } catch (err) {
      setError("Code Gen Failed: " + err.message);
    }
  };

  const handleAssignEmployer = async (orderId, employerId) => {
    if (!employerId) return;
    setAssigningId(orderId);
    try {
      // 1. Create the Job Card (This makes it appear on the Employer's Dashboard)
      const { error: jobError } = await supabase
        .from('job_cards')
        .insert([{ 
          order_id: orderId, 
          employer_id: employerId, 
          status: 'assigned' 
        }]);

      if (jobError) throw jobError;

      // 2. Update the Order status so it moves out of "Pending"
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'assigned' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 3. Refresh the data to update the UI
      await fetchGlobalData();
      
    } catch (err) {
      console.error("Full Assignment Error:", err);
      setError("Assignment Failed: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => { fetchGlobalData(); }, []);

  if (loading && !data.orders.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl"><ShieldCheck size={32} /></div>
            <div>
              <h1 className="text-3xl font-black dark:text-white">Admin Control</h1>
              <p className="text-gray-500 font-medium">Workshop Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={generateNewCode} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold transition-all">
              <TicketPlus size={18} /> Generate Reg-Code
            </button>
            <button onClick={fetchGlobalData} className="p-3 bg-white dark:bg-gray-800 dark:text-white rounded-xl border dark:border-gray-700 shadow-sm">
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="Total Orders" value={data.stats.orderCount} icon={Package} color="blue" />
          <StatsCard title="Needs Staff" value={data.stats.pendingCount} icon={Clock} color="amber" />
          <StatsCard title="Workshop Staff" value={data.stats.employerCount} icon={Users} color="green" />
          <StatsCard title="Active Codes" value={data.codes.filter(c => !c.used).length} icon={Hash} color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Stream */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 border dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-black dark:text-white mb-6">Active Order Stream</h2>
            <div className="space-y-4">
              {data.orders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">#{order.order_number.slice(-3)}</div>
                    <div>
                      <p className="font-bold dark:text-white">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{order.status.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    {order.status === 'pending' ? (
                      <select 
                        disabled={assigningId === order.id}
                        onChange={(e) => handleAssignEmployer(order.id, e.target.value)}
                        className="text-sm border rounded-lg p-2 dark:bg-gray-800 dark:text-white outline-none"
                      >
                        <option value="">Assign Staff...</option>
                        {data.employers.map(w => <option key={w.id} value={w.id}>{w.email.split('@')[0]}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 font-bold text-xs"><CheckCircle size={14}/> ASSIGNED</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registration Codes List */}
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 border dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-black dark:text-white mb-6">Registration Codes</h2>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
              {data.codes.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                  <span className="font-mono font-black text-indigo-600">{c.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.used ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {c.used ? 'USED' : 'AVAILABLE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}