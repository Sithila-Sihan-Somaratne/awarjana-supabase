import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Alert from '../components/common/Alert'
import { ArrowLeft, Plus, Trash2, Loader } from 'lucide-react'
import { calculateOrderCost, formatLKR } from '../lib/costCalculator'

export default function NewOrder() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [fetchingMaterials, setFetchingMaterials] = useState(true)
  const [alertMessage, setAlertMessage] = useState(null)
  const [materials, setMaterials] = useState([])
  const [selectedMaterials, setSelectedMaterials] = useState([])
  
  const [formData, setFormData] = useState({
    height: '',
    width: '',
    height2: '',
    width2: '',
    deadlineType: 'standard',
    requestedDeadline: '',
    customerNotes: ''
  })

  const [calculatedCost, setCalculatedCost] = useState(null)

  useEffect(() => {
    if (!user || userRole !== 'customer') {
      navigate('/dashboard')
      return
    }
    fetchMaterials()
  }, [user, userRole, navigate])

  useEffect(() => {
    if (formData.height && formData.width) {
      const cost = calculateOrderCost(parseFloat(formData.width), parseFloat(formData.height))
      setCalculatedCost(cost)
    } else {
      setCalculatedCost(null)
    }
  }, [formData.height, formData.width])

  const fetchMaterials = async () => {
    setFetchingMaterials(true)
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMaterials(data || [])
    } catch (err) {
      console.error('Error fetching materials:', err)
      setAlertMessage({ type: 'error', message: 'Failed to load materials. Please check your connection.' })
    } finally {
      setFetchingMaterials(false)
    }
  }

  const addMaterial = () => {
    if (materials.length === 0) return
    setSelectedMaterials([...selectedMaterials, { 
      material_id: materials[0].id, 
      quantity: 1,
      cost: materials[0].cost 
    }])
  }

  const removeMaterial = (index) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index))
  }

  const updateMaterial = (index, field, value) => {
    const updated = [...selectedMaterials]
    updated[index][field] = value
    
    if (field === 'material_id') {
      const material = materials.find(m => m.id === parseInt(value))
      if (material) {
        updated[index].cost = material.cost
      }
    }
    
    setSelectedMaterials(updated)
  }

  const calculateTotalCost = () => {
    const baseCost = calculatedCost ? calculatedCost.total : 0
    const materialsCost = selectedMaterials.reduce((total, item) => {
      return total + (item.cost * item.quantity)
    }, 0)
    return baseCost + materialsCost
  }

  const generateOrderNumber = () => {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `ORD-${date}-${random}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAlertMessage(null)

    try {
      if (!formData.height || !formData.width) {
        throw new Error('Please enter frame dimensions')
      }

      const totalCost = calculateTotalCost()
      const orderNumber = generateOrderNumber()

      let confirmedDeadline = new Date()
      if (formData.deadlineType === 'standard') {
        confirmedDeadline.setDate(confirmedDeadline.getDate() + 7)
      } else if (formData.deadlineType === 'express') {
        confirmedDeadline.setDate(confirmedDeadline.getDate() + 3)
      } else if (formData.requestedDeadline) {
        confirmedDeadline = new Date(formData.requestedDeadline)
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          order_number: orderNumber,
          height: parseFloat(formData.height),
          width: parseFloat(formData.width),
          height2: formData.height2 ? parseFloat(formData.height2) : null,
          width2: formData.width2 ? parseFloat(formData.width2) : null,
          cost: totalCost,
          status: 'pending',
          deadline_type: formData.deadlineType,
          requested_deadline: formData.requestedDeadline || null,
          confirmed_deadline: confirmedDeadline.toISOString(),
          customer_notes: formData.customerNotes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orderError) throw orderError

      if (selectedMaterials.length > 0) {
        const orderMaterialsData = selectedMaterials.map(item => ({
          order_id: orderData.id,
          material_id: item.material_id,
          quantity: item.quantity,
          cost_at_time: item.cost
        }))

        const { error: materialsError } = await supabase
          .from('order_materials')
          .insert(orderMaterialsData)

        if (materialsError) throw materialsError
      }

      setAlertMessage({
        type: 'success',
        message: `Order ${orderNumber} created successfully! Total: ${formatLKR(totalCost)}`
      })

      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (err) {
      setAlertMessage({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <header className="bg-white dark:bg-dark-lighter border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Order</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create a custom photoframe order</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-dark-lighter p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Frame Dimensions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Height (inches) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g., 12"
                  required
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Width (inches) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="e.g., 18"
                  required
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary"
                />
              </div>
            </div>
            {calculatedCost && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Base Cost:</span>
                  <span className="text-lg font-bold text-primary">{formatLKR(calculatedCost.total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Includes frame, glass, MDF, labor, and electricity.</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-lighter p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Additional Materials</h2>
              <button 
                type="button" 
                onClick={addMaterial} 
                disabled={fetchingMaterials || materials.length === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Plus size={16} /> Add Material
              </button>
            </div>
            
            {fetchingMaterials ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin text-primary" size={24} />
                <span className="ml-2 text-gray-500">Loading materials...</span>
              </div>
            ) : selectedMaterials.length > 0 ? (
              <div className="space-y-3">
                {selectedMaterials.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-dark/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <select
                        value={item.material_id}
                        onChange={(e) => updateMaterial(index, 'material_id', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name} - {formatLKR(m.cost)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                        className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <button type="button" onClick={() => removeMaterial(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500 text-sm italic">No additional materials selected.</p>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Total Order Cost</span>
              <span className="text-3xl font-bold text-primary">{formatLKR(calculateTotalCost())}</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform"
          >
            {loading ? <Loader size={24} className="animate-spin" /> : <><Plus size={24} /> Create Order</>}
          </button>
        </form>
      </main>
    </div>
  )
}
