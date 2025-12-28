import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Alert } from '../components/common/Alert'
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react'

export default function NewOrder() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (!user || userRole !== 'customer') {
      navigate('/dashboard')
      return
    }
    fetchMaterials()
  }, [user, userRole, navigate])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error
      setMaterials(data || [])
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Failed to load materials: ' + err.message })
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
    return selectedMaterials.reduce((total, item) => {
      return total + (item.cost * item.quantity)
    }, 0)
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
      // Validation
      if (!formData.height || !formData.width) {
        throw new Error('Please enter frame dimensions')
      }

      if (selectedMaterials.length === 0) {
        throw new Error('Please select at least one material')
      }

      const totalCost = calculateTotalCost()
      const orderNumber = generateOrderNumber()

      // Calculate deadline based on type
      let confirmedDeadline = new Date()
      if (formData.deadlineType === 'standard') {
        confirmedDeadline.setDate(confirmedDeadline.getDate() + 7) // 7 days
      } else if (formData.deadlineType === 'express') {
        confirmedDeadline.setDate(confirmedDeadline.getDate() + 3) // 3 days
      } else if (formData.requestedDeadline) {
        confirmedDeadline = new Date(formData.requestedDeadline)
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          order_number: orderNumber,
          height: parseInt(formData.height),
          width: parseInt(formData.width),
          height2: formData.height2 ? parseInt(formData.height2) : null,
          width2: formData.width2 ? parseInt(formData.width2) : null,
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

      // Insert order materials
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

      setAlertMessage({
        type: 'success',
        message: `Order ${orderNumber} created successfully! Total: Rs. ${totalCost.toFixed(2)}`
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
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-primary">New Order</h1>
          <p className="text-sm text-gray-400">Create a custom photoframe order</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dimensions */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Frame Dimensions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height (cm) *
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g., 30"
                  required
                  min="1"
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Width (cm) *
                </label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="e.g., 40"
                  required
                  min="1"
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height 2 (cm) - Optional
                </label>
                <input
                  type="number"
                  value={formData.height2}
                  onChange={(e) => setFormData({ ...formData, height2: e.target.value })}
                  placeholder="For multi-panel frames"
                  min="0"
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Width 2 (cm) - Optional
                </label>
                <input
                  type="number"
                  value={formData.width2}
                  onChange={(e) => setFormData({ ...formData, width2: e.target.value })}
                  placeholder="For multi-panel frames"
                  min="0"
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Materials *</h2>
              <button
                type="button"
                onClick={addMaterial}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Add Material
              </button>
            </div>

            {selectedMaterials.length === 0 ? (
              <p className="text-gray-400 text-sm">No materials selected. Click "Add Material" to start.</p>
            ) : (
              <div className="space-y-3">
                {selectedMaterials.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Material</label>
                      <select
                        value={item.material_id}
                        onChange={(e) => updateMaterial(index, 'material_id', e.target.value)}
                        className="w-full px-3 py-2 bg-dark border border-gray-600 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {materials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - Rs. {material.cost.toFixed(2)} / {material.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                        className="w-full px-3 py-2 bg-dark border border-gray-600 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-xs text-gray-400 mb-1">Subtotal</label>
                      <div className="px-3 py-2 bg-dark border border-gray-700 rounded-lg text-sm text-primary font-mono">
                        Rs. {(item.cost * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="mt-6 text-error hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Deadline</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deadline Type *
                </label>
                <select
                  value={formData.deadlineType}
                  onChange={(e) => setFormData({ ...formData, deadlineType: e.target.value })}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="standard">Standard (7 days)</option>
                  <option value="express">Express (3 days) - Additional charges may apply</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {formData.deadlineType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Requested Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.requestedDeadline}
                    onChange={(e) => setFormData({ ...formData, requestedDeadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Additional Notes</h2>
            <textarea
              value={formData.customerNotes}
              onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
              placeholder="Any special requirements or instructions..."
              rows="4"
              className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Cost Summary */}
          <div className="card bg-gray-900/50 border-2 border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="text-primary" size={24} />
                <div>
                  <p className="text-sm text-gray-400">Total Estimated Cost</p>
                  <p className="text-3xl font-bold text-primary">
                    Rs. {calculateTotalCost().toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || selectedMaterials.length === 0}
                className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
