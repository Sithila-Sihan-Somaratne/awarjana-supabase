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

      // 1. Fetch Orders - Make sure we join correctly to get the assigned employer
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *, 
          customer:users!orders_customer_id_fkey(full_name, email),
          employer:users!orders_assigned_employer_id_fkey(full_name, email),
          materials:order_materials(quantity, material:materials(name)),
          job_cards(status, employer_id)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: draftsData } = await supabase
        .from('drafts')
        .select('*, order:orders(order_number, title, priority, cost)')
        .eq('status', 'pending');

      // 2. Fetch Employers - Explicitly select id, name, and email
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employer');

      const { data: codesData } = await supabase
        .from('registration_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setOrders(ordersData || []);
      setPendingDrafts(draftsData || []);
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
      // Update the order status AND the assigned ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'assigned', assigned_employer_id: employerId })
        .eq('id', orderId);
      if (updateError) throw updateError;

      // Ensure the job card table is in sync
      await supabase.from('job_cards').upsert({ 
        order_id: orderId, 
        employer_id: employerId, 
        status: 'assigned' 
      }, { onConflict: 'order_id' });

      fetchData();
      if (selectedOrder) setSelectedOrder(null);
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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-600';
      case 'medium': return 'bg-amber-100 text-amber-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
      <RefreshCw className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter italic">Supervisor Hub</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Awarjana Production 2026</p>
          </div>
          <button onClick={() => navigate('/admin/inventory')} className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-900 dark:text-white rounded-2xl shadow-sm border dark:border-gray-800 font-black text-[10px] uppercase tracking-widest">
            <Database size={16} /> Inventory
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard title="Total" value={stats.total} icon={Package} color="indigo" />
          <StatCard title="Pending" value={stats.pending} icon={Clock} color="amber" />
          <StatCard title="Active" value={stats.active} icon={TrendingUp} color="blue" />
          <StatCard title="Done" value={stats.completed} icon={CheckCircle} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Pending Approvals */}
            {pendingDrafts.length > 0 && (
              <section>
                <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-amber-500 flex items-center gap-2">
                  <AlertCircle size={20} /> Action Required
                </h2>
                <div className="space-y-4">
                  {pendingDrafts.map(draft => (
                    <div key={draft.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/30 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border">
                          <img src={draft.draft_url} className="w-full h-full object-cover" alt="Draft" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-indigo-600 uppercase">{draft.order?.order_number}</p>
                          <p className="font-bold dark:text-white">{draft.order?.title}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDraft(draft.id, draft.order_id)} className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all">
                          <Check size={20} />
                        </button>
                        <a href={draft.draft_url} target="_blank" rel="noreferrer" className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl">
                          <Eye size={20} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Production Queue (The Fixed Section) */}
            <section>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-gray-400">Production Queue</h2>
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'completed').map(order => {
                  // FIX 1: Determine status based on actual data
                  const isAssigned = !!order.assigned_employer_id;
                  const currentJobStatus = order.job_cards?.[0]?.status || order.status;
                  
                  // FIX 2: Fallback for worker name
                  const workerDisplayName = order.employer?.full_name || order.employer?.email || 'Unassigned';

                  return (
                    <div key={order.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-black text-indigo-600 uppercase">{order.order_number}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityColor(order.priority)}`}>{order.priority}</span>
                        </div>
                        <p className="font-bold dark:text-white">{order.title}</p>
                        
                        <div className="mt-3 flex items-center gap-2">
                            {/* Status Badge */}
                            <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                              !isAssigned ? 'bg-amber-100 text-amber-600' :
                              currentJobStatus === 'in_progress' ? 'bg-blue-100 text-blue-600' : 
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {isAssigned ? currentJobStatus.replace('_', ' ') : 'Waiting for Worker'}
                            </span>

                            {/* Worker Info Badge */}
                            <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded ${
                              isAssigned ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' : 'text-gray-400'
                            }`}>
                              Worker: {workerDisplayName}
                            </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setSelectedOrder(order)} className="px-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl font-black text-[10px] uppercase">
                          Details
                        </button>
                        
                        {/* THE DROPDOWN: Fixed visibility and name fallbacks */}
                        <select 
                          value={order.assigned_employer_id || ''} 
                          onChange={(e) => handleAssignWorker(order.id, e.target.value)} 
                          className="p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500"
                        >
                          <option value="">Assign Worker...</option>
                          {employers.map(emp => (
                            <option key={emp.id} value={emp.id} className="text-black bg-white">
                              {emp.full_name || emp.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Recently Completed */}
            <section>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-green-500 flex items-center gap-2">
                <CheckSquare size={20} /> Recently Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => o.status === 'completed').slice(0, 4).map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] border dark:border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase">{order.order_number}</p>
                      <Check size={14} className="text-green-500" />
                    </div>
                    <p className="font-bold dark:text-white text-sm truncate">{order.title}</p>
                    <p className="text-[9px] text-gray-500 uppercase mt-2">
                      By: {order.employer?.full_name || order.employer?.email || 'System'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            {/* Sidebar with Access Keys */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Key size={16} /> Access Keys
              </h3>
              <div className="space-y-3">
                {codes.map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-mono font-black text-indigo-600">{c.plain_code || 'HIDDEN'}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">{c.role}</p>
                    </div>
                    {c.used && <CheckCircle size={14} className="text-green-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-indigo-600 uppercase">{selectedOrder.order_number}</p>
                <h2 className="text-2xl font-black dark:text-white uppercase">{selectedOrder.title}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={24} className="dark:text-white" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Materials</p>
                <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.materials?.map((m, i) => (
                      <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between">
                        <span className="font-bold text-xs dark:text-white">{m.material?.name}</span>
                        <span className="text-indigo-600 font-black text-xs">x{m.quantity}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="pt-6 border-t dark:border-gray-800 flex justify-between items-center">
                <select 
                  value={selectedOrder.assigned_employer_id || ''} 
                  onChange={(e) => handleAssignWorker(selectedOrder.id, e.target.value)}
                  className="p-4 bg-white dark:bg-black text-gray-900 dark:text-white border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="">Reassign Worker...</option>
                  {employers.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email}
                    </option>
                  ))}
                </select>
                <p className="text-2xl font-black dark:text-white italic">Rs. {selectedOrder.cost}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/30'
  };
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-800 transition-transform hover:scale-[1.02]">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black dark:text-white mt-1">{value}</p>
    </div>
  );
}