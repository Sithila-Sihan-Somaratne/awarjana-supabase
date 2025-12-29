// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Alert from '../components/common/Alert'
import { Lock, Loader, CheckCircle, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { resetPassword, user } = useAuth()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
    setPasswordStrength(validatePassword(value))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlertMessage(null)

    if (!passwordStrength.valid) {
      setAlertMessage({ 
        type: 'error', 
        message: passwordStrength.errors[0] || 'Please fix password errors'
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
      setAlertMessage({ type: 'success', message: result.message || 'Password reset successfully!' })
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setAlertMessage({ type: 'error', message: result.error || 'Failed to reset password' })
    }
    
    setLoading(false)
  }

  const requirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ]

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8 transition-colors duration-200">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600 dark:text-green-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Create a new password for your account</p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400 dark:text-gray-500" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter a strong password"
                  required
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 gap-1">
                    {requirements.map((req, i) => {
                      const isMet = req.test(password)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {isMet ? (
                            <Check size={12} className="text-green-500" />
                          ) : (
                            <X size={12} className="text-red-500" />
                          )}
                          <span className={isMet ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400 dark:text-gray-500" size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
                  <X size={14} />
                  <p className="text-xs font-medium tracking-wide">Passwords do not match</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordStrength.valid}
              className="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
