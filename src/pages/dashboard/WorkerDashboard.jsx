// src/pages/dashboard/WorkerDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ClipboardCheck, Wrench, AlertTriangle, Calendar, Package,
  Clock, CheckCircle, Users, BarChart3, Plus, Filter, Download
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import JobCard from '../../components/common/JobCard'
import StatsCard from '../../components/common/StatsCard'
import TaskProgress from '../../components/common/TaskProgress'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
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
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('jobcards')

  useEffect(() => {
    if (!user || userRole !== 'worker') {
      navigate('/login')
      return
    }
    fetchWorkerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, navigate])

  const fetchWorkerData = async () => {
    try {
      setLoading(true)

      // Fetch worker's job cards
      const { data: jobCardsData, error: jobsError } = await supabase
        .from('job_cards')
        .select(`
          *,
          order:orders(
            *,
            customer:users(email, profiles(full_name))
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
          material:materials(*),
          order:orders(id, order_number, title)
        `)
        .in('order_id', jobCardsData?.map(j => j.order?.id) || [])
        .eq('status', 'allocated')

      if (materialsError) throw materialsError

      // Fetch drafts submitted by worker
      const { data: draftsData, error: draftsError } = await supabase
        .from('drafts')
        .select(`
          *,
          order:orders(order_number, title),
          job_card:job_cards(progress_percentage)
        `)
        .eq('worker_id', user.id)
        .order('submitted_at', { ascending: false })

      if (draftsError) throw draftsError

      // Calculate statistics
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
      setError(null)

    } catch (err) {
      console.error('Worker dashboard error:', err)
      setError(err.message || 'Failed to load worker dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleStartJob = async (jobCardId) => {
    try {
      const { error } = await supabase
        .from('job_cards')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          progress_percentage: 10
        })
        .eq('id', jobCardId)

      if (error) throw error
      fetchWorkerData()
    } catch (err) {
      console.error('Error starting job:', err)
      setError(err.message || 'Failed to start job')
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
      fetchWorkerData()
    } catch (err) {
      console.error('Error completing job:', err)
      setError(err.message || 'Failed to complete job')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading worker dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your assigned tasks and materials</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fetchWorkerData()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert
            type="error"
            message={`Failed to load dashboard: ${error}`}
            onClose={() => setError(null)}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Total Jobs"
            value={stats.totalJobs}
            icon={ClipboardCheck}
            color="blue"
          />
          <StatsCard
            title="Active Jobs"
            value={stats.activeJobs}
            icon={Wrench}
            color="yellow"
          />
          <StatsCard
            title="Due Today"
            value={stats.dueToday}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="Efficiency"
            value={`${stats.efficiency}%`}
            icon={BarChart3}
            color="green"
          />
        </div>

        {/* Main Content Tabs */}
        <div className="mb-6">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="jobcards">Job Cards</option>
              <option value="materials">Materials</option>
              <option value="drafts">My Drafts</option>
              <option value="deadlines">Deadlines</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-4">
              {[
                { id: 'jobcards', label: 'Job Cards', icon: ClipboardCheck, count: jobCards.length },
                { id: 'materials', label: 'Materials', icon: Wrench, count: materials.length },
                { id: 'drafts', label: 'My Drafts', icon: Package, count: drafts.length },
                { id: 'deadlines', label: 'Deadlines', icon: Calendar, count: stats.dueToday },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                    ${activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="ml-2">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`
                      ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${activeTab === tab.id
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-gray-200 text-gray-800'
                      }
                    `}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'jobcards' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Assigned Job Cards</h2>
                <div className="flex space-x-3">
                  <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md">
                    <option>Filter by status</option>
                    <option>Assigned</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                  <button
                    onClick={() => navigate('/worker/job-cards')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    View All
                  </button>
                </div>
              </div>

              {jobCards.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any job cards assigned yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobCards.map((jobCard) => (
                    <JobCard
                      key={jobCard.id}
                      jobCard={jobCard}
                      onStart={() => handleStartJob(jobCard.id)}
                      onComplete={() => handleCompleteJob(jobCard.id)}
                      onView={() => navigate(`/orders/${jobCard.order?.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Assigned Materials</h2>
                <button
                  onClick={() => navigate('/worker/material-usage')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Record Usage
                </button>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No materials assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any materials allocated for your jobs.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Required
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {materials.map((material) => (
                        <tr key={material.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Wrench className="h-6 w-6 text-gray-500" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {material.material?.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {material.material?.sku}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{material.order?.title}</div>
                            <div className="text-sm text-gray-500">#{material.order?.order_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {material.required_quantity} {material.material?.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              material.status === 'allocated' ? 'bg-green-100 text-green-800' :
                              material.status === 'used' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {material.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => navigate(`/worker/material-usage?material=${material.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Record Use
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

          {activeTab === 'drafts' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Submitted Drafts</h2>
                <button
                  onClick={() => jobCards.length > 0 && navigate(`/worker/drafts/submit/${jobCards[0].order?.id}`)}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled={jobCards.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Submit New Draft
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No drafts submitted</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Submit a draft for one of your assigned jobs.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Draft for {draft.order?.title}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Order #{draft.order?.order_number} • Submitted on {draft.submitted_at ? new Date(draft.submitted_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          draft.status === 'approved' ? 'bg-green-100 text-green-800' :
                          draft.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          draft.status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {draft.status}
                        </span>
                      </div>
                      {draft.description && (
                        <p className="mt-2 text-sm text-gray-700">{draft.description}</p>
                      )}
                      {draft.review_notes && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm font-medium text-yellow-800">Review Notes:</p>
                          <p className="mt-1 text-sm text-yellow-700">{draft.review_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deadlines' && (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Upcoming Deadlines</h2>
              {jobCards.filter(j => j.order?.deadline).length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No deadlines set</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any upcoming deadlines.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobCards
                    .filter(j => j.order?.deadline)
                    .sort((a, b) => new Date(a.order.deadline) - new Date(b.order.deadline))
                    .map((jobCard) => (
                      <TaskProgress
                        key={jobCard.id}
                        task={jobCard}
                        onView={() => navigate(`/orders/${jobCard.order?.id}`)}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
