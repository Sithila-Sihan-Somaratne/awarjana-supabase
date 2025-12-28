import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Alert } from '../components/common/Alert'
import { Lock, Loader, CheckCircle } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { resetPassword, user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })
  const [success, setSuccess] = useState(false)

  // Check if user is authenticated (should have reset token)
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const handlePasswordChange = (value) => {
    setPassword(value)
    const validation = validatePassword(value)
    setPasswordStrength(validation)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlertMessage(null)

    // Validation
    if (!passwordStrength.valid) {
      setAlertMessage({ 
        type: 'error', 
        message: passwordStrength.errors[0] 
      })
      return
    }

    if (password !== confirmPassword) {
      setAlertMessage({ type: 'error', message: 'Passwords do not match' })
      return
    }

    setLoading(true)

    const result = await resetPassword(password)
    
    if (result.success) {
      setSuccess(true)
      setAlertMessage({ type: 'success', message: result.message })
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Reset Successful</h1>
            <p className="text-gray-400 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-3xl font-bold text-primary mb-2">Reset Password</h1>
          <p className="text-gray-400 mb-8">Create a new password for your account</p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-400">Password Requirements:</div>
                  <div className={`text-xs ${password.length >= 8 ? 'text-success' : 'text-gray-500'}`}>
                    ✓ At least 8 characters
                  </div>
                  <div className={`text-xs ${/[A-Z]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                    ✓ One uppercase letter
                  </div>
                  <div className={`text-xs ${/[a-z]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                    ✓ One lowercase letter
                  </div>
                  <div className={`text-xs ${/[0-9]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                    ✓ One number
                  </div>
                  <div className={`text-xs ${/[!@#$%^&*]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                    ✓ One special character (!@#$%^&*)
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-error mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordStrength.valid}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
