// src/pages/orders/NewOrder.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Save, Calculator, Package, Ruler,
  DollarSign, AlertCircle, CheckCircle, XCircle
} from 'lucide-react'
import Alert from '../../components/ui/Alert'

export default function NewOrder() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    height: '',
    width: '',
    depth: '',
    material_id: '',
    quantity: 1,
    priority: 'medium',
    deadline: '',
    notes: ''
  })
  const [calculations, setCalculations] = useState({
    volume: 0,
    materialCost: 0,
    laborCost: 0,
    totalCost: 0
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchMaterials()
  }, [user, navigate])

  useEffect(() => {
    calculateCosts()
  }, [formData.height, formData.width, formData.depth, formData.material_id, formData.quantity])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name')

      if (error) throw error
      setMaterials(data || [])
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError('Failed to load materials')
    }
  }

  const calculateCosts = () => {
    const height = parseFloat(formData.height) || 0
    const width = parseFloat(formData.width) || 0
    const depth = parseFloat(formData.depth) || 0
    const quantity = parseInt(formData.quantity) || 1

    // Calculate volume in cubic centimeters
    const volume = (height * width * depth) / 1000000 // Convert to cubic meters

    // Get selected material
    const selectedMaterial = materials.find(m => m.id === formData.material_id)
    const materialCost = selectedMaterial ? volume * selectedMaterial.unit_price * quantity : 0

    // Labor cost estimate (simplified)
    const laborCost = volume * 50 * quantity // $50 per cubic meter for labor

    // Total cost
    const totalCost = materialCost + laborCost

    setCalculations({
      volume: volume.toFixed(3),
      materialCost: materialCost.toFixed(2),
      laborCost: laborCost.toFixed(2),
      totalCost: totalCost.toFixed(2)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          order_number: orderNumber,
          title: formData.title,
          description: formData.description,
          height: parseFloat(formData.height),
          width: parseFloat(formData.width),
          depth: parseFloat(formData.depth),
          material_id: formData.material_id,
          quantity: formData.quantity,
          total_amount: parseFloat(calculations.totalCost),
          priority: formData.priority,
          deadline: formData.deadline || null,
          notes: formData.notes,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order materials entry
      if (formData.material_id) {
        const { error: materialError } = await supabase
          .from('order_materials')
          .insert({
            order_id: orderData.id,
            material_id: formData.material_id,
            required_quantity: parseFloat(formData.height) * parseFloat(formData.width) * parseFloat(formData.depth) / 1000000 * formData.quantity,
            status: 'pending'
          })

        if (materialError) console.error('Failed to create material entry:', materialError)
      }

      setSuccess({
        title: 'Order Created Successfully!',
        message: `Your order ${orderNumber} has been placed. Total amount: $${calculations.totalCost}`,
        orderId: orderData.id
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        height: '',
        width: '',
        depth: '',
        material_id: '',
        quantity: 1,
        priority: 'medium',
        deadline: '',
        notes: ''
      })

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate(`/orders/${orderData.id}`)
      }, 3000)

    } catch (err) {
      console.error('Error creating order:', err)
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Please enter a title for your order')
      return false
    }
    if (!formData.height || !formData.width || !formData.depth) {
      setError('Please enter all dimensions')
      return false
    }
    if (!formData.material_id) {
      setError('Please select a material')
      return false
    }
    if (parseFloat(calculations.totalCost) <= 0) {
      setError('Invalid cost calculation. Please check your dimensions.')
      return false
    }
    return true
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const selectedMaterial = materials.find(m => m.id === formData.material_id)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the details below to place a new order. All fields are required unless marked optional.
          </p>
        </div>

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
            message={
              <div>
                <div className="font-semibold">{success.title}</div>
                <div className="mt-1">{success.message}</div>
                <div className="mt-2 text-sm">
                  Redirecting to order details in 3 seconds...
                </div>
              </div>
            }
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Order Details Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-400" />
              Order Details
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Custom Coffee Table"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Describe what you need, including any specific requirements or design details..."
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Ruler className="h-4 w-4 mr-2 text-gray-400" />
                  Dimensions (cm) *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      required
                      min="1"
                      step="0.1"
                      placeholder="Height"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <label className="block text-xs text-gray-500 mt-1">Height</label>
                  </div>
                  <div>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleInputChange}
                      required
                      min="1"
                      step="0.1"
                      placeholder="Width"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <label className="block text-xs text-gray-500 mt-1">Width</label>
                  </div>
                  <div>
                    <input
                      type="number"
                      name="depth"
                      value={formData.depth}
                      onChange={handleInputChange}
                      required
                      min="1"
                      step="0.1"
                      placeholder="Depth"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <label className="block text-xs text-gray-500 mt-1">Depth</label>
                  </div>
                </div>
              </div>

              {/* Material Selection */}
              <div>
                <label htmlFor="material_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Material *
                </label>
                <select
                  id="material_id"
                  name="material_id"
                  value={formData.material_id}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select a material</option>
                  <option value="material">A material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} - ${material.unit_price}/{material.unit} ({material.stock_quantity} in stock)
                    </option>
                  ))}
                </select>
                {selectedMaterial && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedMaterial.description}
                  </p>
                )}
              </div>

              {/* Quantity & Priority */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Completion Date (Optional)
                </label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Any special instructions or requirements..."
                />
              </div>
            </div>
          </div>

          {/* Cost Calculation Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-gray-400" />
              Cost Calculation
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Volume</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {calculations.volume} m³
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-500">Material Cost</p>
                  <p className="text-2xl font-semibold text-blue-700">
                    ${calculations.materialCost}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-500">Labor Cost</p>
                  <p className="text-2xl font-semibold text-yellow-700">
                    ${calculations.laborCost}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-500">Total Cost</p>
                  <p className="text-2xl font-semibold text-green-700">
                    ${calculations.totalCost}
                  </p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Cost Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Volume:</span>
                    <span className="text-sm font-medium text-gray-900">{calculations.volume} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Material Rate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${selectedMaterial?.unit_price || 0}/{selectedMaterial?.unit || 'unit'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Labor Rate:</span>
                    <span className="text-sm font-medium text-gray-900">$50/m³</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-sm font-medium text-gray-900">Estimated Total:</span>
                    <span className="text-lg font-bold text-green-600">${calculations.totalCost}</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Note: This is an estimate. Final cost may vary based on complexity and material availability.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || parseFloat(calculations.totalCost) <= 0}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Order...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Create Order (${calculations.totalCost})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}