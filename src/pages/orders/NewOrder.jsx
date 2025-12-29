import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
// Ensure these icons are imported correctly as components
import { 
  ArrowLeft, Save, Package, Ruler, Info, Layout, Box, Clock 
} from 'lucide-react'; 
import Alert from '../../components/common/Alert';

export default function NewOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    width: '',
    height: '',
    quantity: 1
  });

  const [totalCost, setTotalCost] = useState(0);

  // Logic to calculate price in Rs.
  useEffect(() => {
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    const qty = parseInt(formData.quantity) || 1;

    // Example calculation for a premium system
    const area = (w * h);
    const ratePerSqCm = 2.5; // Premium rate
    const baseFee = 1500;    // Base workshop fee in Rs.
    
    const calc = (area * ratePerSqCm) + baseFee;
    setTotalCost((calc * qty).toFixed(2));
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('orders')
        .insert([{
          customer_id: user.id,
          title: formData.title,
          width: formData.width,
          height: formData.height,
          total_amount: totalCost,
          status: 'pending'
        }]);

      if (insertError) throw insertError;
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 overflow-hidden">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">New Framing Project</h1>
              <p className="opacity-80 text-sm">Fill in the dimensions for an instant quote</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider opacity-80">Estimated Total</p>
              <p className="text-3xl font-black">Rs. {totalCost}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && <Alert type="error" message={error} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
                  <input 
                    required
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Wedding Portrait"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Width (cm)</label>
                    <input 
                      type="number" required
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={formData.width}
                      onChange={(e) => setFormData({...formData, width: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Height (cm)</label>
                    <input 
                      type="number" required
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Features */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold dark:text-white flex items-center gap-2">
                  <Info size={18} className="text-blue-500" /> Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between dark:text-gray-400">
                    <span>Base Labor:</span>
                    <span className="font-mono text-gray-900 dark:text-white">Rs. 1,500.00</span>
                  </div>
                  <div className="flex justify-between dark:text-gray-400">
                    <span>Material Cost:</span>
                    <span className="font-mono text-gray-900 dark:text-white">Rs. {(totalCost - 1500).toFixed(2)}</span>
                  </div>
                  <hr className="dark:border-gray-700" />
                  <div className="flex justify-between font-bold text-blue-600">
                    <span>Total (Rs):</span>
                    <span>{totalCost}</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
              {loading ? "Processing..." : "Place Order Now"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}