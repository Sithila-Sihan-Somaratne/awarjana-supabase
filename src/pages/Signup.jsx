// src/pages/Signup.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Alert } from '../components/common/Alert'
import { Mail, Lock, Loader, Key, ArrowLeft, Eye, EyeOff } from 'lucide-react'
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

  const getPasswordStrengthScore = (password) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[!@#$%^&*]/.test(password)) score++
    return score
  }

  const getPasswordStrengthColor = (score) => {
    if (score === 0) return 'bg-gray-700'
    if (score <= 2) return 'bg-red-500'
    if (score <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
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
    if (!otp || otp.length < 6) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid verification code (at least 6 digits)' })
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

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {step === 'signup' ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="text-gray-400 mb-8">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="customer">Customer</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(role === 'worker' || role === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Code
                  </label>
                  <input
                    type="text"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    placeholder="Enter registration code"
                    required
                    className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ask your admin for the registration code
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter a strong password"
                    required
                    className="w-full pl-10 pr-10 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {password && (
                  <div className="mt-3 space-y-1">
                    {/* Password strength meter */}
                    <div className="mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div 
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              getPasswordStrengthScore(password) >= i 
                                ? getPasswordStrengthColor(getPasswordStrengthScore(password))
                                : 'bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Password requirements */}
                    <div className="text-xs font-medium text-gray-400 mb-1">Password must have:</div>
                    <div className={`text-xs ${password.length >= 8 ? 'text-success' : 'text-gray-500'}`}>
                      ✓ At least 8 characters
                    </div>
                    <div className={`text-xs ${/[A-Z]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                      ✓ One uppercase letter (A-Z)
                    </div>
                    <div className={`text-xs ${/[a-z]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                      ✓ One lowercase letter (a-z)
                    </div>
                    <div className={`text-xs ${/[0-9]/.test(password) ? 'text-success' : 'text-gray-500'}`}>
                      ✓ One number (0-9)
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
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full pl-10 pr-10 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-error mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Continue to Verification'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Key className="text-primary" size={32} />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Check Your Email
                </h2>
                <p className="text-gray-400">
                  Enter the verification code sent to <span className="font-medium text-white">
                    {signupData?.email || pendingVerification?.email || email}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Check your email for the verification code from Supabase
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="Enter verification code"
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono bg-dark border-2 border-gray-700 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Enter digits only (0-9)
                  </p>
                  <p className="text-xs text-gray-500">
                    {otp.length} digits
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={verifying || otp.length < 6}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Account'
                  )}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-2">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resending}
                  className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                >
                  {resending ? 'Resending...' : 'Resend verification code'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  It may take a minute to arrive. Check your spam folder.
                </p>
              </div>
            </div>
          )}

          {step === 'signup' && (
            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}