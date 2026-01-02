import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, Package, Clock, CheckCircle, 
  RefreshCw, AlertCircle, Eye, Check, X, UserPlus, Database, Info, Key
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

      // 1. Fetch Orders with Nested Job Cards
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
        .select(`*, order:orders(order_number, title, priority, cost), employer:users(full_name)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // 3. Fetch Employers (Workers)
      const { data: usersData } = await supabase.from('users').select('*').eq('role', 'employer');

      // 4. Fetch Latest Registration Codes (using plain_code if available)
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
        active: ordersData.filter(o => o.status !== 'completed' && o.status !== 'pending').length,
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
      // Update Order Table
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'assigned', assigned_employer_id: employerId })
        .eq('id', orderId);
      if (updateError) throw updateError;

      // Create/Update Job Card Table
      const { error: jobCardError } = await supabase
        .from('job_cards')
        .upsert({ 
          order_id: orderId, 
          employer_id: employerId, 
          status: 'assigned' 
        }, { onConflict: 'order_id' }); // Assuming one job card per order
      
      if (jobCardError) throw jobCardError;

      await fetchData();
      setSelectedOrder(null);
    } catch (err) { 
      alert(err.message);
      fetchData(); 
    }
  };

  const handleApproveDraft = async (draftId, orderId) => {
    try {
      await supabase.from('drafts').update({ status: 'approved' }).eq('id', draftId);
      await supabase.from('orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', orderId);
      await supabase.from('job_cards').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('order_id', orderId);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleRejectDraft = async (draftId, orderId) => {
    try {
      await supabase.from('drafts').update({ status: 'rejected' }).eq('id', draftId);
      await supabase.from('orders').update({ status: 'in_progress' }).eq('id', orderId);
      await supabase.from('job_cards').update({ status: 'in_progress' }).eq('order_id', orderId);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const getPriorityColor = (p) => {
    switch(p?.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Supervisor Hub</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Production Management 2026</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/inventory')} className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-900 dark:text-white rounded-2xl shadow-sm border dark:border-gray-800 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">
              <Database size={16} /> Inventory
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Orders', value: stats.total, icon: <TrendingUp />, color: 'text-indigo-600' },
            { label: 'Pending', value: stats.pending, icon: <Clock />, color: 'text-amber-500' },
            { label: 'In Production', value: stats.active, icon: <Package />, color: 'text-blue-500' },
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
            
            {/* 1. Pending Approvals Section */}
            {pendingDrafts.length > 0 && (
              <section>
                <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-amber-500 flex items-center gap-2">
                  <AlertCircle size={20} /> Pending Approvals
                </h2>
                <div className="space-y-4">
                  {pendingDrafts.map(draft => (
                    <div key={draft.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-amber-100 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden">
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
                        <button onClick={() => handleApproveDraft(draft.id, draft.order_id)} className="p-3 bg-green-100 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"><Check size={20} /></button>
                        <button onClick={() => handleRejectDraft(draft.id, draft.order_id)} className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><X size={20} /></button>
                        <a href={draft.draft_url} target="_blank" rel="noreferrer" className="p-3 bg-gray-100 text-gray-500 rounded-xl"><Eye size={20} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Active Orders Section (Using Job Card Status) */}
            <section>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-gray-400">Active Production</h2>
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'completed').map(order => {
                  const jobStatus = order.job_cards?.[0]?.status || 'pending_assignment';
                  
                  return (
                    <div key={order.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-black text-indigo-600 uppercase">{order.order_number}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityColor(order.priority)}`}>{order.priority}</span>
                        </div>
                        <p className="font-bold dark:text-white">{order.title || 'Custom Project'}</p>
                        
                        <div className="flex flex-col gap-1 mt-3">
                          <div className="flex items-center gap-2">
                            {/* STATUS CHIP - NOW FROM JOB CARDS */}
                            <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                              jobStatus === 'in_progress' ? 'bg-blue-100 text-blue-600' : 
                              jobStatus === 'assigned' ? 'bg-purple-100 text-purple-600' : 
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {jobStatus.replace('_', ' ')}
                            </span>
                            {order.employer && (
                              <span className="text-[8px] font-black text-purple-600 uppercase tracking-tighter">
                                👤 {order.employer.full_name || order.employer.email}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            Client: {order.customer?.full_name || order.customer?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedOrder(order)} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-gray-200 transition-all">
                          <Info size={20} />
                        </button>
                        <select 
                          value={order.assigned_employer_id || ''} 
                          onChange={(e) => handleAssignWorker(order.id, e.target.value)} 
                          className="p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl border-none text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500"
                        >
                          <option value="">{order.assigned_employer_id ? 'Change Worker' : 'Assign Worker'}</option>
                          {employers.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar: Codes */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Key size={14}/> Reg-Codes
              </h3>
              <div className="space-y-3">
                {codes.map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                    <p className="text-xs font-mono font-black text-indigo-600 truncate">
                      {c.plain_code || 'HIDDEN HASH'}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{c.role}</p>
                      {c.used && <CheckCircle size={12} className="text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/admin/codes')} className="w-full mt-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">
                Manage All Codes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{selectedOrder.order_number}</p>
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{selectedOrder.title}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                <X size={24} className="dark:text-white" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dimensions</p>
                  <p className="text-lg font-bold dark:text-white">{selectedOrder.width}" × {selectedOrder.height}"</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                  <p className={`text-lg font-bold uppercase ${getPriorityColor(selectedOrder.priority)}`}>{selectedOrder.priority}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Materials Required</p>
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
                  {employers.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>)}
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