import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Upload, FileText, Save, RefreshCw, Clock
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
  
  const [formData, setFormData] = useState({ title: '', files: [] })
  const [previews, setPreviews] = useState([])

  useEffect(() => {
    fetchOrderAndJobCard()
  }, [orderId])

  const fetchOrderAndJobCard = async () => {
    try {
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single()
      setOrder(orderData)

      const { data: jobData } = await supabase.from('job_cards')
        .select('*').eq('order_id', orderId).eq('employer_id', user.id).maybeSingle()
      setJobCard(jobData)
    } finally { setLoading(false) }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData({ ...formData, files: [...formData.files, ...files] })
    setPreviews(files.map(file => ({ url: URL.createObjectURL(file) })))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.files.length) return setError("Upload a proof photo.")
    
    setSubmitting(true)
    try {
      // 1. Upload to Storage
      const file = formData.files[0]
      const path = `drafts/${orderId}/${Date.now()}-${file.name}`
      await supabase.storage.from('drafts').upload(path, file)
      const { data: { publicUrl } } = supabase.storage.from('drafts').getPublicUrl(path)

      // 2. Create Draft
      await supabase.from('drafts').insert([{
        order_id: orderId,
        job_card_id: jobCard.id,
        employer_id: user.id,
        draft_url: publicUrl,
        status: 'pending'
      }])

      // 3. Update Statuses
      await supabase.from('orders').update({ status: 'review' }).eq('id', orderId)
      await supabase.from('job_cards').update({ 
        status: 'completed', 
        is_paused: true,
        completed_at: new Date().toISOString() 
      }).eq('id', jobCard.id)

      setSuccess("Production completed. Draft sent to supervisor.")
      setTimeout(() => navigate('/employer/dashboard'), 2000)
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto" /></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800">
          <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white mb-2">Final Submission</h2>
          <p className="text-indigo-600 font-bold mb-8 uppercase text-xs">Job Card #{jobCard?.id}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-10 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] text-center">
              <Upload className="mx-auto text-gray-300 mb-4" size={48} />
              <input type="file" onChange={handleFileChange} className="hidden" id="file-up" />
              <label htmlFor="file-up" className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">
                Select Proof Photo
              </label>
              {previews.length > 0 && <img src={previews[0].url} className="mt-6 rounded-2xl h-40 mx-auto object-cover" />}
            </div>

            <button disabled={submitting} className="w-full py-6 bg-black dark:bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-lg">
              {submitting ? 'Processing...' : 'Complete & Submit'}
            </button>
          </form>
          {success && <Alert type="success" message={success} className="mt-6" />}
          {error && <Alert type="error" message={error} className="mt-6" />}
        </div>
      </div>
    </div>
  )
}