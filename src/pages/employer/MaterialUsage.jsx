import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Wrench, Loader, Package
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
    job_card_id: '',
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
      
      // 1. Fetch employer's job cards - Broader status filter to ensure visibility
      const { data: jobCardsData, error: jobError } = await supabase
        .from('job_cards')
        .select(`
          id,
          order_id,
          status,
          order:orders(id, order_number, title)
        `)
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })

      if (jobError) throw jobError

      // 2. Fetch materials for these orders
      const orderIds = jobCardsData?.map(j => j.order_id) || []
      let materialsData = []
      
      if (orderIds.length > 0) {
        const { data, error: matError } = await supabase
          .from('order_materials')
          .select(`*`)
          .in('order_id', orderIds)
          // We removed the 'allocated' requirement temporarily so you can see all materials
          
        if (matError) throw matError
        materialsData = data
      }

      // 3. Fetch recent history
      const { data: usageData } = await supabase
        .from('material_usage')
        .select(`
          id,
          quantity_used,
          order:orders(order_number)
        `)
        .eq('employer_id', user.id)
        .limit(10)

      setJobCards(jobCardsData || [])
      setMaterials(materialsData || [])
      setUsageRecords(usageData || [])

      // Auto-select from URL
      const preSelectedJob = searchParams.get('jobCard')
      if (preSelectedJob) {
        setFormData(prev => ({ ...prev, job_card_id: preSelectedJob }))
      }

    } catch (err) {
      console.error('Fetch Error:', err)
      setError("Data Visibility Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // FIXED FILTER: Ensuring we match string IDs to object IDs correctly
  const selectedJob = jobCards.find(j => String(j.id) === String(formData.job_card_id))
  const availableMaterials = materials.filter(m => 
    String(m.order_id) === String(selectedJob?.order_id)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.job_card_id || !formData.material_id || !formData.quantity_used) {
      setError('Missing required fields')
      return
    }

    try {
      setLoading(true)
      const material = materials.find(m => String(m.id) === String(formData.material_id))

      const { error: usageError } = await supabase
        .from('material_usage')
        .insert({
          job_card_id: formData.job_card_id,
          material_id: material.id, 
          order_id: material.order_id,
          employer_id: user.id,
          quantity_used: parseFloat(formData.quantity_used),
          notes: formData.notes.trim() || null
        })

      if (usageError) throw usageError

      // Update the status in the order_materials table
      await supabase
        .from('order_materials')
        .update({ status: 'used', actual_used_quantity: parseFloat(formData.quantity_used) })
        .eq('id', material.id)

      setSuccess('Material Logged!')
      setFormData({ job_card_id: '', material_id: '', quantity_used: '', notes: '' })
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && jobCards.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <Loader className="animate-spin text-orange-600" size={48} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
              <h2 className="text-2xl font-black dark:text-white mb-6 flex items-center gap-2">
                <Wrench className="text-orange-600" /> Record Usage
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Job Card Dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Select Assigned Task</label>
                  <select 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white border dark:border-gray-700 rounded-2xl"
                    value={formData.job_card_id}
                    onChange={(e) => setFormData({...formData, job_card_id: e.target.value, material_id: ''})}
                  >
                    <option value="">Choose a job...</option>
                    {jobCards.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.order?.order_number} - {j.order?.title} ({j.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Material Dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Allocated Material</label>
                  <select 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white border dark:border-gray-700 rounded-2xl disabled:opacity-30"
                    disabled={!formData.job_card_id}
                    value={formData.material_id}
                    onChange={(e) => setFormData({...formData, material_id: e.target.value})}
                  >
                    <option value="">Select item to log...</option>
                    {availableMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Need: {m.required_quantity})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number" step="0.01" placeholder="Quantity"
                    className="p-4 bg-gray-50 dark:bg-gray-900 dark:text-white border dark:border-gray-700 rounded-2xl"
                    value={formData.quantity_used}
                    onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                  />
                  <input 
                    type="text" placeholder="Notes (Optional)"
                    className="p-4 bg-gray-50 dark:bg-gray-900 dark:text-white border dark:border-gray-700 rounded-2xl"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Confirm Usage'}
                </button>
              </form>
              
              {success && <Alert type="success" message={success} className="mt-4" />}
              {error && <Alert type="error" message={error} className="mt-4" />}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border dark:border-gray-700 h-fit">
            <h3 className="font-black dark:text-white mb-4">Recent Logs</h3>
            {usageRecords.map(r => (
              <div key={r.id} className="text-xs border-b dark:border-gray-700 py-3 text-gray-500">
                Order <span className="text-orange-600">#{r.order?.order_number}</span>: {r.quantity_used} units
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}