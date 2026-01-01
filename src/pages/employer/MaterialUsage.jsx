// src/pages/employer/MaterialUsage.jsx
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
      
      // 1. Obtener Job Cards del trabajador (solo las activas)
      const { data: jobCardsData } = await supabase
        .from('job_cards')
        .select(`id, order:orders(order_number, title)`)
        .eq('employer_id', user.id)
        .in('status', ['pending', 'in_progress'])

      // 2. Obtener lista de materiales y su stock actual
      const { data: materialsData } = await supabase
        .from('materials')
        .select('*')
        .order('name')

      // 3. Obtener logs recientes del trabajador
      const { data: logs } = await supabase
        .from('material_usage')
        .select(`*, material:materials(name, unit), order:orders(order_number)`)
        .order('created_at', { ascending: false })
        .limit(10)

      setJobCards(jobCardsData || [])
      setMaterials(materialsData || [])
      setUsageRecords(logs || [])
    } catch (err) {
      setError("Error de carga: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const qty = parseFloat(formData.quantity_used)
      const selectedMaterial = materials.find(m => m.id === formData.material_id)

      // VALIDACIÓN CRÍTICA: ¿Hay suficiente stock?
      if (!selectedMaterial) throw new Error("Selecciona un material válido.")
      if (qty <= 0) throw new Error("La cantidad debe ser mayor a 0.")
      if (selectedMaterial.stock_quantity < qty) {
        throw new Error(`Stock insuficiente. Solo quedan ${selectedMaterial.stock_quantity} ${selectedMaterial.unit}`)
      }

      // 1. Registrar el uso
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

      // 2. Descontar del inventario (Actualización de stock)
      const { error: stockError } = await supabase
        .from('materials')
        .update({ stock_quantity: selectedMaterial.stock_quantity - qty })
        .eq('id', formData.material_id)

      if (stockError) throw stockError

      setSuccess(`¡Registrado! Se han descontado ${qty} ${selectedMaterial.unit} de ${selectedMaterial.name}.`)
      setFormData({ ...formData, quantity_used: '', notes: '' })
      fetchData() // Refrescar stock y logs

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-6 font-bold uppercase text-xs">
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6 text-orange-600">
              <Wrench size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Consumo de Material</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Tarea / Orden</label>
                <select 
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.job_card_id}
                  onChange={(e) => setFormData({...formData, job_card_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar Trabajo...</option>
                  {jobCards.map(jc => (
                    <option key={jc.id} value={jc.id}>
                      {jc.order?.order_number} - {jc.order?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Material en Stock</label>
                <select 
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.material_id}
                  onChange={(e) => setFormData({...formData, material_id: e.target.value})}
                  required
                >
                  <option value="">¿Qué material usaste?</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id} disabled={m.stock_quantity <= 0}>
                      {m.name} ({m.stock_quantity} {m.unit} disponibles)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Cantidad Utilizada</label>
                <input 
                  type="number" step="0.01"
                  placeholder="Ej: 5.5"
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.quantity_used}
                  onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 dark:shadow-none disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'CONFIRMAR CONSUMO'}
              </button>
            </form>

            {success && <Alert type="success" message={success} className="mt-4" />}
            {error && <Alert type="error" message={error} className="mt-4" />}
          </div>

          {/* Historial rápido */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6 text-gray-400">
              <History size={18} />
              <h3 className="font-black uppercase text-sm tracking-widest">Últimos Registros</h3>
            </div>
            <div className="space-y-3">
              {usageRecords.map(r => (
                <div key={r.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs dark:text-white">{r.material?.name}</span>
                    <span className="text-orange-600 font-black text-xs">-{r.quantity_used} {r.material?.unit}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase">Orden: {r.order?.order_number}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}