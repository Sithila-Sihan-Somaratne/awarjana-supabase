// src/pages/worker/SubmitDraft.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Upload, FileText, Image, Paperclip,
  Save, XCircle, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import Alert from '../../components/common/Alert'

export default function SubmitDraft() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [jobCard, setJobCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    files: []
  })
  const [uploadProgress, setUploadProgress] = useState({})
  const [previews, setPreviews] = useState([])

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/login')
      return
    }
    fetchOrderAndJobCard()
  }, [user, orderId, navigate])

  const fetchOrderAndJobCard = async () => {
    try {
      setLoading(true)
      
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(email, profiles(full_name))
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Verify worker is assigned to this order via job card
      const { data: jobCardData } = await supabase
        .from('job_cards')
        .select('*')
        .eq('order_id', orderId)
        .eq('worker_id', user.id)
        .single()

      if (!jobCardData) {
        throw new Error('You are not assigned to this order')
      }

      // Check for existing drafts to handle revisions
      const { data: existingDrafts } = await supabase
        .from('drafts')
        .select('*')
        .eq('order_id', orderId)
        .eq('worker_id', user.id)
        .order('submitted_at', { ascending: false })

      if (existingDrafts && existingDrafts.length > 0) {
        const latestDraft = existingDrafts[0]
        if (['submitted', 'under_review'].includes(latestDraft.status)) {
          setError('You already have a draft submitted for this order.')
        } else if (latestDraft.status === 'needs_revision') {
          setFormData({
            title: `Revision - ${latestDraft.title}`,
            description: latestDraft.description || '',
            notes: latestDraft.revision_notes || '',
            files: []
          })
        }
      }

      setOrder(orderData)
      setJobCard(jobCardData)

      // Set default form values
      setFormData(prev => ({
        ...prev,
        title: prev.title || `Draft for ${orderData.title}`,
        description: prev.description || `Draft submission for order #${orderData.order_number}`
      }))

    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    
    // File validation logic
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!validTypes.includes(file.type)) {
        setError(`File ${file.name} has an invalid type. Only images and documents are allowed.`)
        return false
      }
      return true
    })

    // Create local blob previews for images
    const newPreviews = validFiles
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type
      }))

    setPreviews([...previews, ...newPreviews])
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }))
  }

  const removeFile = (index) => {
    const newFiles = [...formData.files]
    const removedFile = newFiles.splice(index, 1)[0]
    
    // Clean up object URLs to prevent memory leaks
    if (removedFile.type.startsWith('image/')) {
      const previewIndex = previews.findIndex(p => p.name === removedFile.name)
      if (previewIndex !== -1) {
        URL.revokeObjectURL(previews[previewIndex].url)
        const newPreviews = [...previews]
        newPreviews.splice(previewIndex, 1)
        setPreviews(newPreviews)
      }
    }

    setFormData(prev => ({ ...prev, files: newFiles }))
  }

  const uploadFiles = async () => {
    const uploadedUrls = []
    
    for (let i = 0; i < formData.files.length; i++) {
      const file = formData.files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `order-${orderId}/${fileName}`
      
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }))
        
        const { data, error: uploadError } = await supabase.storage
          .from('drafts')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100
              setUploadProgress(prev => ({ ...prev, [i]: percentage }))
            }
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('drafts')
          .getPublicUrl(data.path)

        uploadedUrls.push(publicUrl)
      } catch (err) {
        throw new Error(`Failed to upload ${file.name}: ${err.message}`)
      }
    }
    return uploadedUrls
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Please enter a title for your draft')
      return false
    }
    if (!formData.description.trim()) {
      setError('Please provide a description')
      return false
    }
    if (formData.files.length === 0) {
      setError('Please upload at least one file')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setError(null)

    try {
      const uploadedUrls = await uploadFiles()
      const imageUrls = []
      const documentUrls = []

      uploadedUrls.forEach((url, index) => {
        const file = formData.files[index]
        if (file.type.startsWith('image/')) {
          imageUrls.push(url)
        } else {
          documentUrls.push(url)
        }
      })

      // 1. Insert Draft
      const { error: draftError } = await supabase
        .from('drafts')
        .insert({
          order_id: orderId,
          job_card_id: jobCard?.id,
          worker_id: user.id,
          title: formData.title,
          description: formData.description,
          notes: formData.notes,
          image_urls: imageUrls,
          document_urls: documentUrls,
          status: 'submitted',
          version: 1
        })

      if (draftError) throw draftError

      // 2. Update Order Status
      await supabase.from('orders').update({ status: 'draft_submitted' }).eq('id', orderId)

      // 3. Update Job Card Progress
      await supabase.from('job_cards').update({ 
        status: 'waiting_materials',
        progress_percentage: 75 
      }).eq('id', jobCard?.id)

      setSuccess({
        title: 'Draft Submitted!',
        message: 'Your draft has been sent for review.'
      })

      setTimeout(() => navigate(`/orders/${orderId}`), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Order
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Submit Draft</h1>
        <p className="mt-2 text-sm text-gray-600">Order #{order?.order_number}: {order?.title}</p>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} className="my-6" />}
        {success && <Alert type="success" message={success.message} className="my-6" />}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Order Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Dimensions:</span> {order?.height}x{order?.width}x{order?.depth} cm</div>
            <div><span className="text-gray-500">Customer:</span> {order?.customer?.profiles?.full_name || order?.customer?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Draft Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files (Images/Docs) *</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload files</span>
                      <input type="file" multiple onChange={handleFileChange} className="sr-only" accept="image/*,.pdf,.doc,.docx" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">Up to 10MB each</p>
                </div>
              </div>
            </div>

            {formData.files.length > 0 && (
              <div className="space-y-3 mb-6">
                {formData.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500"><XCircle className="h-5 w-5"/></button>
                  </div>
                ))}
              </div>
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {previews.map((p, idx) => (
                  <img key={idx} src={p.url} className="h-24 w-full object-cover rounded-md" alt="preview" />
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || formData.files.length === 0}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : <><Save className="mr-2 h-4 w-4"/> Submit Draft</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}