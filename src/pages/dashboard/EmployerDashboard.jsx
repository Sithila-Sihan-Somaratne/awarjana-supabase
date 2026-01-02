// src/pages/employer/EmployerDashboard.jsx
// FIXED VERSION - Removes non-existent columns and fixes query
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Hammer, Loader, Package, CheckCircle, Send 
} from 'lucide-react';
import OrderCard from '../../components/common/OrderCard';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobCards = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      
      // FIX: Removed non-existent columns: priority, dimensions, material
      // In your schema, materials are in order_materials table
      const { data, error: fetchError } = await supabase
        .from('job_cards')
        .select(`
          id,
          status,
          order_id,
          created_at,
          order:orders (
            id,
            order_number,
            status,
            cost,
            width,
            height,
            customer:users!orders_customer_id_fkey(full_name, email),
            employer:users!orders_assigned_employer_id_fkey(full_name, email)
          )
        `)
        .eq('employer_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });
        
      if (fetchError) throw fetchError;
      setJobCards(data || []);
    } catch (err) {
      console.error("Employer Load Error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchJobCards(); 
  }, [user?.id]);

  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      const { data: updatedJC, error: jcError } = await supabase
        .from('job_cards')
        .update({ status: newStatus })
        .eq('id', jobId)
        .select('order_id')
        .single();

      if (jcError) throw jcError;

      let orderStatus = 'in_progress';
      if (newStatus === 'completed') orderStatus = 'review';

      await supabase
        .from('orders')
        .update({ status: orderStatus })
        .eq('id', updatedJC.order_id);

      fetchJobCards();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-black">
      <Loader className="animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <Hammer className="text-indigo-600" size={32} />
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Production</h1>
          </div>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Active Workforce</p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-200 text-red-700 rounded-2xl text-xs font-bold uppercase tracking-widest">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {jobCards.length > 0 ? (
            jobCards.map(jc => (
              <div key={jc.id}>
                <OrderCard 
                  order={jc.order} 
                  jobCardId={jc.id}
                  status={jc.status}
                  userRole="employer"
                  onAction={handleStatusUpdate}
                  onView={(order) => navigate(`/orders/${order.id}`)}
                />
                <div className="mt-4 flex gap-3 px-2">
                   <button 
                    onClick={() => navigate(`/employer/material-usage?jobCard=${jc.id}`)}
                    className="flex-1 py-4 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-[10px] font-black dark:text-white hover:border-orange-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Package size={14} /> LOG MATERIALS
                  </button>
                  <button 
                    onClick={() => navigate(`/employer/submit-draft/${jc.order_id}`)}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> SUBMIT PROOF
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase text-xs">No active tasks assigned.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
