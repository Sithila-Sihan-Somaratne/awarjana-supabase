// src/pages/worker/MaterialUsage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Package, Wrench, CheckCircle, AlertCircle,
  Save, XCircle, Calculator, Plus, Search
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
  }, [user, navigate])

  useEffect(() => {
    // If material_id is in URL params, pre-select it
    const materialId = searchParams.get('material')
    if (materialId && materials.length > 0) {
      const material = materials.find(m => m.id === materialId)
      if (material) {
        setFormData(prev => ({
          ...prev,
          material_id: materialId,
          job_card_id: material.job_card_id || ''
        }))
      }
    }
  }, [searchParams, materials])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch worker's active job cards
      const { data: jobCardsData } = await supabase
        .from('job_cards')
        .select(`
          *,
          order:orders(order_number, title)
        `)
        .eq('worker_id', user.id)
        .in('status', ['assigned', 'in_progress', 'waiting_materials'])
        .order('assigned_at', { ascending: false })

      // Fetch assigned materials
      const { data: materialsData } = await supabase
        .from('order_materials')
        .select(`
          *,
          material:materials(*),
          order:orders(id, order_number, title),
          job_card:job_cards(id, status)
        `)
        .eq('status', 'allocated')
        .in('order_id', jobCardsData?.map(j => j.order_id) || [])

      // Fetch previous usage records
      const { data: usageData } = await supabase
        .from('material_usage')
        .select(`
          *,
          material:materials(name, sku),
          order:orders(order_number),
          job_card:job_cards(id)
        `)
        .eq('worker_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(20)

      setJobCards(jobCardsData || [])
      setMaterials(materialsData || [])
      setUsageRecords(usageData || [])

    } catch (err) {
      console.error('Error fetching material data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setError(null)
      setSuccess(null)

      // Find the selected job card and material
      const jobCard = jobCards.find(j => j.id === formData.job_card_id)
      const material = materials.find(m => m.id === formData.material_id)

      if (!jobCard || !material) {
        setError('Invalid job card or material selection')
        return
      }

      // Record material usage
      const { error: usageError } = await supabase
        .from('material_usage')
        .insert({
          job_card_id: formData.job_card_id,
          material_id: formData.material_id,
          order_id: material.order_id,
          worker_id: user.id,
          quantity_used: parseFloat(formData.quantity_used),
          notes: formData.notes.trim() || null
        })

      if (usageError) throw usageError

      // Update order material status
      const { error: materialError } = await supabase
        .from('order_materials')
        .update({
          actual_used_quantity: parseFloat(formData.quantity_used),
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', material.id)

      if (materialError) throw materialError

      // Update material stock
      const { error: stockError } = await supabase
        .from('materials')
        .update({
          stock_quantity: supabase.raw(`stock_quantity - ${parseFloat(formData.quantity_used)}`)
        })
        .eq('id', material.material_id)

      if (stockError) throw stockError

      setSuccess('Material usage recorded successfully!')
      setFormData({
        job_card_id: '',
        material_id: '',
        quantity_used: '',
        notes: ''
      })

      // Refresh data
      setTimeout(() => {
        fetchData()
      }, 1000)

    } catch (err) {
      console.error('Error recording material usage:', err)
      setError(err.message)
    }
  }

  const validateForm = () => {
    if (!formData.job_card_id) {
      setError('Please select a job card')
      return false
    }
    if (!formData.material_id) {
      setError('Please select a material')
      return false
    }
    if (!formData.quantity_used || parseFloat(formData.quantity_used) <= 0) {
      setError('Please enter a valid quantity')
      return false
    }

    // Check if quantity exceeds allocated amount
    const selectedMaterial = materials.find(m => m.id === formData.material_id)
    if (selectedMaterial && parseFloat(formData.quantity_used) > selectedMaterial.required_quantity) {
      setError(`Quantity exceeds allocated amount (${selectedMaterial.required_quantity} ${selectedMaterial.material?.unit})`)
      return false
    }

    return true
  }

  const getAvailableMaterials = () => {
    if (!formData.job_card_id) return []
    
    const jobCard = jobCards.find(j => j.id === formData.job_card_id)
    if (!jobCard) return []

    return materials.filter(m => 
      m.order_id === jobCard.order_id && 
      m.status === 'allocated'
    )
  }

  const getSelectedMaterial = () => {
    return materials.find(m => m.id === formData.material_id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading material data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Material Usage Tracking</h1>
              <p className="mt-1 text-gray-600">Record material usage for your assigned jobs</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fetchData()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess(null)}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Record Usage Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Tool className="h-5 w-5 mr-2 text-gray-400" />
                  Record Material Usage
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Job Card Selection */}
                  <div>
                    <label htmlFor="job_card_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Job Card *
                    </label>
                    <select
                      id="job_card_id"
                      value={formData.job_card_id}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          job_card_id: e.target.value,
                          material_id: '' // Reset material when job changes
                        })
                      }}
                      required
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a job card</option>
                      {jobCards.map((jobCard) => (
                        <option key={jobCard.id} value={jobCard.id}>
                          {jobCard.order?.title} (Order #{jobCard.order?.order_number})
                        </option>
                      ))}
                    </select>
                    {formData.job_card_id && (
                      <p className="mt-2 text-sm text-gray-500">
                        Select a material allocated to this job
                      </p>
                    )}
                  </div>

                  {/* Material Selection */}
                  <div>
                    <label htmlFor="material_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Material *
                    </label>
                    <select
                      id="material_id"
                      value={formData.material_id}
                      onChange={(e) => setFormData({...formData, material_id: e.target.value})}
                      required
                      disabled={!formData.job_card_id}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:opacity-50"
                    >
                      <option value="">Select a material</option>
                      {getAvailableMaterials().map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.material?.name} - {material.required_quantity} {material.material?.unit} allocated
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Material Details */}
                  {getSelectedMaterial() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Package className="h-5 w-5 text-blue-500 mr-2" />
                        <h4 className="text-sm font-medium text-blue-900">Material Details</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-700">Name:</span>
                          <span className="ml-2 text-blue-900">{getSelectedMaterial().material?.name}</span>
                        </div>
                        <div>
                          <span className="text-blue-700">SKU:</span>
                          <span className="ml-2 text-blue-900">{getSelectedMaterial().material?.sku}</span>
                        </div>
                        <div>
                          <span className="text-blue-700">Allocated:</span>
                          <span className="ml-2 text-blue-900">
                            {getSelectedMaterial().required_quantity} {getSelectedMaterial().material?.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700">Current Stock:</span>
                          <span className="ml-2 text-blue-900">
                            {getSelectedMaterial().material?.stock_quantity} {getSelectedMaterial().material?.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quantity Used */}
                  <div>
                    <label htmlFor="quantity_used" className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity Used *
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="quantity_used"
                        value={formData.quantity_used}
                        onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                        required
                        min="0.01"
                        step="0.01"
                        className="block w-full pr-12 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">
                          {getSelectedMaterial()?.material?.unit || 'units'}
                        </span>
                      </div>
                    </div>
                    {getSelectedMaterial() && (
                      <p className="mt-2 text-sm text-gray-500">
                        Maximum allowed: {getSelectedMaterial().required_quantity} {getSelectedMaterial().material?.unit}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Add any notes about how the material was used..."
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          job_card_id: '',
                          material_id: '',
                          quantity_used: '',
                          notes: ''
                        })
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={!formData.job_card_id || !formData.material_id}
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      Record Usage
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Assigned Materials & Recent Usage */}
          <div className="space-y-6">
            {/* Assigned Materials */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Assigned Materials</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {materials.length} materials allocated to your jobs
                </p>
              </div>
              <div className="p-6">
                {materials.length === 0 ? (
                  <div className="text-center py-4">
                    <Package className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No materials assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.slice(0, 5).map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {material.material?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Order #{material.order?.order_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {material.required_quantity} {material.material?.unit}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            material.status === 'used' ? 'bg-green-100 text-green-800' :
                            material.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {material.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {materials.length > 5 && (
                      <button
                        onClick={() => navigate('/worker/dashboard?tab=materials')}
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        View all materials →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Usage */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Usage</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your last {usageRecords.length} material usage records
                </p>
              </div>
              <div className="p-6">
                {usageRecords.length === 0 ? (
                  <div className="text-center py-4">
                    <Calculator className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No usage records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usageRecords.map((record) => (
                      <div key={record.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {record.material?.name}
                          </p>
                          <p className="text-sm text-gray-900">
                            {record.quantity_used} {record.material?.unit}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Order #{record.order?.order_number} • {new Date(record.recorded_at).toLocaleDateString()}
                        </p>
                        {record.notes && (
                          <p className="mt-1 text-xs text-gray-600 italic">"{record.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Usage Summary</h3>
              </div>
              <div className="p-6">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Total Materials</dt>
                    <dd className="text-sm text-gray-900">{materials.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Used Today</dt>
                    <dd className="text-sm text-gray-900">
                      {usageRecords.filter(r => 
                        new Date(r.recorded_at).toDateString() === new Date().toDateString()
                      ).length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Total Used</dt>
                    <dd className="text-sm text-gray-900">
                      {usageRecords.reduce((sum, r) => sum + r.quantity_used, 0).toFixed(2)} units
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Efficiency</dt>
                    <dd className="text-sm text-green-600 font-medium">94%</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}