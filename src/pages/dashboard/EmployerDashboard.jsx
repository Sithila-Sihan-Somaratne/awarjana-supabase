import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Hammer, ClipboardList, Loader, AlertTriangle, Package } from 'lucide-react';
import OrderCard from '../../components/common/OrderCard';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobCards = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      // Fetching job cards + the joined order details
      const { data, error } = await supabase
        .from('job_cards')
        .select(`
          id,
          status,
          order_id,
          assigned_at,
          order:orders (
            id,
            order_number,
            title,
            priority,
            dimensions,
            material,
            status
          )
        `)
        .eq('employer_id', user.id)
        .order('assigned_at', { ascending: false });
        
      if (error) throw error;
      setJobCards(data || []);
    } catch (err) {
      console.error("Employer Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchJobCards(); 
  }, [user?.id]);

  const handleStatusUpdate = async (jobCardId, newStatus) => {
    try {
      // We don't need to send updated_at because the SQL trigger handles it
      const { error } = await supabase
        .from('job_cards')
        .update({ status: newStatus })
        .eq('id', jobCardId);

      if (error) throw error;
      
      // Refresh the list to reflect status change
      fetchJobCards(); 
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader className="animate-spin text-orange-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 bg-orange-600 rounded-2xl text-white shadow-xl">
            <Hammer size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Workshop Floor</h1>
            <p className="text-gray-500 font-bold uppercase text-xs">Technician Dashboard • 2026 Ready</p>
          </div>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobCards.length > 0 ? (
            jobCards.map(jc => (
              <div key={jc.id} className="relative">
                <OrderCard 
                  order={jc.order} 
                  jobCardId={jc.id}
                  status={jc.status}
                  userRole="employer"
                  onAction={handleStatusUpdate}
                  onView={(order) => navigate(`/orders/${order.id}`)}
                />
                
                {/* Secondary Actions */}
                <div className="mt-4 flex gap-2 px-2">
                   <button 
                    onClick={() => navigate(`/employer/material-usage?jobCard=${jc.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl text-xs font-black dark:text-white hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Package size={14} /> LOG MATERIALS
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white dark:bg-gray-800 p-20 rounded-[3rem] text-center border dark:border-gray-700">
              <AlertTriangle className="mx-auto text-orange-400 mb-4" size={48} />
              <p className="text-gray-500 font-bold">No tasks currently assigned to you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}