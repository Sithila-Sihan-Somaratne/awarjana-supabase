// src/pages/employer/SubmitDraft.jsx
// FIXED VERSION - English translation, Job Card integration, and Notification trigger
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Upload, FileText, Image, Paperclip,
  Save, XCircle, AlertCircle, CheckCircle, Clock, RefreshCw
} from 'lucide-react'
import Alert from '../../components/common/Alert'

export default function SubmitDraft() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const jobCardId = searchParams.get('jobCard')
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
  const [previews, setPreviews] = useState([])

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/login')
      return
    }
    fetchOrderAndJobCard()
  }, [user, orderId])

  const fetchOrderAndJobCard = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError
      setOrder(orderData)

      // 2. Verify worker assignment via Job Card
      let jobQuery = supabase.from('job_cards').select('*').eq('order_id', orderId).eq('employer_id', user.id)
      
      if (jobCardId) {
        jobQuery = jobQuery.eq('id', jobCardId)
      }

      const { data: jobData, error: jobError } = await jobQuery.maybeSingle()

      if (jobError || !jobData) throw new Error("You are not assigned to this specific order.")
      setJobCard(jobData)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData({ ...formData, files: [...formData.files, ...files] })
    
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name
    }))
    setPreviews([...previews, ...newPreviews])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.files.length === 0) {
      setError("Please upload at least one proof file.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const uploadedUrls = []

      // 1. Upload files to Supabase Storage
      for (const file of formData.files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${orderId}/${Date.now()}-${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('drafts')
          .upload(fileName, file)

        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('drafts')
          .getPublicUrl(fileName)
          
        uploadedUrls.push(publicUrl)
      }

      // 2. Create Draft record
      const { error: draftError } = await supabase
        .from('drafts')
        .insert([{
          order_id: orderId,
          job_card_id: jobCard.id,
          employer_id: user.id,
          draft_url: uploadedUrls[0], // Using first file as primary draft URL
          version: 1,
          status: 'pending'
        }])

      if (draftError) throw draftError

      // 3. Update Order and Job Card Status
      await supabase
        .from('orders')
        .update({ status: 'review' })
        .eq('id', orderId)

      await supabase
        .from('job_cards')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', jobCard.id)

      setSuccess("Proof submitted successfully! Admin has been notified.")
      setTimeout(() => navigate('/employer/dashboard'), 2000)

    } catch (err) {
      setError("Submission failed: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600" /></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-6 font-bold uppercase text-xs">
          <ArrowLeft size={16} /> Cancel Submission
        </button>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl border dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Submit Proof</h2>
              <p className="text-indigo-600 font-bold text-sm">Order: {order?.order_number}</p>
            </div>
            <FileText size={40} className="text-indigo-500 opacity-20" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Proof Title</label>
                <input 
                  type="text"
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Final Framing Proof v1"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Upload Proof (Photo of finished work)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-2xl hover:border-indigo-500 transition-colors cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span className="relative cursor-pointer font-bold text-indigo-600 hover:text-indigo-500">
                        Upload files
                        <input type="file" multiple className="sr-only" onChange={handleFileChange} />
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((p, i) => (
                    <img key={i} src={p.url} className="h-16 w-full object-cover rounded-xl border dark:border-gray-700" alt="preview" />
                  ))}
                </div>
              )}

              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-2">Production Notes</label>
                <textarea 
                  className="w-full p-4 mt-1 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                  placeholder="Record any final notes about the framing process..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
              {submitting ? 'UPLOADING...' : 'SUBMIT FOR APPROVAL'}
            </button>
          </form>

          {success && <Alert type="success" message={success} className="mt-6" />}
          {error && <Alert type="error" message={error} className="mt-6" />}
        </div>
      </div>
    </div>
  )
}
