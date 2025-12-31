// src/pages/admin/RegistrationCodes.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Key, Plus, Copy, CheckCircle, XCircle, Trash2, RefreshCw, RotateCcw
} from 'lucide-react'
import Alert from '../../components/common/Alert'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function RegistrationCodes() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateRole, setGenerateRole] = useState('employer')
  const [generateCount, setGenerateCount] = useState(1)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login')
      return
    }
    fetchCodes()
  }, [user, userRole, navigate])

  const fetchCodes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('registration_codes')
        .select(`
          *,
          used_by_user:users!registration_codes_used_by_fkey(email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setCodes(data || [])
    } catch (err) {
      console.error('Error fetching codes:', err)
      setError(err.message || 'Failed to load registration codes')
    } finally {
      setLoading(false)
    }
  }

  const hashString = async (str) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
      if ((i + 1) % 4 === 0 && i < 11) code += '-'
    }
    return code
  }

  const handleGenerateCodes = async () => {
    try {
      setError(null)
      
      // Check limit
      const { count, error: countError } = await supabase
        .from('registration_codes')
        .select('*', { count: 'exact', head: true })
      
      if (countError) throw countError
      
      if (count + generateCount > 10) {
        setError(`Cannot exceed 10 total registration codes. Current: ${count}. Please delete some first.`)
        return
      }

      const newCodes = []

      for (let i = 0; i < generateCount; i++) {
        const plainCode = generateRandomCode()
        const hashedCode = await hashString(plainCode)

        newCodes.push({
          code: hashedCode,
          plain_code: plainCode, // Store temporarily for display
          role: generateRole,
          is_used: false,
          created_at: new Date().toISOString()
        })
      }

      const { error: insertError } = await supabase
        .from('registration_codes')
        .insert(newCodes.map(({ plain_code, ...rest }) => rest))

      if (insertError) throw insertError

      setSuccess(`Successfully generated ${generateCount} ${generateRole} code(s)!`)
      setShowGenerateModal(false)
      fetchCodes()

      // Show the plain codes to admin (they won't be stored)
      const codesList = newCodes.map(c => c.plain_code).join('\n')
      alert(`Generated Codes (SAVE THESE NOW!):\n\n${codesList}\n\nThese codes will not be shown again!`)
    } catch (err) {
      console.error('Error generating codes:', err)
      setError(err.message || 'Failed to generate codes')
    }
  }

  const handleDeleteCode = async (id) => {
    if (!confirm('Are you sure you want to delete this code?')) return

    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('registration_codes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Code deleted successfully!')
      fetchCodes()
    } catch (err) {
      console.error('Error deleting code:', err)
      setError(err.message || 'Failed to delete code')
    }
  }

  const handleResetCodes = async () => {
    if (!confirm('WARNING: This will delete ALL existing registration codes. Continue?')) return

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('registration_codes')
        .delete()
        .neq('id', 0) // Delete all

      if (deleteError) throw deleteError

      setSuccess('All registration codes have been reset.')
      fetchCodes()
    } catch (err) {
      console.error('Error resetting codes:', err)
      setError(err.message || 'Failed to reset codes')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const stats = {
    total: codes.length,
    used: codes.filter(c => c.is_used).length,
    unused: codes.filter(c => !c.is_used).length,
    employer: codes.filter(c => c.role === 'employer').length,
    admin: codes.filter(c => c.role === 'admin').length
  }

  if (loading && codes.length === 0) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registration Codes</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage up to 10 registration codes for employers and admins</p>
          </div>
          <button
            onClick={handleResetCodes}
            className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium rounded-lg transition-colors"
          >
            <RotateCcw size={20} className="mr-2" />
            Reset All Codes
          </button>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Codes</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.total}/10</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Used</div>
            <div className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{stats.used}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</div>
            <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{stats.unused}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Employer Codes</div>
            <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.employer}</div>
          </div>
          <div className="bg-white dark:bg-dark-lighter rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Admin Codes</div>
            <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.admin}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={fetchCodes}
            className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={stats.total >= 10}
            className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Generate Codes
          </button>
        </div>

        {/* Codes Table */}
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Used By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-lighter divide-y divide-gray-200 dark:divide-gray-700">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Key size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No registration codes found</p>
                      <button
                        onClick={() => setShowGenerateModal(true)}
                        className="mt-4 text-primary-500 hover:text-primary-600 font-medium"
                      >
                        Generate your first code
                      </button>
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-dark-light transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          #{code.id.toString().padStart(4, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          code.role === 'admin' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        }`}>
                          {code.role.charAt(0).toUpperCase() + code.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {code.is_used ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            <XCircle size={14} className="mr-1" />
                            Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            <CheckCircle size={14} className="mr-1" />
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {code.used_by_user?.email || '-'}
                        </div>
                        {code.used_at && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(code.used_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(code.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 dark:bg-black opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white dark:bg-dark-lighter rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white dark:bg-dark-lighter px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Generate Registration Codes</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                      <select
                        value={generateRole}
                        onChange={(e) => setGenerateRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                      >
                        <option value="employer">Employer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Count (Max {10 - stats.total})</label>
                      <input
                        type="number"
                        min="1"
                        max={10 - stats.total}
                        value={generateCount}
                        onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-light px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleGenerateCodes}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Generate
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-dark text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
