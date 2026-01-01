// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Users, BadgeDollarSign, RefreshCcw, 
  ShieldCheck, AlertCircle, Clock, 
  CheckCircle, TicketPlus, Hash, Inbox
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
      setError(null);

      const [oRes, eRes, cRes] = await Promise.all([
        supabase.from('orders').select('*, job_cards(id, employer_id)').order('created_at', { ascending: false }),
        supabase.from('users').select('*').eq('role', 'employer'),
        supabase.from('registration_codes').select('*').order('created_at', { ascending: false })
      ]);

      if (oRes.error) throw oRes.error;
      if (eRes.error) throw eRes.error;
      if (cRes.error) throw cRes.error;

      const orders = oRes.data || [];
      const employers = eRes.data || [];
      const codes = cRes.data || [];

      // Calculate total value from cost or total_amount
      const totalValue = orders.reduce((s, o) => s + (parseFloat(o.cost) || parseFloat(o.total_amount) || 0), 0);

      setData({
        orders,
        employers,
        codes,
        stats: {
          orderCount: orders.length,
          employerCount: employers.length,
          // FIX: Check if job_cards is empty array OR null
          pendingCount: orders.filter(o => !o.job_cards || o.job_cards.length === 0).length,
          totalValue 
        }
      });
    } catch (err) {
      setError("System Sync Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployer = async (orderId, employerId) => {
    if (!employerId) return;
    setAssigningId(orderId);
    try {
      // 1. Create Job Card
      const { error: jobError } = await supabase.from('job_cards').insert([{ 
        order_id: orderId, 
        employer_id: employerId, 
        status: 'pending' 
      }]);
      if (jobError) throw jobError;

      // 2. Update Order status
      const { error: orderError } = await supabase.from('orders').update({ 
        status: 'assigned',
        assigned_employer_id: employerId // Syncing with your DB schema
      }).eq('id', orderId);

      if (orderError) throw orderError;

      fetchGlobalData();
    } catch (err) {
      setError("Assignment Failed: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => { fetchGlobalData(); }, []);

  return (
    // Changed bg to adapt to dark/light mode
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white p-4 md:p-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/20 text-white">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Admin Control</h1>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-[0.2em]">2026 Workshop Management</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchGlobalData} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-500 transition-all">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-8" />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard title="Total Orders" value={data.stats.orderCount} icon={Package} color="blue" />
          <StatsCard title="Unassigned" value={data.stats.pendingCount} icon={Clock} color="amber" />
          <StatsCard title="Active Staff" value={data.stats.employerCount} icon={Users} color="green" />
          <StatsCard title="Value" value={`Rs. ${data.stats.totalValue}`} icon={BadgeDollarSign} color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Order Stream - Adaptive Theme */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-[3rem] p-8 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <RefreshCcw size={24} className="text-indigo-500" /> Order Stream
            </h2>
            <div className="space-y-4">
              {data.orders.length > 0 ? (
                data.orders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row justify-between items-center p-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] hover:border-indigo-500/50 transition-all">
                    <div className="flex items-center gap-5 w-full">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl">
                        {order.order_number ? order.order_number.slice(-2) : '??'}
                      </div>
                      <div>
                        <p className="font-black text-lg tracking-tight">{order.order_number || "DRAFT_ORD"}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.status}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 w-full sm:w-auto">
                      {(!order.job_cards || order.job_cards.length === 0) ? (
                        <select 
                          disabled={assigningId === order.id}
                          onChange={(e) => handleAssignEmployer(order.id, e.target.value)}
                          className="w-full sm:w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500"
                        >
                          <option value="">Assign Worker...</option>
                          {data.employers.map(w => <option key={w.id} value={w.id}>{w.email}</option>)}
                        </select>
                      ) : (
                        <div className="bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 px-4 py-2 rounded-xl border border-green-200 dark:border-green-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle size={14}/> Assigned
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-[#161616] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Inbox className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-400 font-bold italic">No orders found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Registration Codes - Adaptive Theme */}
          <div className="bg-white dark:bg-[#111] rounded-[3rem] p-8 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Hash size={24} className="text-indigo-500" /> Reg-Codes
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {data.codes.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-gray-800">
                  {/* Displays the unhashed code column */}
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg tracking-tighter">
                    {c.code || "HASHED"}
                  </span>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${c.used ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-600' : 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500 border dark:border-green-500/20'}`}>
                    {c.used ? 'Used' : 'Active'}
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