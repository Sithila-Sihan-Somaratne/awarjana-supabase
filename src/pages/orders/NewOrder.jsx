import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Ruler, Layers, FileText, 
  Loader, Calendar, Clock, TrendingUp, 
  PackageCheck, CheckCircle2, AlertTriangle, ShieldCheck,
  Zap
} from 'lucide-react';
import Alert from '../../components/common/Alert';
import { calculateOrderCost, formatLKR, getDeadlineOptions, calculateWithDeadline } from '../../lib/costCalculator';

export default function NewOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [materials, setMaterials] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    materialId: '', 
    width: '',
    height: '',
    deadlineType: 'standard',
    customDate: '',
    priority: 'medium',
    notes: ''
  });

  const [pricing, setPricing] = useState({ total: 0, breakdown: null });
  const deadlineOptions = getDeadlineOptions();

  // Load Materials
  useEffect(() => {
    async function fetchInventory() {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        setError("Failed to load materials");
      } else {
        setMaterials(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, materialId: data[0].id.toString() }));
      }
      setFetching(false);
    }
    fetchInventory();
  }, []);

  // Pricing Calculation
  useEffect(() => {
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    const selectedMat = materials.find(m => m.id.toString() === formData.materialId);

    if (w > 0 && h > 0 && selectedMat) {
      const baseCalc = calculateOrderCost(w, h, selectedMat.cost);
      const finalCalc = calculateWithDeadline(baseCalc.total, formData.deadlineType);
      setPricing({ total: finalCalc.totalCost, breakdown: baseCalc.breakdown });
    } else {
      setPricing({ total: 0, breakdown: null });
    }
  }, [formData.width, formData.height, formData.deadlineType, formData.materialId, materials]);

  const selectedMaterial = materials.find(m => m.id.toString() === formData.materialId);

  // OPTIMIZED SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pricing.total <= 0) return setError("Please enter valid dimensions.");
    
    const wNum = parseFloat(formData.width);
    const hNum = parseFloat(formData.height);
    const perimeter = (wNum + hNum) * 2;
    const usageAmount = perimeter / 108; 

    if (selectedMaterial && selectedMaterial.stock_quantity < usageAmount) {
      return setError(`Stock Alert! Low Inventory.`);
    }
    
    setLoading(true);

    try {
      const orderPayload = {
        title: formData.title,
        material: selectedMaterial?.name || 'Standard',
        dimensions: `${wNum}x${hNum}`,
        width: wNum, 
        height: hNum,
        priority: formData.priority,
        deadline_date: formData.deadlineType === 'custom' ? formData.customDate : null,
        notes: formData.notes,
        total_amount: pricing.total,
        customer_id: user.id,
        order_number: `ORD-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
        status: 'pending' 
      };

      // ⚡️ PERFORMANCE FIX:
      // 1. Removed .select() to avoid fetching data back.
      // 2. Used Promise.all to run Insert and Stock Update simultaneously.
      const [orderResponse, stockResponse] = await Promise.all([
        supabase.from('orders').insert([orderPayload]),
        supabase.from('materials')
          .update({ stock_quantity: selectedMaterial.stock_quantity - usageAmount })
          .eq('id', formData.materialId)
      ]);

      if (orderResponse.error) throw orderResponse.error;
      if (stockResponse.error) console.error("Stock update warning:", stockResponse.error);

      setIsSuccess(true);
      setTimeout(() => navigate('/dashboard/customer'), 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 p-6">
        <div className="text-center space-y-6">
          <CheckCircle2 size={80} className="text-white mx-auto animate-bounce" />
          <h1 className="text-4xl font-black text-white uppercase italic">Order Logged!</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 mb-6 hover:text-blue-600 font-bold transition-all">
          <ArrowLeft size={18}/> Back to Hub
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border dark:border-gray-700 overflow-hidden">
              <div className="bg-blue-600 p-8 text-white">
                <h1 className="text-2xl font-black uppercase tracking-tight">Order Configurator</h1>
                <p className="opacity-70 text-xs italic">Syncing with Live Inventory</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {error && <Alert type="error" message={error} />}

                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Project Name</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-4 text-gray-400" size={18}/>
                    <input required placeholder="E.g. Living Room Portrait" 
                      className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Width (In)</label>
                    <div className="relative">
                      <Ruler className="absolute left-4 top-4 text-gray-400" size={18}/>
                      <input type="number" step="0.1" required placeholder="0.0" 
                        className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                        onChange={e => setFormData({...formData, width: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Height (In)</label>
                    <div className="relative">
                      <Ruler className="absolute left-4 top-4 text-gray-400" size={18}/>
                      <input type="number" step="0.1" required placeholder="0.0" 
                        className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                        onChange={e => setFormData({...formData, height: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Priority Tabs */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" /> Workload Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2 p-1 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                    {['minor', 'medium', 'high', 'urgent'].map((p) => (
                      <button key={p} type="button" onClick={() => setFormData({ ...formData, priority: p })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                          formData.priority === p 
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm border border-blue-100 dark:border-blue-900' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>

                {/* Material Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 flex justify-between">
                    <span>Material Choice</span>
                    {selectedMaterial && (
                      <span className={`font-bold ${selectedMaterial.stock_quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {selectedMaterial.stock_quantity.toFixed(1)} units left
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-4 text-gray-400" size={18}/>
                    <select className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.materialId} onChange={e => setFormData({...formData, materialId: e.target.value})}>
                      {fetching ? <option>Loading materials...</option> : materials.map(m => (
                        <option key={m.id} value={m.id} disabled={m.stock_quantity <= 0}>
                          {m.name} - {formatLKR(m.cost)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Production Speed */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Clock size={14}/> Production Speed</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {deadlineOptions.map(opt => (
                      <button key={opt.id} type="button" onClick={() => setFormData({...formData, deadlineType: opt.id})}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.deadlineType === opt.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40' : 'border-gray-50 dark:border-gray-700'}`}>
                        <p className="font-black text-xs dark:text-white">{opt.label}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{opt.multiplier}x price</p>
                      </button>
                    ))}
                  </div>
                  
                  {formData.deadlineType === 'custom' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black uppercase text-blue-600 ml-1">Target Completion Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-4 text-blue-600" size={18}/>
                        <input 
                          type="date" 
                          required 
                          min={new Date().toISOString().split('T')[0]} 
                          value={formData.customDate}
                          className="w-full pl-12 p-4 bg-blue-50 dark:bg-gray-700 rounded-2xl dark:text-white font-bold focus:ring-2 focus:ring-blue-600 outline-none color-scheme-dark"
                          onChange={e => setFormData({...formData, customDate: e.target.value})} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading || pricing.total === 0 || selectedMaterial?.stock_quantity <= 0} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl disabled:opacity-50 transform active:scale-95 transition-all">
                  {loading ? <Loader className="animate-spin mx-auto" /> : 'SUBMIT ORDER'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 border dark:border-gray-700 shadow-xl sticky top-10">
              <h3 className="text-sm font-black dark:text-white mb-6 flex items-center gap-2 uppercase">
                <TrendingUp className="text-green-500" size={16} /> Live Quote
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400">Glass & MDF</span>
                  <span className="dark:text-white">{pricing.breakdown ? formatLKR(pricing.breakdown.glass + pricing.breakdown.mdf) : 'Rs. 0.00'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400">Labor & Frame</span>
                  <span className="dark:text-white">{pricing.breakdown ? formatLKR(pricing.breakdown.labor + pricing.breakdown.frame) : 'Rs. 0.00'}</span>
                </div>
                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Valuation</p>
                  <p className="text-3xl font-black text-blue-600">{formatLKR(pricing.total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}