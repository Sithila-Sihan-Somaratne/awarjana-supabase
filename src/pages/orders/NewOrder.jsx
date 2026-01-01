// src/pages/orders/NewOrder.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Ruler, Layers, FileText, 
  Loader, Calendar, Clock, TrendingUp, 
  CheckCircle2, Zap, Info
} from 'lucide-react';
import Alert from '../../components/common/Alert';
import { 
  calculateOrderCost, 
  formatLKR, 
  getDeadlineOptions, 
  getPriorityOptions, 
  calculateFinalTotal 
} from '../../lib/costCalculator';

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

  const [pricing, setPricing] = useState({ total: 0, breakdown: null, multiplier: 1, isDiscounted: false });
  const deadlineOptions = getDeadlineOptions();
  const priorityOptions = getPriorityOptions();

  // 1. Fetch Materials
  useEffect(() => {
    async function fetchInventory() {
      try {
        setFetching(true);
        const { data, error: fetchError } = await supabase
          .from('materials')
          .select('*')
          .order('name', { ascending: true });
        
        if (fetchError) throw fetchError;
        
        setMaterials(data || []);
        if (data?.length > 0) {
          setFormData(prev => ({ ...prev, materialId: data[0].id.toString() }));
        }
      } catch (err) {
        setError("Failed to sync inventory.");
      } finally {
        setFetching(false);
      }
    }
    fetchInventory();
  }, []);

  // 2. Pricing Engine
  useEffect(() => {
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    const selectedMat = materials.find(m => m.id.toString() === formData.materialId);

    if (w > 0 && h > 0 && selectedMat) {
      const baseCalc = calculateOrderCost(w, h, selectedMat.cost);
      const final = calculateFinalTotal(baseCalc.total, formData.deadlineType, formData.priority);
      
      setPricing({ 
        total: final.totalCost, 
        breakdown: baseCalc.breakdown,
        multiplier: final.multiplier,
        isDiscounted: final.isDiscounted
      });
    } else {
      setPricing({ total: 0, breakdown: null, multiplier: 1, isDiscounted: false });
    }
  }, [formData, materials]);

  const selectedMaterial = materials.find(m => m.id.toString() === formData.materialId);

  // 3. Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pricing.total <= 0) return setError("Please enter valid dimensions.");
    if (formData.deadlineType === 'custom' && !formData.customDate) {
        return setError("Please select a custom production date.");
    }
    
    const wNum = parseFloat(formData.width);
    const hNum = parseFloat(formData.height);
    const usageAmount = (wNum + hNum) * 2 / 108; 

    if (selectedMaterial && selectedMaterial.stock_quantity < usageAmount) {
      return setError(`Stock Alert! Only ${selectedMaterial.stock_quantity.toFixed(1)} units left.`);
    }

    setLoading(true);
    setError(null);

    try {
      let finalDeadline = formData.customDate;
      if (formData.deadlineType === 'standard') {
          const date = new Date();
          date.setDate(date.getDate() + 7);
          finalDeadline = date.toISOString();
      } else if (formData.deadlineType === 'express') {
          const date = new Date();
          date.setDate(date.getDate() + 2);
          finalDeadline = date.toISOString();
      }

      const orderNumber = `ORD-${Math.random().toString(36).toUpperCase().substring(2, 9)}`;
      
      // Step A: Create the Order (Using all columns expected by your Dashboards)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_id: user.id,
          status: 'pending',
          priority: formData.priority,
          cost: Math.round(pricing.total),
          total_amount: Math.round(pricing.total), // Fixed for Dashboards
          width: wNum,
          height: hNum,
          dimensions: `${wNum}x${hNum}`,           // Fixed for Dashboards
          title: formData.title || "Untitled",      // Fixed for Dashboards
          customer_notes: formData.notes,
          admin_notes: formData.title,
          deadline_date: finalDeadline,
          production_type: formData.deadlineType
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Step B: Link Materials (Usage is now numeric/decimal)
      const { error: junctionError } = await supabase
        .from('order_materials')
        .insert([{
          order_id: order.id,
          material_id: selectedMaterial.id,
          quantity: usageAmount,
          cost_at_time: selectedMaterial.cost
        }]);

      if (junctionError) throw junctionError;

      // Step C: Deduct Stock
      await supabase.from('materials')
        .update({ stock_quantity: selectedMaterial.stock_quantity - usageAmount })
        .eq('id', selectedMaterial.id);

      setIsSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-20 text-center font-black animate-pulse dark:text-white">SYNCING INVENTORY...</div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 p-6 font-black uppercase italic">
        <div className="text-center space-y-6 text-white">
          <CheckCircle2 size={80} className="mx-auto animate-bounce" />
          <h1 className="text-4xl tracking-tighter">Order Published!</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 font-black text-[10px] mb-8 hover:text-blue-600 transition-colors uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Hub
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <header>
              <h1 className="text-5xl font-black dark:text-white uppercase tracking-tighter">Order Configurator</h1>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.3em] mt-1">Custom Production v2026</p>
            </header>

            {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 md:p-10 border dark:border-gray-800 shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Name</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-5 text-gray-400" size={20}/>
                  <input 
                    type="text" required placeholder="Ex: Living Room Portrait"
                    className="w-full p-5 pl-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Ruler size={12}/> Width (In)
                  </label>
                  <input 
                    type="number" step="0.1" required placeholder="0.0"
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-mono font-bold dark:text-white"
                    value={formData.width}
                    onChange={e => setFormData({...formData, width: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Ruler size={12}/> Height (In)
                  </label>
                  <input 
                    type="number" step="0.1" required placeholder="0.0"
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-mono font-bold dark:text-white"
                    value={formData.height}
                    onChange={e => setFormData({...formData, height: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                  <Clock size={14}/> Production Speed
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {deadlineOptions.map(opt => (
                    <button 
                      key={opt.id} type="button" 
                      onClick={() => setFormData({...formData, deadlineType: opt.id})}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        formData.deadlineType === opt.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40' 
                          : 'border-gray-50 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <p className="font-black text-xs dark:text-white">{opt.label}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">{opt.multiplier}x priority</p>
                    </button>
                  ))}
                </div>

                {formData.deadlineType === 'custom' && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Select Custom Deadline</label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-4 top-4 text-blue-500" size={18}/>
                      <input 
                        type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-12 p-4 bg-blue-50 dark:bg-gray-900 rounded-2xl dark:text-white font-bold outline-none border-2 border-blue-200 dark:border-blue-900"
                        value={formData.customDate}
                        onChange={e => setFormData({...formData, customDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-500" /> Workload Priority
                </label>
                <div className="grid grid-cols-4 gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  {priorityOptions.map((opt) => (
                    <button key={opt.id} type="button" onClick={() => setFormData({ ...formData, priority: opt.id })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                        formData.priority === opt.id 
                          ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {opt.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Material Choice</label>
                  {selectedMaterial && (
                    <span className={`text-[10px] font-bold ${selectedMaterial.stock_quantity > 5 ? 'text-green-500' : 'text-red-500'}`}>
                       {selectedMaterial.stock_quantity.toFixed(1)} units in stock
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {materials.map(m => (
                    <button
                      key={m.id} type="button"
                      disabled={m.stock_quantity <= 0}
                      onClick={() => setFormData({...formData, materialId: m.id.toString()})}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        formData.materialId === m.id.toString() 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-100 dark:border-gray-800 opacity-60'
                      } ${m.stock_quantity <= 0 ? 'cursor-not-allowed grayscale' : ''}`}
                    >
                      <p className="font-black text-xs dark:text-white uppercase">{m.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">Rs. {m.cost} / linear in</p>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" disabled={loading || pricing.total === 0}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase"
              >
                {loading ? <Loader className="animate-spin" /> : <><CheckCircle2 /> Submit Order</>}
              </button>
            </form>
          </div>

          <div className="lg:col-start-3">
            <div className="sticky top-8 bg-white dark:bg-gray-900 rounded-[3rem] p-8 border dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-black dark:text-white uppercase mb-6 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20}/> Cost Breakdown
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400 uppercase">Moulding & Base</span>
                  <span className="dark:text-white">{formatLKR(pricing.breakdown?.frame || pricing.breakdown?.materials || 0)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400 uppercase">Labor & Supplies</span>
                  <span className="dark:text-white">{formatLKR(pricing.breakdown?.labor || 0)}</span>
                </div>
                
                <div className="my-4 border-t border-dashed dark:border-gray-700 pt-4">
                  <div className="flex justify-between text-[10px] font-black text-blue-500 uppercase">
                    <span>Priority Multiplier</span>
                    <span>x{pricing.multiplier}</span>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Grand Total (LKR)</p>
                  <p className={`text-4xl font-black ${pricing.isDiscounted ? 'text-green-500' : 'text-blue-600'}`}>
                    {formatLKR(pricing.total)}
                  </p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-blue-500 mt-1 shrink-0" />
                <p className="text-[9px] leading-relaxed text-gray-500 font-medium italic">
                  Estimates are based on live inventory costs and workload density.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}