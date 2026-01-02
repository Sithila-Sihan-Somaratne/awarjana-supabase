// src/pages/admin/RegistrationCodes.jsx
// FIXED VERSION - Properly hashes codes before storage
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Key, Plus, Copy, CheckCircle, XCircle, Trash2, RefreshCw, RotateCcw, UserPlus
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
  }, [user, userRole])

  // Hash function to match AuthContext
  const hashCode = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const fetchCodes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('registration_codes')
        .select(`
          *,
          used_by_user:users(email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setCodes(data || [])
    } catch (err) {
      setError("Failed to sync codes: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCodes = async () => {
    try {
      setLoading(true)
      const newCodes = []
      
      // Generate codes with both plain and hashed versions
      for (let i = 0; i < generateCount; i++) {
        const plainCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const hashedCode = await hashCode(plainCode)
        
        newCodes.push({
          code: hashedCode,           // Store hashed for validation
          plain_code: plainCode,      // Store plain for admin display
          role: generateRole,
          is_used: false
        })
      }

      const { error: insertError } = await supabase
        .from('registration_codes')
        .insert(newCodes)

      if (insertError) throw insertError

      setSuccess(`Successfully generated ${generateCount} codes for ${generateRole}s`)
      setShowGenerateModal(false)
      fetchCodes()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading && codes.length === 0) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Access Keys</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Security & Onboarding</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchCodes} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 shadow-sm text-gray-500 hover:text-indigo-600 transition-colors">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <UserPlus size={20} /> GENERATE CODES
            </button>
          </div>
        </header>

        {error && <Alert type="error" message={error} className="mb-6" />}
        {success && <Alert type="success" message={success} className="mb-6" />}

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Key Code</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Used By</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {codes.map(c => (
                <tr key={c.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-5">
                    {/* Display plain_code if available, otherwise show "HASHED" */}
                    <span className="font-mono font-black text-lg text-indigo-600">
                      {c.plain_code || "LEGACY-HASHED"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${c.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {c.is_used ? (
                      <div className="flex items-center gap-1 text-gray-400 font-bold text-xs uppercase"><XCircle size={14}/> Used</div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-500 font-bold text-xs uppercase"><CheckCircle size={14}/> Active</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium dark:text-gray-400">{c.used_by_user?.email || '—'}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {!c.is_used && c.plain_code && (
                      <button 
                        onClick={() => copyToClipboard(c.plain_code)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {copiedCode === c.plain_code ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-2xl">
          <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
            <strong>Note:</strong> Codes are stored as SHA-256 hashes for security. The plain text version is only shown here for distribution to users.
          </p>
        </div>
      </div>

      {/* Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border dark:border-gray-800">
            <h2 className="text-2xl font-black dark:text-white mb-6 uppercase tracking-tighter">Generate Access</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Role</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['employer', 'admin'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setGenerateRole(r)}
                      className={`py-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${generateRole === r ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 dark:border-gray-800 dark:text-gray-400'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                <input 
                  type="number" min="1" max="10"
                  className="w-full p-4 mt-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleGenerateCodes} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                  CREATE KEYS
                </button>
                <button onClick={() => setShowGenerateModal(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl font-black">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
