import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Package, Plus, Edit2, Trash2, AlertTriangle, Search, Filter, RefreshCw, X, ArrowLeft
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function InventoryManagement() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [materials, setMaterials] = useState([])
  const [filteredMaterials, setFilteredMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '', cost: '', stock_quantity: '', low_stock_threshold: '', unit: '', category: 'Raw Material'
  })

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login'); return
    }
    fetchMaterials()
  }, [user, userRole])

  useEffect(() => { handleFilter() }, [searchTerm, filterCategory, materials])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true })
      if (fetchError) throw fetchError
      setMaterials(data || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleFilter = () => {
    let result = [...materials]
    if (searchTerm) {
      result = result.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    if (filterCategory === 'low_stock') {
      result = result.filter(m => (m.stock_quantity || 0) <= (m.low_stock_threshold || 0))
    } else if (filterCategory !== 'all') {
      result = result.filter(m => m.category === filterCategory)
    }
    setFilteredMaterials(result)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const submissionData = {
        name: formData.name,
        unit: formData.unit,
        category: formData.category,
        cost: parseFloat(formData.cost) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 0
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('materials').update(submissionData).eq('id', editingId)
        if (updateError) throw updateError
        setSuccess("Material updated successfully!")
      } else {
        const { error: insertError } = await supabase.from('materials').insert([submissionData])
        if (insertError) throw insertError
        setSuccess("Material added to inventory!")
      }

      closeModal()
      fetchMaterials()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return
    try {
      const { error: delError } = await supabase.from('materials').delete().eq('id', id)
      if (delError) throw delError
      setSuccess("Material deleted.")
      fetchMaterials()
    } catch (err) { setError(err.message) }
  }

  const openEditModal = (material) => {
    setEditingId(material.id)
    setFormData({
      name: material.name,
      cost: material.cost,
      stock_quantity: material.stock_quantity,
      low_stock_threshold: material.low_stock_threshold,
      unit: material.unit,
      category: material.category || 'Raw Material'
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({ name: '', cost: '', stock_quantity: '', low_stock_threshold: '', unit: '', category: 'Raw Material' })
  }

  if (loading && materials.length === 0) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Inventory</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Stock Control Center 2026</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* GO TO DASHBOARD BUTTON */}
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white rounded-2xl font-black hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
            >
              <ArrowLeft size={20} /> DASHBOARD
            </button>

            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"
            >
              <Plus size={20} /> ADD MATERIAL
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search materials..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold text-xs dark:text-white outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="low_stock">⚠️ Low Stock Only</option>
            <option value="Raw Material">Raw Material</option>
            <option value="Finishing">Finishing</option>
          </select>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-6" />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-6" />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm relative group">
              {m.stock_quantity <= m.low_stock_threshold && (
                <div className="absolute top-4 right-4 text-red-500 animate-pulse"><AlertTriangle size={20}/></div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{m.category}</p>
                  <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">{m.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(m)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(m.id)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><Trash2 size={16}/></button>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Current Stock</p>
                  <p className={`text-3xl font-black ${m.stock_quantity <= m.low_stock_threshold ? 'text-red-500' : 'dark:text-white'}`}>
                    {m.stock_quantity} <span className="text-sm font-medium text-gray-500">{m.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Unit Cost</p>
                  <p className="font-mono font-bold dark:text-gray-300">Rs. {m.cost}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border dark:border-gray-800">
            <h2 className="text-2xl font-black dark:text-white mb-6 uppercase">{editingId ? 'Update' : 'New'} Material</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                required placeholder="Material Name" 
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <select 
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white font-bold"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Finishing">Finishing</option>
                <option value="Packaging">Packaging</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required type="number" placeholder="Cost" 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white"
                  value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})}
                />
                <input 
                  required placeholder="Unit (Kg, Mtr)" 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white"
                  value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Stock Qty</label>
                  <input 
                    required type="number" 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white"
                    value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Low Alert Level</label>
                  <input 
                    required type="number" 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-none dark:text-white"
                    value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all uppercase">
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-6 py-4 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-xl font-black hover:bg-gray-300 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}