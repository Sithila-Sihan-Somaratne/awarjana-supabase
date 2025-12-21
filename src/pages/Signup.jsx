// src/pages/Signup.jsx - TWO-STEP OTP FLOW
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Alert } from '../components/Alert'
import { Mail, Lock, User, Loader, Key, ArrowLeft } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function Signup() {
  const navigate = useNavigate()
  const { requestSignupOTP, verifySignupOTP, resendSignupOTP } = useAuth()
  
  // Step 1: Signup form state
  const [step, setStep] = useState('signup') // 'signup' or 'verify'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [registrationCode, setRegistrationCode] = useState('')
  
  // Step 2: OTP verification state
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })
  
  // Store data between steps
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    role: 'customer',
    registrationCode: null,
    validatedCodeId: null
  })

  const handlePasswordChange = (value) => {
    setPassword(value)
    const validation = validatePassword(value)
    setPasswordStrength(validation)
  }

  // PHASE 1: Handle initial signup and OTP request
  const handleSignupSubmit = async (e) => {
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

    if ((role === 'worker' || role === 'admin') && !registrationCode) {
      setAlertMessage({ type: 'error', message: `Registration code required for ${role}` })
      return
    }

    setLoading(true)

    // Request OTP for signup
    const result = await requestSignupOTP(email, password, role, registrationCode)
    
    if (result.success) {
      // Store data for verification step
      setSignupData({
        email,
        password,
        role,
        registrationCode: (role === 'worker' || role === 'admin') ? registrationCode : null,
        validatedCodeId: result.validatedCodeId || null
      })
      
      // Move to OTP verification step
      setStep('verify')
      setOtpSent(true)
      setAlertMessage({
        type: 'info',
        message: `A 6-digit verification code has been sent to ${email}. Please check your inbox and enter the code below.`
      })
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    
    setLoading(false)
  }

  // PHASE 2: Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid 6-digit code' })
      return
    }

    setVerifying(true)
    setAlertMessage(null)

    const result = await verifySignupOTP(signupData.email, otp, signupData.validatedCodeId)
    
    if (result.success) {
      setAlertMessage({
        type: 'success',
        message: 'Account verified successfully! Redirecting to login...'
      })
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    
    setVerifying(false)
  }

  // Handle OTP resend
  const handleResendOTP = async () => {
    setResending(true)
    setAlertMessage(null)

    const result = await resendSignupOTP(signupData.email)
    
    if (result.success) {
      setAlertMessage({
        type: 'info',
        message: 'New verification code sent! Please check your email.'
      })
    } else {
      setAlertMessage({ type: 'error', message: result.error })
    }
    
    setResending(false)
  }

  // Format OTP input (only numbers, max 6 digits)
  const handleOtpChange = (value) => {
    const numbersOnly = value.replace(/\D/g, '')
    setOtp(numbersOnly.slice(0, 6))
  }

  // Go back to signup form
  const handleBackToSignup = () => {
    setStep('signup')
    setOtp('')
    setAlertMessage(null)
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card">
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
            // STEP 1: SIGNUP FORM
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
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="new-password"
                  />
                </div>
                
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-medium text-gray-400">Password must have:</div>
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
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="new-password"
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
                    Sending verification code...
                  </>
                ) : (
                  'Continue to Verification'
                )}
              </button>
            </form>
          ) : (
            // STEP 2: OTP VERIFICATION
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Key className="text-primary" size={32} />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Enter Verification Code
                </h2>
                <p className="text-gray-400">
                  We sent a 6-digit code to <span className="font-medium text-white">{signupData.email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono bg-dark border-2 border-gray-700 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Enter the code from your email
                  </p>
                  <p className="text-xs text-gray-500">
                    {otp.length}/6 digits
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
                  disabled={verifying || otp.length !== 6}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Complete'
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
                  {resending ? 'Sending new code...' : 'Resend verification code'}
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