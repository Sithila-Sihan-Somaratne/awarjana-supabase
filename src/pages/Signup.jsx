// src/pages/Signup.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Alert from '../components/common/Alert'
import { Mail, Lock, Loader, Key, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function Signup() {
  const navigate = useNavigate()
  const { requestSignupOTP, verifySignupOTP, resendSignupOTP, pendingVerification } = useAuth()
  
  const [step, setStep] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState('customer')
  const [registrationCode, setRegistrationCode] = useState('')
  
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })
  
  const [signupData, setSignupData] = useState(null)

  const handlePasswordChange = (value) => {
    setPassword(value)
    setPasswordStrength(validatePassword(value))
  }

  const handleSignupSubmit = async (e) => {
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

    if ((role === 'worker' || role === 'admin') && !registrationCode) {
      setAlertMessage({ type: 'error', message: `Registration code required for ${role}` })
      return
    }

    setLoading(true)

    const result = await requestSignupOTP(
      email, 
      password, 
      role, 
      role !== 'customer' ? registrationCode : null
    )
    
    if (result.success) {
      setSignupData({ 
        email, 
        role,
        validatedCodeId: result.validatedCodeId 
      })
      setStep('verify')
      setAlertMessage({
        type: 'success',
        message: result.message || 'Verification code sent! Please check your email.'
      })
    } else {
      setAlertMessage({ 
        type: 'error', 
        message: result.error || 'Failed to send verification code' 
      })
    }
    
    setLoading(false)
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 8) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid verification code (at least 8 digits)' })
      return
    }

    setVerifying(true)
    setAlertMessage(null)

    const emailToVerify = signupData?.email || pendingVerification?.email || email
    const validatedCodeId = signupData?.validatedCodeId || pendingVerification?.validatedCodeId
    
    const result = await verifySignupOTP(emailToVerify, otp, validatedCodeId)
    
    if (result.success) {
      setAlertMessage({
        type: 'success',
        message: result.message || 'Account verified successfully!'
      })
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } else {
      setAlertMessage({ 
        type: 'error', 
        message: result.error || 'Failed to verify account' 
      })
    }
    
    setVerifying(false)
  }

  const handleResendOTP = async () => {
    setResending(true)
    setAlertMessage(null)

    const emailToResend = signupData?.email || pendingVerification?.email || email
    const result = await resendSignupOTP(emailToResend)
    
    if (result.success) {
      setAlertMessage({
        type: 'info',
        message: result.message || 'New verification code sent!'
      })
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    
    setResending(false)
  }

  const handleOtpChange = (value) => {
    const digits = value.replace(/[^0-9]/g, '')
    setOtp(digits)
  }

  const handleBackToSignup = () => {
    setStep('signup')
    setOtp('')
    setAlertMessage(null)
  }

  const requirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'signup' ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {step === 'signup' ? 'Join Awarjana Creations' : 'Enter verification code'}
          </p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          {step === 'signup' ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400 dark:text-gray-500" size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="customer">Customer</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(role === 'worker' || role === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Code
                  </label>
                  <input
                    type="text"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    placeholder="Enter registration code"
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ask your admin for the registration code
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
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
                    placeholder="Confirm your password"
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
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : 'Create Account'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={handleBackToSignup}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ArrowLeft size={16} /> Back to signup
              </button>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="text-gray-400 dark:text-gray-500" size={18} />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="Enter 8-digit code"
                    maxLength={8}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-center text-2xl tracking-widest font-bold"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={verifying || otp.length < 8}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? <Loader size={18} className="animate-spin" /> : 'Verify Account'}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={resending}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : "Didn't receive a code? Resend"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
