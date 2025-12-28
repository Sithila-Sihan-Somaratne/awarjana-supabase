// src/pages/worker/JobCards.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, ClipboardCheck, Filter, Search, Calendar,
  Clock, CheckCircle, AlertCircle, TrendingUp, Eye
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import JobCard from '../../components/common/JobCard'

export default function JobCards() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jobCards, setJobCards] = useState([])
  const [filteredJobCards, setFilteredJobCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all'
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchJobCards()
  }, [user, navigate])

  useEffect(() => {
    filterJobCards()
  }, [jobCards, searchTerm, filters])

  const fetchJobCards = async () => {
    try {
      setLoading(true)
      
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

      setJobCards(jobCardsData || [])
      setFilteredJobCards(jobCardsData || [])

    } catch (err) {
      console.error('Error fetching job cards:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterJobCards = () => {
    let result = jobCards

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(jobCard =>
        jobCard.order?.order_number.toLowerCase().includes(term) ||
        jobCard.order?.title.toLowerCase().includes(term) ||
        jobCard.order?.customer?.email.toLowerCase().includes(term) ||
        jobCard.order?.customer?.profiles?.full_name?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(jobCard => jobCard.status === filters.status)
    }

    // Priority filter (from order)
    if (filters.priority !== 'all') {
      result = result.filter(jobCard => jobCard.order?.priority === filters.priority)
    }

    setFilteredJobCards(result)
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
      fetchJobCards()
    } catch (err) {
      console.error('Error starting job:', err)
      setError(err.message)
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
      fetchJobCards()
    } catch (err) {
      console.error('Error completing job:', err)
      setError(err.message)
    }
  }

  const getStats = () => {
    const total = jobCards.length
    const assigned = jobCards.filter(j => j.status === 'assigned').length
    const inProgress = jobCards.filter(j => j.status === 'in_progress').length
    const completed = jobCards.filter(j => j.status === 'completed').length
    const waiting = jobCards.filter(j => j.status === 'waiting_materials').length

    return { total, assigned, inProgress, completed, waiting }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job cards...</p>
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
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Job Cards</h1>
              <p className="mt-1 text-gray-600">Manage and track all your assigned jobs</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fetchJobCards()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardCheck className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Assigned</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.assigned}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inProgress}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Waiting Materials</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.waiting}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Jobs
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search by order #, title, customer..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_materials">Waiting Materials</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {filters.status}
                <button
                  onClick={() => setFilters({...filters, status: 'all'})}
                  className="ml-1.5 text-blue-800 hover:text-blue-900"
                >
                  &times;
                </button>
              </span>
            )}
            {filters.priority !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Priority: {filters.priority}
                <button
                  onClick={() => setFilters({...filters, priority: 'all'})}
                  className="ml-1.5 text-green-800 hover:text-green-900"
                >
                  &times;
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1.5 text-gray-800 hover:text-gray-900"
                >
                  &times;
                </button>
              </span>
            )}
            {(filters.status !== 'all' || filters.priority !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilters({ status: 'all', priority: 'all' })
                  setSearchTerm('')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Your Job Cards</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filteredJobCards.length} of {jobCards.length} jobs
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option>Newest First</option>
                  <option>Deadline</option>
                  <option>Priority</option>
                  <option>Progress</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredJobCards.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {jobCards.length === 0 
                    ? 'You don\'t have any job cards assigned yet.' 
                    : 'No job cards match your current filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobCards.map((jobCard) => (
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

            {/* Pagination */}
            {filteredJobCards.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">1</span> to{' '}
                      <span className="font-medium">{Math.min(filteredJobCards.length, 9)}</span> of{' '}
                      <span className="font-medium">{filteredJobCards.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Previous
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        1
                      </button>
                      <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        2
                      </button>
                      <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {jobCards.filter(j => j.order?.deadline).length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  Upcoming Deadlines
                </h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deadline
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Left
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobCards
                        .filter(j => j.order?.deadline)
                        .sort((a, b) => new Date(a.order.deadline) - new Date(b.order.deadline))
                        .slice(0, 5)
                        .map((jobCard) => {
                          const daysLeft = Math.ceil((new Date(jobCard.order.deadline) - new Date()) / (1000 * 60 * 60 * 24))
                          return (
                            <tr key={jobCard.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {jobCard.order?.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Order #{jobCard.order?.order_number}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(jobCard.order.deadline).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  jobCard.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  jobCard.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {jobCard.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${
                                  daysLeft < 0 ? 'text-red-600' :
                                  daysLeft < 3 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days`}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/orders/${jobCard.order?.id}`)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}