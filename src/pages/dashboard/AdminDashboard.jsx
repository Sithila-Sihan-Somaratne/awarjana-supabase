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

      // 1. Fetch Orders with Nested Job Cards and properly linked workers
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

      // 2. Fetch Pending Drafts
      const { data: draftsData } = await supabase
        .from('drafts')
        .select('*, order:orders(order_number, title, priority, cost)')
        .eq('status', 'pending');

      // 3. Fetch Employers (Workers)
      const { data: usersData } = await supabase.from('users').select('*').eq('role', 'employer');

      // 4. Fetch Registration Codes
      const { data: codesData } = await supabase
        .from('registration_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setOrders(ordersData || []);
      setPendingDrafts(draftsData || []);
      setEmployers(usersData || []);
      setCodes(codesData || []);

      // Calculate Stats based on Order + Job Card status
      setStats({
        total: ordersData.length,
        pending: ordersData.filter(o => o.status === 'pending').length,
        active: ordersData.filter(o => ['assigned', 'in_progress', 'review'].includes(o.status)).length,
        completed: ordersData.filter(o => o.status === 'completed').length
      });
    } catch (err) { 
      console.error("Error fetching admin data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignWorker = async (orderId, employerId) => {
    if (!employerId) return;
    try {
      // Update Order Table Master Status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'assigned', assigned_employer_id: employerId })
        .eq('id', orderId);
      if (updateError) throw updateError;

      // Upsert Job Card (Syncs worker production status)
      const { error: jobCardError } = await supabase
        .from('job_cards')
        .upsert({ 
          order_id: orderId, 
          employer_id: employerId, 
          status: 'assigned' 
        }, { onConflict: 'order_id' });

      if (jobCardError) throw jobCardError;

      fetchData();
      if (selectedOrder) setSelectedOrder(null);
    } catch (err) {
      alert(err.message);
    }
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
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Supervisor Hub</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Awarjana Production 2026</p>
          </div>
          <button onClick={() => navigate('/admin/inventory')} className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-900 dark:text-white rounded-2xl shadow-sm border dark:border-gray-800 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">
            <Database size={16} /> Inventory
          </button>
        </header>

        {/* Stats Grid */}
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
                    <div key={draft.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-amber-100 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border">
                          <img src={draft.draft_url} className="w-full h-full object-cover" alt="Draft" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-indigo-600 uppercase">{draft.order?.order_number}</p>
                          <p className="font-bold dark:text-white">{draft.order?.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityColor(draft.order?.priority)}`}>{draft.order?.priority}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Rs. {draft.order?.cost}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDraft(draft.id, draft.order_id)} className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all">
                          <Check size={20} />
                        </button>
                        <button className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl">
                          <Info size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Active Production */}
            <section>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-gray-400">Active Production</h2>
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'completed' && o.status !== 'pending').map(order => {
                  const jobStatus = order.job_cards?.[0]?.status || 'assigned';
                  return (
                    <div key={order.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-black text-indigo-600 uppercase">{order.order_number}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityColor(order.priority)}`}>{order.priority}</span>
                        </div>
                        <p className="font-bold dark:text-white">{order.title}</p>
                        <div className="flex flex-col gap-1 mt-3">
                          <div className="flex items-center gap-2">
                            {/* STATUS CHIP - NOW FROM JOB CARDS */}
                            <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                              jobStatus === 'in_progress' ? 'bg-blue-100 text-blue-600' : 
                              jobStatus === 'assigned' ? 'bg-purple-100 text-purple-600' : 
                              jobStatus === 'review' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {jobStatus.replace('_', ' ')}
                            </span>
                            {order.employer && (
                              <span className="text-[8px] font-black text-purple-600 uppercase tracking-tighter bg-purple-50 px-2 py-0.5 rounded">
                                Assigned to: {order.employer.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="flex-1 md:flex-none px-6 py-4 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                        >
                          View Details
                        </button>
                        <select 
                          value={order.assigned_employer_id || ''} 
                          onChange={(e) => handleAssignWorker(order.id, e.target.value)} 
                          className="p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl border-none text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500"
                        >
                          <option value="">{order.assigned_employer_id ? 'Reassign' : 'Assign Worker'}</option>
                          {employers.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Recently Completed */}
            <section className="mt-12">
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-green-500 flex items-center gap-2">
                <CheckSquare size={20} /> Recently Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => o.status === 'completed').slice(0, 6).map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] border dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase">{order.order_number}</p>
                        <p className="font-bold dark:text-white text-sm">{order.title}</p>
                      </div>
                      <div className="bg-green-50 text-green-600 p-2 rounded-full"><Check size={14} /></div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Finished by: {order.employer?.full_name || 'System'}</p>
                       <p className="text-[10px] font-black dark:text-white">Rs. {order.cost}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Key size={16} /> Keys
              </h3>
              <div className="space-y-3">
                {codes.map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                    <p className="text-xs font-mono font-black text-indigo-600 truncate">{c.plain_code || 'HIDDEN'}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{c.role}</p>
                      {c.used && <CheckCircle size={12} className="text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/admin/codes')} className="w-full mt-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">
                Manage Codes
              </button>
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
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{selectedOrder.title}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                <X size={24} className="dark:text-white" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Customer Info</p>
                <p className="font-bold dark:text-white">{selectedOrder.customer?.full_name}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customer?.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Required Materials</p>
                <div className="space-y-2">
                  {selectedOrder.materials?.map((m, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <span className="font-bold dark:text-white">{m.material?.name}</span>
                      <span className="text-indigo-600 font-black">x{m.quantity}</span>
                    </div>
                  ))}
                  {(!selectedOrder.materials || selectedOrder.materials.length === 0) && <p className="text-gray-500 italic">No materials specified.</p>}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus size={20} className="text-indigo-600" />
                <select 
                  value={selectedOrder.assigned_employer_id || ''} 
                  onChange={(e) => handleAssignWorker(selectedOrder.id, e.target.value)}
                  className="p-4 bg-white dark:bg-gray-900 dark:text-white rounded-2xl border-none text-xs font-bold outline-none shadow-sm"
                >
                  <option value="">Assign Worker...</option>
                  {employers.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <p className="text-xl font-black dark:text-white">Rs. {selectedOrder.cost}</p>
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
    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black dark:text-white mt-1">{value}</p>
    </div>
  );
}