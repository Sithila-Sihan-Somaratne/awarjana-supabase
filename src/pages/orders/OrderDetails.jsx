// src/pages/customer/OrderDetails.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Package, Clock, 
  Ruler, Users, FileText, AlertTriangle, TrendingUp 
} from 'lucide-react';
import Alert from '../../components/common/Alert';
import { formatLKR } from '../../lib/costCalculator';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && id) fetchOrderDetails();
  }, [user, id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch Order with relational joins for Customer and Employer
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(id, email),
          employer:users!orders_assigned_employer_id_fkey(id, email)
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // 2. Fetch Materials with explicit join to avoid "N/A" material names
      const { data: materialsData, error: materialsError } = await supabase
        .from('order_materials')
        .select(`
          quantity,
          cost_at_time,
          materials!order_materials_material_id_fkey (
            name
          )
        `)
        .eq('order_id', id);

      if (materialsError) throw materialsError;
      setOrderMaterials(materialsData || []);

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      assigned: 'bg-purple-100 text-purple-700 border-purple-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      review: 'bg-orange-100 text-orange-700 border-orange-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black transition-colors">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Retrieving Project Data</p>
      </div>
    </div>
  );
  
  if (error || !order) return (
    <div className="p-20 text-center dark:bg-black min-h-screen">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
      <div className="text-red-500 mb-4 font-black tracking-widest uppercase">Project Not Found</div>
      <button onClick={() => navigate(-1)} className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl text-blue-500 font-black text-xs uppercase transition-all hover:scale-105">
        Return to Hub
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black pb-12 transition-colors">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 py-8 sticky top-0 z-10 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center text-[10px] text-gray-400 hover:text-blue-500 mb-2 transition-all font-black tracking-widest">
              <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO HUB
            </button>
            <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase italic leading-none">
              Project <span className="text-blue-600">#{order.order_number}</span>
            </h1>
          </div>
          <span className={`px-6 py-2 rounded-xl text-xs font-black uppercase border-2 shadow-sm ${getStatusStyle(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Specs & Materials */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800 transition-colors">
            <h3 className="text-xs font-black uppercase text-gray-400 mb-8 flex items-center gap-3 tracking-widest">
              <Package size={20} className="text-blue-500" /> Build Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frame Title</p>
                <p className="text-2xl font-bold dark:text-white">{order.title || 'Custom Project'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Glass Dimensions</p>
                <p className="text-2xl font-mono font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl w-fit">
                  {order.width}" × {order.height}"
                </p>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest">Resource Allocation</p>
              <div className="space-y-4">
                {orderMaterials.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] transition-all hover:translate-x-1">
                    <div>
                      {/* FIX: materials!order_materials_material_id_fkey nests name here */}
                      <p className="font-black dark:text-white text-base tracking-tight">{item.materials?.name || 'Standard Frame Material'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Quantity: {parseFloat(item.quantity).toFixed(2)} units</p>
                    </div>
                    <p className="font-black text-blue-500 text-lg">{formatLKR(item.cost_at_time * item.quantity)}</p>
                  </div>
                ))}
                {orderMaterials.length === 0 && (
                  <p className="text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl text-center">
                    Inventory data pending for this project.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800 transition-colors">
            <h3 className="text-xs font-black uppercase text-gray-400 mb-4 flex items-center gap-3 tracking-widest">
              <FileText size={20} className="text-blue-500" /> Production Log
            </h3>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl">
              <p className="text-sm dark:text-gray-300 font-medium italic leading-relaxed">
                "{order.customer_notes || "No specific client instructions provided."}"
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & People */}
        <div className="space-y-8">
          <div className="bg-blue-600 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
            <TrendingUp className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform" size={160} />
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Investment Total</p>
            <h2 className="text-5xl font-black mt-2 tracking-tighter">
              {formatLKR(order.total_amount || order.cost || 0)}
            </h2>
            <div className="mt-6 pt-6 border-t border-white/20">
               <p className="text-[10px] font-bold uppercase opacity-60 italic">Official Digital Invoice</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-xl border dark:border-gray-800 transition-colors">
            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 flex items-center gap-3 tracking-widest">
              <Clock size={16} className="text-blue-500" /> Logistics
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-gray-400 font-black uppercase">Order Date</span>
                <span className="text-sm font-bold dark:text-white">{new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-gray-400 font-black uppercase">Service Tier</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black dark:text-white uppercase tracking-tighter">
                  {order.priority} PRIORITY
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-xl border dark:border-gray-800 transition-colors">
            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 flex items-center gap-3 tracking-widest">
              <Users size={16} className="text-blue-500" /> Project Personnel
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-sm uppercase">
                  {order.customer?.email?.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">Performed By (Owner)</p>
                  <p className="text-xs font-bold dark:text-white truncate max-w-[150px]">{order.customer?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm uppercase ${order.employer ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  {order.employer?.email?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">Technician</p>
                  <p className="text-xs font-bold dark:text-white">
                    {order.employer?.email || 'Awaiting Selection'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}