import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, Package, Clock, CheckCircle, 
  RefreshCw, AlertCircle, Eye, Check, X, UserPlus, Database, Info, Key, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0 });
  const [orders, setOrders] = useState([]);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Orders with all nested production data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *, 
          customer:users!orders_customer_id_fkey(full_name, email),
          employer:users!orders_assigned_employer_id_fkey(full_name, email),
          materials:order_materials(quantity, material:materials(name)),
          job_cards(id, status, total_time_ms, drafts(*))
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;

      // 2. Extract Pending Drafts from nested cards for the notification section
      const allDrafts = (ordersData || [])
        .flatMap(o => o.job_cards || [])
        .flatMap(jc => jc.drafts || [])
        .filter(d => d.status === 'pending');

      const { data: usersData } = await supabase.from('users').select('*').eq('role', 'employer');
      const { data: codesData } = await supabase.from('registration_codes').select('*').order('created_at', { ascending: false }).limit(5);

      setOrders(ordersData || []);
      setPendingDrafts(allDrafts);
      setEmployers(usersData || []);
      setCodes(codesData || []);

      setStats({
        total: ordersData.length,
        pending: ordersData.filter(o => o.status === 'pending').length,
        active: ordersData.filter(o => ['assigned', 'in_progress', 'review'].includes(o.status)).length,
        completed: ordersData.filter(o => o.status === 'completed').length
      });
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssignWorker = async (orderId, employerId) => {
    if (!employerId) return;
    try {
      await supabase.from('orders').update({ status: 'assigned', assigned_employer_id: employerId }).eq('id', orderId);
      await supabase.from('job_cards').upsert({ 
        order_id: orderId, 
        employer_id: employerId, 
        status: 'assigned',
        is_paused: true 
      }, { onConflict: 'order_id' });
      fetchData();
      setSelectedOrder(null);
    } catch (err) { alert(err.message); }
  };

  const handleApproveDraft = async (draftId, orderId) => {
    try {
      const now = new Date().toISOString();
      await supabase.from('drafts').update({ status: 'approved' }).eq('id', draftId);
      await supabase.from('orders').update({ status: 'completed', completed_at: now }).eq('id', orderId);
      await supabase.from('job_cards').update({ status: 'completed', completed_at: now }).eq('order_id', orderId);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    return new Date(totalSeconds * 1000).toISOString().substr(11, 8);
  };

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter italic">Supervisor Hub</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Production Control 2026</p>
          </div>
          <button onClick={() => navigate('/admin/inventory')} className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-900 dark:text-white rounded-2xl shadow-sm border dark:border-gray-800 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">
            <Database size={16} /> Inventory
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Orders', value: stats.total, icon: <TrendingUp />, color: 'text-indigo-600' },
            { label: 'Pending', value: stats.pending, icon: <Clock />, color: 'text-amber-500' },
            { label: 'Active', value: stats.active, icon: <Package />, color: 'text-blue-500' },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle />, color: 'text-green-500' }
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
              <div className={`mb-4 ${s.color}`}>{s.icon}</div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {pendingDrafts.length > 0 && (
              <section>
                <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-amber-500 flex items-center gap-2">
                  <AlertCircle size={20} /> Review Pending
                </h2>
                <div className="space-y-4">
                  {pendingDrafts.map(draft => (
                    <div key={draft.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-amber-100 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <img src={draft.draft_url} className="w-16 h-16 rounded-xl object-cover border" alt="Proof" />
                        <div>
                          <p className="text-xs font-black text-indigo-600 uppercase">New Submission</p>
                          <p className="font-bold dark:text-white">Review Required</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDraft(draft.id, draft.order_id)} className="p-3 bg-green-100 text-green-600 rounded-xl"><Check size={20} /></button>
                        <a href={draft.draft_url} target="_blank" rel="noreferrer" className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl"><Eye size={20} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-gray-400">Live Production</h2>
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'completed').map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-xs font-black text-indigo-600 uppercase">{order.order_number}</p>
                      <p className="font-bold dark:text-white">{order.title}</p>
                      <div className="mt-2 flex items-center gap-4">
                         <div className="flex items-center gap-1 text-gray-400">
                           <Clock size={12} />
                           <span className="text-[10px] font-mono font-bold">{formatTime(order.job_cards?.[0]?.total_time_ms)}</span>
                         </div>
                         <p className="text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded">
                           {order.employer?.full_name || 'Not Assigned'}
                         </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedOrder(order)} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl">
                      <Info size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}