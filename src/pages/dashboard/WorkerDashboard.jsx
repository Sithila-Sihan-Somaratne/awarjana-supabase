import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { 
  LogOut, ClipboardCheck, Tool, AlertTriangle, Calendar, 
  Package, Clock, CheckCircle, XCircle, RefreshCw,
  User, Upload, BarChart3, Download, Filter, Settings
} from 'lucide-react'
import { Alert } from '../../components/Alert'
import JobCard from '../../components/worker/JobCard'
import MaterialUsageCard from '../../components/worker/MaterialUsageCard'
import DraftStatus from '../../components/worker/DraftStatus'

export function WorkerDashboard() {
  const navigate = useNavigate()
  const { user, userRole, logout } = useAuth()
  const [jobCards, setJobCards] = useState([])
  const [materials, setMaterials] = useState([])
  const [drafts, setDrafts] = useState([])
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    dueToday: 0,
    completedJobs: 0,
    efficiency: 0
  })
  const [loading, setLoading] = useState(true)
  const [alertMessage, setAlertMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('jobcards')

  useEffect(() => {
    if (!user || userRole !== 'worker') {
      navigate('/login')
      return
    }
    fetchWorkerData()
  }, [user, userRole, navigate])

  const fetchWorkerData = async () => {
    try {
      setLoading(true)
      
      // Fetch job cards
      const { data: jobCardsData, error: jobsError } = await supabase
        .from('job_cards')
        .select(`
          *,
          order:order_id (
            id,
            order_number,
            title,
            description,
            status,
            priority,
            deadline,
            customer:customer_id (email, full_name)
          )
        `)
        .eq('worker_id', user.id)
        .order('assigned_at', { ascending: false })

      if (jobsError) throw jobsError

      // Fetch materials assigned to jobs
      const { data: materialsData, error: materialsError } = await supabase
        .from('order_materials')
        .select(`
          *,
          material:materials (*),
          order:orders (id, order_number, title)
        `)
        .in('order_id', jobCardsData?.map(j => j.order_id) || [])
        .eq('status', 'allocated')

      if (materialsError) throw materialsError

      // Fetch drafts
      const { data: draftsData, error: draftsError } = await supabase
        .from('drafts')
        .select(`
          *,
          order:orders (order_number, title)
        `)
        .eq('worker_id', user.id)
        .order('submitted_at', { ascending: false })

      if (draftsError) throw draftsError

      // Calculate stats
      const totalJobs = jobCardsData?.length || 0
      const activeJobs = jobCardsData?.filter(j => 
        ['assigned', 'in_progress', 'waiting_materials'].includes(j.status)
      ).length || 0
      const dueToday = jobCardsData?.filter(j => {
        if (!j.order?.deadline) return false
        const deadline = new Date(j.order.deadline)
        const today = new Date()
        return deadline.toDateString() === today.toDateString()
      }).length || 0
      const completedJobs = jobCardsData?.filter(j => j.status === 'completed').length || 0
      const efficiency = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

      setJobCards(jobCardsData || [])
      setMaterials(materialsData || [])
      setDrafts(draftsData || [])
      setStats({
        totalJobs,
        activeJobs,
        dueToday,
        completedJobs,
        efficiency
      })

    } catch (err) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Failed to load worker data: ' + err.message 
      })
      console.error('Worker dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      navigate('/login')
    }
  }

  const handleStartJob = async (jobCardId) => {
    try {
      const { error } = await supabase
        .from('job_cards')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', jobCardId)

      if (error) throw error

      setAlertMessage({ type: 'success', message: 'Job started successfully!' })
      fetchWorkerData()
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Failed to start job: ' + err.message })
    }
  }

  const handleCompleteJob = async (jobCardId) => {
    try {
      const { error } = await supabase
        .from('job_cards')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_percentage: 100
        })
        .eq('id', jobCardId)

      if (error) throw error

      setAlertMessage({ type: 'success', message: 'Job marked as completed!' })
      fetchWorkerData()
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Failed to complete job: ' + err.message })
    }
  }

  const handleMaterialUsage = async (materialId, quantityUsed, jobCardId) => {
    try {
      const { error } = await supabase
        .from('material_usage')
        .insert({
          material_id: materialId,
          quantity_used: quantityUsed,
          worker_id: user.id,
          job_card_id: jobCardId,
          order_id: jobCards.find(j => j.id === jobCardId)?.order_id
        })

      if (error) throw error

      setAlertMessage({ type: 'success', message: 'Material usage recorded!' })
      fetchWorkerData()
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Failed to record material usage: ' + err.message })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <p className="text-gray-600">Manage your assigned tasks and materials</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                <User size={16} className="inline mr-1" />
                {user?.email}
              </span>
              <button
                onClick={() => fetchWorkerData()}
                className="p-2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <LogOut size={16} className="inline mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold">{stats.totalJobs}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Active Jobs</p>
            <p className="text-2xl font-bold text-blue-600">{stats.activeJobs}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Due Today</p>
            <p className="text-2xl font-bold text-orange-600">{stats.dueToday}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completedJobs}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Efficiency</p>
            <p className="text-2xl font-bold text-purple-600">{stats.efficiency}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'jobcards', label: 'Job Cards', icon: <ClipboardCheck size={18} /> },
              { id: 'materials', label: 'Materials', icon: <Tool size={18} /> },
              { id: 'drafts', label: 'My Drafts', icon: <Upload size={18} /> },
              { id: 'deadlines', label: 'Deadlines', icon: <Calendar size={18} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'jobcards' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Assigned Job Cards</h2>
              <button
                onClick={() => navigate('/worker/job-cards')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : jobCards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <ClipboardCheck size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No job cards assigned yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobCards.map(jobCard => (
                  <JobCard
                    key={jobCard.id}
                    jobCard={jobCard}
                    onStart={() => handleStartJob(jobCard.id)}
                    onComplete={() => handleCompleteJob(jobCard.id)}
                    onView={() => navigate(`/orders/${jobCard.order_id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Assigned Materials</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Tool size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No materials assigned</p>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.map(material => (
                  <MaterialUsageCard
                    key={material.id}
                    material={material}
                    onRecordUsage={(quantity) => 
                      handleMaterialUsage(material.material_id, quantity, material.job_card_id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Submitted Drafts</h2>
              <button
                onClick={() => navigate('/worker/drafts')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No drafts submitted yet</p>
                <button
                  onClick={() => jobCards.length > 0 && navigate(`/worker/drafts/submit/${jobCards[0].order_id}`)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={jobCards.length === 0}
                >
                  Submit Your First Draft
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map(draft => (
                  <DraftStatus key={draft.id} draft={draft} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deadlines' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : jobCards.filter(j => j.order?.deadline).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No deadlines set</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deadline
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobCards
                      .filter(j => j.order?.deadline)
                      .sort((a, b) => new Date(a.order.deadline) - new Date(b.order.deadline))
                      .map(jobCard => (
                        <tr key={jobCard.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{jobCard.order?.title}</div>
                            <div className="text-sm text-gray-500">{jobCard.order?.order_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(jobCard.order.deadline).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.ceil((new Date(jobCard.order.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              jobCard.status === 'completed' ? 'bg-green-100 text-green-800' :
                              jobCard.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {jobCard.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => navigate(`/orders/${jobCard.order_id}`)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleStartJob(jobCard.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Start
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}