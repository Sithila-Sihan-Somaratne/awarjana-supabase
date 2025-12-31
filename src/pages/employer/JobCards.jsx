import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, ClipboardCheck } from 'lucide-react'
import OrderCard from '../../components/common/OrderCard' 

export default function JobCards() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jobCards, setJobCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchJobCards()
  }, [])

  const fetchJobCards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_cards')
        .select(`*, order:orders(*, customer:users(profiles(full_name)))`)
        .eq('employer_id', user.id)
      if (error) throw error
      setJobCards(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (jobId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'in_progress') updateData.started_at = new Date();
    if (newStatus === 'completed') updateData.completed_at = new Date();

    const { error } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)

    if (!error) fetchJobCards()
  }

  const filtered = jobCards.filter(jc => 
    jc.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jc.order?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-gray-500 flex items-center gap-2 text-sm mb-2">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Active Jobs</h1>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search jobs..." 
            className="w-full pl-10 pr-4 py-3 rounded-2xl border-none bg-white dark:bg-gray-800 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map(jc => (
            <OrderCard 
              key={jc.id}
              jobCardId={jc.id}
              order={jc.order}
              status={jc.status} // Passes the job_card status, not the order status
              userRole="employer"
              onAction={handleAction}
              onView={(order) => navigate(`/orders/${order.id}`)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed">
             <ClipboardCheck className="mx-auto text-gray-300 mb-4" size={48} />
             <p className="text-gray-500 font-bold">No jobs found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  )
}