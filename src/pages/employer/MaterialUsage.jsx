// src/pages/employer/MaterialUsage.jsx
// FIXED VERSION - English translation, correct table name, and order-specific materials
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Wrench, Loader, Package, AlertCircle, History
} from 'lucide-react'
import Alert from '../../components/common/Alert'

export default function MaterialUsage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [jobCards, setJobCards] = useState([])
  const [materials, setMaterials] = useState([])
  const [usageRecords, setUsageRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [formData, setFormData] = useState({
    job_card_id: searchParams.get('jobCard') || '',
    material_id: '',
    quantity_used: '',
    notes: ''
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 1. Get active Job Cards for the worker
      const { data: jobCardsData } = await supabase
        .from('job_cards')
        .select(`
          id, 
          order:orders(
            id,
            order_number, 
            order_materials(
              material_id,
              materials(id, name, unit, stock_quantity)
            )
          )
        `)
        .eq('employer_id', user.id)
        .in('status', ['assigned', 'in_progress'])

      // 2. Get all materials (fallback if order-specific materials are missing)
      const { data: materialsData } = await supabase
        .from('materials')
        .select('*')
        .order('name')

      // 3. Get recent logs for the worker
      const { data: logs } = await supabase
        .from('material_usage')
        .select(`*, material:materials(name, unit), job_card:job_cards(order:orders(order_number))`)
        .eq('recorded_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setJobCards(jobCardsData || [])
      setMaterials(materialsData || [])
      setUsageRecords(logs || [])
    } catch (err) {
      setError("Load Error: " + err.message)
    } finally {
      setLoading(false)
    }
  };

  // Filter materials based on selected job card
  const getAvailableMaterials = () => {
    if (!formData.job_card_id) return materials;
    
    const selectedCard = jobCards.find(jc => jc.id.toString() === formData.job_card_id.toString());
    if (selectedCard?.order?.order_materials?.length > 0) {
      return selectedCard.order.order_materials.map(om => om.materials);
    }
    
    return materials;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const qty = parseFloat(formData.quantity_used)
      const availableMaterials = getAvailableMaterials();
      const selectedMaterial = availableMaterials.find(m => m.id.toString() === formData.material_id.toString())

      // CRITICAL VALIDATION
      if (!selectedMaterial) throw new Error("Please select a valid material.")
      if (qty <= 0) throw new Error("Quantity must be greater than 0.")
      if (selectedMaterial.stock_quantity < qty) {
        throw new Error(`Insufficient stock. Only ${selectedMaterial.stock_quantity} ${selectedMaterial.unit} remaining.`)
      }

      // 1. Record the usage
      const { error: usageError } = await supabase
        .from('material_usage')
        .insert([{
          job_card_id: formData.job_card_id,
          material_id: formData.material_id,
          quantity_used: qty,
          notes: formData.notes,
          recorded_by: user.id
        }])

      if (usageError) throw usageError

      // 2. Update inventory (Stock deduction)
      const { error: stockError } = await supabase
        .from('materials')
        .update({ stock_quantity: selectedMaterial.stock_quantity - qty })
        .eq('id', formData.material_id)

      if (stockError) throw stockError

      setSuccess(`Logged! Deducted ${qty} ${selectedMaterial.unit} of ${selectedMaterial.name}.`)
      setFormData({ ...formData, material_id: '', quantity_used: '', notes: '' })
      fetchData() // Refresh stock and logs

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = getAvailableMaterials();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-6 font-bold uppercase text-xs">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6 text-orange-600">
              <Wrench size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Material Usage</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Task / Order</label>
                <select 
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.job_card_id}
                  onChange={(e) => setFormData({...formData, job_card_id: e.target.value})}
                  required
                >
                  <option value="">Select Job...</option>
                  {jobCards.map(jc => (
                    <option key={jc.id} value={jc.id}>
                      {jc.order?.order_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Material Used</label>
                <select 
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.material_id}
                  onChange={(e) => setFormData({...formData, material_id: e.target.value})}
                  required
                >
                  <option value="">Which material did you use?</option>
                  {availableMaterials.map(m => (
                    <option key={m.id} value={m.id} disabled={m.stock_quantity <= 0}>
                      {m.name} ({m.stock_quantity} {m.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Quantity Used</label>
                <input 
                  type="number" step="0.01"
                  placeholder="e.g. 5.5"
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.quantity_used}
                  onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Notes (Optional)</label>
                <textarea 
                  placeholder="Any specific details about usage..."
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 dark:shadow-none disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'CONFIRM USAGE'}
              </button>
            </form>

            {success && <Alert type="success" message={success} className="mt-4" />}
            {error && <Alert type="error" message={error} className="mt-4" />}
          </div>

          {/* Quick History */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6 text-gray-400">
              <History size={18} />
              <h3 className="font-black uppercase text-sm tracking-widest">Recent Logs</h3>
            </div>
            <div className="space-y-3">
              {usageRecords.length > 0 ? (
                usageRecords.map(r => (
                  <div key={r.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs dark:text-white">{r.material?.name}</span>
                      <span className="text-orange-600 font-black text-xs">-{r.quantity_used} {r.material?.unit}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Order: {r.job_card?.order?.order_number}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 text-xs font-bold py-10">No recent logs.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
