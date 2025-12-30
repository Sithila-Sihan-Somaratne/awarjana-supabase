import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Hammer, ClipboardList, CheckCircle2, 
  Loader, AlertTriangle, Briefcase, 
  TrendingUp, Calendar 
} from 'lucide-react';
import OrderCard from '../../components/common/OrderCard';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('assigned_worker_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setMyTasks(data || []);
    } catch (err) {
      console.error("Worker Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to move status forward
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchTasks(); // Reload the list
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTasks();
  }, [user]);

  const getFilteredTasks = () => {
    if (filter === 'pending') return myTasks.filter(t => t.status !== 'completed');
    if (filter === 'completed') return myTasks.filter(t => t.status === 'completed');
    return myTasks;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-orange-600 rounded-[1.5rem] text-white shadow-2xl">
              <Hammer size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black dark:text-white tracking-tight">Workshop Floor</h1>
              <p className="text-gray-500 font-bold dark:text-gray-400 uppercase text-xs">Production Dashboard</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border dark:border-gray-700 flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>
              All Jobs
            </button>
            <button onClick={() => setFilter('pending')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'pending' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>
              Active Tasks
            </button>
          </div>
        </div>
        
        {/* Productivity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 text-white shadow-2xl">
            <p className="text-blue-100 font-bold uppercase tracking-[0.2em] text-xs mb-2">My Active Queue</p>
            <p className="text-7xl font-black mb-4">{myTasks.filter(t => t.status !== 'completed').length}</p>
            <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-1.5 rounded-full">
              <Calendar size={14} /> <span>Status: Live</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-800 rounded-[2.5rem] p-10 text-white shadow-2xl">
            <p className="text-green-100 font-bold uppercase tracking-[0.2em] text-xs mb-2">Total Finished</p>
            <p className="text-7xl font-black mb-4">{myTasks.filter(t => t.status === 'completed').length}</p>
            <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-1.5 rounded-full">
              <TrendingUp size={14} /> <span>Excellence Rating: 100%</span>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 mb-4">
            <ClipboardList className="text-orange-600" size={24} />
            <h3 className="text-2xl font-black dark:text-white">Assigned Job Sheets</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getFilteredTasks().map(task => (
              <OrderCard 
                key={task.id} 
                order={task} 
                userRole="worker" 
                onAction={handleStatusUpdate} // Passing the update function
              />
            ))}
          </div>

          {getFilteredTasks().length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-24 rounded-[3rem] text-center shadow-sm border dark:border-gray-700">
              <AlertTriangle className="mx-auto text-orange-400 mb-6" size={64} />
              <h4 className="text-2xl font-black dark:text-white">Queue Empty</h4>
              <p className="text-gray-500">No workshop tasks assigned to your queue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}