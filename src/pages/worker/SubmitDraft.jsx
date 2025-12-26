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

      // Verify worker is assigned to this order
      const { data: jobCardData } = await supabase
        .from('job_cards')
        .select('*')
        .eq('order_id', orderId)
        .eq('worker_id', user.id)
        .single()

      if (!jobCardData) {
        throw new Error('You are not assigned to this order')
      }

      // Fetch any existing drafts
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

      // Set default title
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
    
    // Validate files
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword']
      
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

    // Create previews for images
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
    newFiles.splice(index, 1)
    
    // Also remove preview if it exists
    const newPreviews = [...previews]
    if (index < newPreviews.length) {
      URL.revokeObjectURL(newPreviews[index].url)
      newPreviews.splice(index, 1)
    }

    setFormData(prev => ({ ...prev, files: newFiles }))
    setPreviews(newPreviews)
  }

  const uploadFiles = async () => {
    const uploadedUrls = []
    
    for (let i = 0; i < formData.files.length; i++) {
      const file = formData.files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }))
        
        const { data, error: uploadError } = await supabase.storage
          .from('drafts')
          .upload(`order-${orderId}/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100
              setUploadProgress(prev => ({ ...prev, [i]: percentage }))
            }
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('drafts')
          .getPublicUrl(data.path)

        uploadedUrls.push(publicUrl)

      } catch (err) {
        console.error('Error uploading file:', err)
        throw new Error(`Failed to upload ${file.name}: ${err.message}`)
      }
    }

    return uploadedUrls
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      let imageUrls = []
      let documentUrls = []

      // Upload files if any
      if (formData.files.length > 0) {
        const uploadedUrls = await uploadFiles()
        
        // Separate images and documents
        uploadedUrls.forEach((url, index) => {
          const file = formData.files[index]
          if (file.type.startsWith('image/')) {
            imageUrls.push(url)
          } else {
            documentUrls.push(url)
          }
        })
      }

      // Create draft record
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

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'draft_submitted' })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Update job card progress
      const { error: jobCardError } = await supabase
        .from('job_cards')
        .update({ 
          status: 'waiting_materials',
          progress_percentage: 75 
        })
        .eq('id', jobCard?.id)

      if (jobCardError) throw jobCardError

      setSuccess({
        title: 'Draft Submitted Successfully!',
        message: 'Your draft has been submitted for review. You will be notified when it is reviewed.',
        orderId
      })

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate(`/orders/${orderId}`)
      }, 3000)

    } catch (err) {
      console.error('Error submitting draft:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
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
      setError('Please upload at least one file (image or document)')
      return false
    }
    return true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error && error.includes('not assigned')) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert
            type="error"
            message={error}
            onClose={() => navigate('/dashboard')}
          />
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

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
            Back to Order
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submit Draft</h1>
          <p className="mt-2 text-sm text-gray-600">
            Submit a draft for Order #{order?.order_number}: {order?.title}
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

        {/* Order Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Order Number</p>
              <p className="text-sm text-gray-900">{order?.order_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-sm text-gray-900">
                {order?.customer?.profiles?.full_name || order?.customer?.email}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Dimensions</p>
              <p className="text-sm text-gray-900">
                {order?.height} × {order?.width} × {order?.depth} cm
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                order?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                order?.status === 'draft_submitted' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order?.status}
              </span>
            </div>
          </div>
          {order?.description && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Order Description</p>
              <p className="text-sm text-gray-700 mt-1">{order.description}</p>
            </div>
          )}
        </div>

        {/* Draft Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-400" />
              Draft Details
            </h2>

            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Draft Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Initial Design Draft"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                rows={4}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Describe your draft, what you've accomplished, any challenges faced, etc."
              />
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-gray-400" />
                Upload Files *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF, PDF, DOC up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Progress & File List */}
            {formData.files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Files ({formData.files.length})</h3>
                <div className="space-y-3">
                  {formData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-5 w-5 text-gray-400 mr-3" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                          <div className="w-24">
                            <div className="text-xs text-gray-500 text-right mb-1">
                              {uploadProgress[index].toFixed(0)}%
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${uploadProgress[index]}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Image Previews</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Any additional information for the reviewer..."
              />
            </div>
          </div>

          {/* Submission Guidelines */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Submission Guidelines
            </h3>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Ensure all files are clear and relevant to the order
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Include multiple angles for 3D objects
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Clearly describe any modifications or challenges
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                You can submit revisions if needed after review
              </li>
            </ul>
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
              disabled={submitting || formData.files.length === 0}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Submit Draft for Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}