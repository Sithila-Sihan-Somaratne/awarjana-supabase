import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, Upload, RefreshCw, CheckCircle
} from 'lucide-react'
import Alert from '../../components/common/Alert'

export default function SubmitDraft() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const jobCardIdFromUrl = searchParams.get('jobCard')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [jobCard, setJobCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    fetchContextData()
  }, [orderId])

  const fetchContextData = async () => {
    try {
      setLoading(true)
      // Fetch the job card to ensure we have the correct ID for the draft record
      const { data: jobData, error: jobErr } = await supabase
        .from('job_cards')
        .select('id, order_id')
        .eq('order_id', orderId)
        .single()

      if (jobErr) throw jobErr
      setJobCard(jobData)
    } catch (err) {
      setError("Could not load job context: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a proof photo before submitting.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Upload Photo to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      const filePath = `proofs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('drafts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('drafts')
        .getPublicUrl(filePath)

      // 3. Create Draft Record
      const { error: draftError } = await supabase.from('drafts').insert({
        order_id: orderId,
        job_card_id: jobCard.id,
        employer_id: user.id,
        draft_url: publicUrl,
        status: 'pending'
      })
      if (draftError) throw draftError

      // 4. Update Order and Job Card Status to 'review'
      await supabase.from('orders').update({ status: 'review' }).eq('id', orderId)
      await supabase.from('job_cards').update({ status: 'review' }).eq('id', jobCard.id)

      // 5. Success - Return to Dashboard
      navigate('/employer/dashboard', { state: { message: 'Proof submitted successfully!' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center dark:bg-black">
      <RefreshCw className="animate-spin text-indigo-600" size={48} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-10">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 mb-8 font-black text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800">
          <header className="mb-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Final Submission</h2>
            <p className="text-indigo-600 font-bold uppercase text-[10px] mt-1">Order Ref: {orderId}</p>
          </header>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative group p-10 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] text-center hover:border-indigo-500 transition-all">
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} className="rounded-2xl h-64 mx-auto object-cover shadow-lg" alt="Preview" />
                  <button 
                    type="button" 
                    onClick={() => {setFile(null); setPreview(null);}}
                    className="text-red-500 font-black text-[10px] uppercase"
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="mx-auto text-gray-300 mb-4 group-hover:text-indigo-500 transition-colors" size={64} />
                  <span className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">
                    Select Proof Photo
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <p className="text-gray-400 text-[9px] font-bold uppercase mt-4">JPG or PNG (Max 5MB)</p>
                </label>
              )}
            </div>

            <button 
              type="submit"
              disabled={submitting || !file}
              className="w-full py-6 bg-black dark:bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="animate-spin mx-auto" size={24} />
              ) : (
                'Complete & Submit'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}