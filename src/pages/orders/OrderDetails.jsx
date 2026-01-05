import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Package, Clock, Users, FileText, 
  AlertTriangle, TrendingUp, Edit3, Trash2, X 
} from 'lucide-react';
import { formatLKR } from '../../lib/costCalculator';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal & Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', customer_notes: '' });

  useEffect(() => {
    if (user && id) fetchOrderDetails();
  }, [user, id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`*, customer:users!customer_id(id, email), employer:users!assigned_employer_id(id, email)`)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setEditForm({ title: orderData.title || '', customer_notes: orderData.customer_notes || '' });

      const { data: materialsData } = await supabase
        .from('order_materials')
        .select(`quantity, cost_at_time, materials!order_materials_material_id_fkey (name)`)
        .eq('order_id', id);

      setOrderMaterials(materialsData || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const { error } = await supabase
        .from('orders')
        .update({ title: editForm.title, customer_notes: editForm.customer_notes })
        .eq('id', id)
        .eq('status', 'pending');

      if (error) throw error;
      setIsModalOpen(false);
      fetchOrderDetails(); // Refresh data
    } catch (err) { alert(err.message); } finally { setIsActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this project permanently?")) return;
    try {
      setIsActionLoading(true);
      const { error } = await supabase.from('orders').delete().eq('id', id).eq('status', 'pending');
      if (error) throw error;
      navigate('/customer/dashboard');
    } catch (err) { alert(err.message); } finally { setIsActionLoading(false); }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      assigned: 'bg-purple-100 text-purple-700 border-purple-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-black"><div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black pb-12 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 py-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center text-[10px] text-gray-400 hover:text-blue-500 mb-2 font-black tracking-widest">
              <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO HUB
            </button>
            <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase italic leading-none">
              Project <span className="text-blue-600">#{order.order_number}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {order.status === 'pending' && (
              <>
                <button onClick={() => setIsModalOpen(true)} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:text-blue-600 transition-all"><Edit3 size={20} /></button>
                <button onClick={handleDelete} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>
              </>
            )}
            <span className={`px-6 py-2 rounded-xl text-xs font-black uppercase border-2 ${getStatusStyle(order.status)}`}>{order.status}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* BUILD SPECS */}
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-8 flex items-center gap-3 tracking-widest"><Package size={20} className="text-blue-500" /> Build Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frame Title</p>
                        <p className="text-2xl font-bold dark:text-white">{order.title || 'Custom Project'}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Glass Dimensions</p>
                        <p className="text-2xl font-mono font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl w-fit">{order.width}" × {order.height}"</p>
                    </div>
                </div>
                <div className="mt-12 pt-12 border-t dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest">Resource Allocation</p>
                    {orderMaterials.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] mb-4">
                            <div>
                                <p className="font-black dark:text-white text-base tracking-tight">{item.materials?.name || 'Standard Frame Material'}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Quantity: {parseFloat(item.quantity).toFixed(2)} units</p>
                            </div>
                            <p className="font-black text-blue-500 text-lg">{formatLKR(item.cost_at_time * item.quantity)}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* NOTES */}
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-4 flex items-center gap-3 tracking-widest"><FileText size={20} className="text-blue-500" /> Production Log</h3>
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                    <p className="text-sm dark:text-gray-300 font-medium italic leading-relaxed">"{order.customer_notes || "No specific client instructions provided."}"</p>
                </div>
            </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-8">
            <div className="bg-blue-600 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
                <TrendingUp className="absolute -right-6 -bottom-6 text-white/10" size={160} />
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Investment Total</p>
                <h2 className="text-5xl font-black mt-2 tracking-tighter">{formatLKR(order.total_amount || order.cost || 0)}</h2>
            </div>
            {/* PERSONNEL */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-xl border dark:border-gray-800">
                <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 flex items-center gap-3 tracking-widest"><Users size={16} className="text-blue-500" /> Personnel</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-xs">{order.customer?.email?.charAt(0)}</div>
                        <p className="text-xs font-bold dark:text-white truncate">{order.customer?.email}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-2xl font-black dark:text-white uppercase italic tracking-tighter">Edit Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Project Title</label>
                <input 
                  type="text" 
                  value={editForm.title} 
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Client Instructions</label>
                <textarea 
                  value={editForm.customer_notes} 
                  onChange={(e) => setEditForm({...editForm, customer_notes: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold h-32 resize-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={isActionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {isActionLoading ? 'Saving...' : 'Confirm Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}