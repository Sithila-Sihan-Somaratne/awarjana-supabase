// src/pages/orders/PublicOrderTracker.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, Package, Clock, CheckCircle, 
  AlertCircle, RefreshCw, ArrowLeft, ShieldCheck
} from 'lucide-react';
import Alert from '../../components/common/Alert';

export default function PublicOrderTracker() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState(orderNumber || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async (number) => {
    if (!number) return;
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(email, full_name),
          employer:users!orders_assigned_employer_id_fkey(full_name)
        `)
        .eq('order_number', number.toUpperCase().trim())
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Order not found. Please check the number.");
      
      setOrder(data);
    } catch (err) {
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber);
    }
  }, [orderNumber]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrder(searchQuery);
  };

  const getStatusStep = (status) => {
    const steps = ['pending', 'assigned', 'in_progress', 'review', 'completed'];
    return steps.indexOf(status);
  };

  const currentStep = order ? getStatusStep(order.status) : -1;

  // Determine visibility level
  const isOwner = user && order && user.id === order.customer_id;
  const isAdmin = userRole === 'admin';
  const showPrivateDetails = isOwner || isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black dark:text-white uppercase tracking-tighter mb-4">
            Track Your Order
          </h1>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.3em]">
            Real-time Production Monitoring
          </p>
        </header>

        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
            <input 
              type="text"
              placeholder="ENTER ORDER NUMBER (e.g. ORD-XXXXXX)"
              className="w-full pl-16 pr-32 py-6 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-[2.5rem] text-xl font-black dark:text-white outline-none focus:border-indigo-500 transition-all shadow-xl shadow-indigo-500/5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : 'TRACK'}
            </button>
          </div>
        </form>

        {error && <Alert type="error" message={error} className="mb-8" />}

        {order && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Timeline */}
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border dark:border-gray-800 shadow-sm">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                  <h2 className="text-3xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                    {order.status.replace('_', ' ')}
                    {order.status === 'completed' && <CheckCircle className="text-green-500" size={28} />}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                  <p className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400">{order.order_number}</p>
                </div>
              </div>

              <div className="relative flex justify-between items-center px-4">
                {/* Progress Line */}
                <div className="absolute left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 -z-0 mx-10"></div>
                <div 
                  className="absolute left-0 h-1 bg-indigo-500 transition-all duration-1000 -z-0 mx-10"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>

                {['Pending', 'Assigned', 'Production', 'Review', 'Ready'].map((label, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                      i <= currentStep 
                        ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/50 text-white' 
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300'
                    } transition-all duration-500`}>
                      {i < currentStep ? <CheckCircle size={18} /> : (i === currentStep ? <RefreshCw size={18} className="animate-spin-slow" /> : i + 1)}
                    </div>
                    <p className={`mt-3 text-[10px] font-black uppercase tracking-widest ${
                      i <= currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                    }`}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Public Info */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-black mb-6 uppercase tracking-tight dark:text-white flex items-center gap-2">
                  <Package size={20} className="text-indigo-500" /> Production Info
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between border-b dark:border-gray-800 pb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase">Type</span>
                    <span className="text-xs font-black dark:text-white uppercase">{order.production_type || 'Standard Framing'}</span>
                  </div>
                  <div className="flex justify-between border-b dark:border-gray-800 pb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase">Size</span>
                    <span className="text-xs font-black dark:text-white uppercase">{order.width}" × {order.height}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">Assigned To</span>
                    <span className="text-xs font-black dark:text-white uppercase">{order.employer?.full_name || 'Awaiting Staff'}</span>
                  </div>
                </div>
              </div>

              {/* Private Info (Only for Owner/Admin) */}
              {showPrivateDetails ? (
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/20 text-white">
                  <h3 className="text-lg font-black mb-6 uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck size={20} /> Customer Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-indigo-400/30 pb-3">
                      <span className="text-xs font-bold text-indigo-200 uppercase">Customer</span>
                      <span className="text-xs font-black uppercase">{order.customer?.full_name || 'Guest'}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-400/30 pb-3">
                      <span className="text-xs font-bold text-indigo-200 uppercase">Total Cost</span>
                      <span className="text-xs font-black uppercase">Rs. {order.cost || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-indigo-200 uppercase">Notes</span>
                      <span className="text-xs font-bold italic truncate max-w-[150px]">"{order.customer_notes || 'None'}"</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="text-gray-300 mb-3" size={32} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Private Details Hidden</p>
                  <Link to="/login" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">
                    Log in to view full details
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {!order && !loading && !error && (
          <div className="text-center py-20">
            <Package className="mx-auto text-gray-200 mb-4" size={64} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Enter your order number above to start tracking</p>
          </div>
        )}
      </div>
    </div>
  );
}
