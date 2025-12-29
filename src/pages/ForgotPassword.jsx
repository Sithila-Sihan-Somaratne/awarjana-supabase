import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Alert from '../components/common/Alert'
import { Mail, Lock, Loader, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)
  const [step, setStep] = useState('request') // 'request', 'reset', 'success'
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAlertMessage(null)

    const result = await forgotPassword(email)
    
    if (result.success) {
      setAlertMessage({ type: 'success', message: 'Reset code sent to your email!' })
      setStep('reset')
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    setLoading(false)
  }

  const handlePasswordChange = (value) => {
    setNewPassword(value)
    const validation = validatePassword(value)
    setPasswordStrength(validation)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAlertMessage(null)

    if (!passwordStrength.valid) {
      setAlertMessage({ type: 'error', message: passwordStrength.errors[0] })
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setAlertMessage({ type: 'error', message: 'Passwords do not match' })
      setLoading(false)
      return
    }

    // In Supabase, we use verifyOtp with type 'recovery' then update password
    // But since we want a unified flow, we'll use the resetPassword from context
    // which calls updateUser. Note: updateUser requires an active session.
    // verifyOtp for recovery creates a session.
    
    const { supabase } = await import('../lib/supabase')
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: otp,
      type: 'recovery'
    })

    if (verifyError) {
      setAlertMessage({ type: 'error', message: verifyError.message })
      setLoading(false)
      return
    }

    const result = await resetPassword(newPassword)
    
    if (result.success) {
      setStep('success')
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          {step !== 'success' && (
            <Link to="/login" className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline mb-6">
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          )}

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'request' ? 'Forgot Password?' : step === 'reset' ? 'Reset Password' : 'Success!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {step === 'request' && "Enter your email address and we'll send you a reset code."}
            {step === 'reset' && `Enter the code sent to ${email} and your new password.`}
            {step === 'success' && "Your password has been updated successfully."}
          </p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                {loading ? <Loader size={18} className="animate-spin" /> : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reset Code (OTP)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 8-digit code"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    {passwordStrength.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-500">❌ {err}</p>
                    ))}
                    {passwordStrength.valid && <p className="text-xs text-green-500">✅ Password is strong</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || !passwordStrength.valid} className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                {loading ? <Loader size={18} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">You can now log in with your new password.</p>
              <Link to="/login" className="w-full btn-primary block text-center">Go to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}