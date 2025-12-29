import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, ArrowLeft, Ruler, Layers, FileText, DollarSign } from 'lucide-react';
import Alert from '../../components/common/Alert';

export default function NewOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    material: 'Natural Teak',
    dimensions: '',
    notes: '',
    total_amount: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const orderNumber = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { error: insertError } = await supabase.from('orders').insert([{
      ...formData,
      customer_id: user.id,
      order_number: orderNumber,
      status: 'pending'
    }]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      navigate('/dashboard/customer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-8 hover:text-blue-600 transition-colors">
          <ArrowLeft size={20}/> Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border dark:border-gray-700 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <h1 className="text-2xl font-bold">New Custom Project</h1>
            <p className="opacity-80 text-sm">Fill in the details for your manual order</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && <Alert type="error" message={error} />}

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-gray-300 ml-1">Project Title</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 text-gray-400" size={18}/>
                <input required placeholder="e.g. Family Portrait 2024" className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold dark:text-gray-300 ml-1">Material Selection</label>
                <div className="relative">
                  <Layers className="absolute left-4 top-4 text-gray-400" size={18}/>
                  <select className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl dark:text-white appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={e => setFormData({...formData, material: e.target.value})}>
                    <option>Natural Teak</option>
                    <option>Modern Aluminum</option>
                    <option>Premium Gold Leaf</option>
                    <option>Matte Black Wood</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold dark:text-gray-300 ml-1">Dimensions (WxH)</label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-4 text-gray-400" size={18}/>
                  <input required placeholder="e.g. 24x36 inches" className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={e => setFormData({...formData, dimensions: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-gray-300 ml-1">Additional Notes</label>
              <textarea placeholder="Specify any special framing requests..." rows="3" className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-gray-300 ml-1">Budget Amount (EUR)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-4 text-gray-400" size={18}/>
                <input required type="number" placeholder="0.00" className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={e => setFormData({...formData, total_amount: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-lg transition-all active:scale-95">
              {loading ? <Loader className="animate-spin mx-auto" /> : 'CREATE PROJECT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}