// src/pages/Signup.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Alert from '../components/common/Alert'
import { Mail, Lock, Loader, Key, ArrowLeft, Eye, EyeOff, Check, X, Phone } from 'lucide-react'
import { validatePassword } from '../lib/crypto'

export default function Signup() {
  const navigate = useNavigate()
  const { requestSignupOTP, verifySignupOTP, validateRegistrationCode, pendingVerification } = useAuth()
  
  const [step, setStep] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState('customer')
  const [registrationCode, setRegistrationCode] = useState('')
  const [verificationMethod, setVerificationMethod] = useState('email')
  
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
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

    setLoading(true)
    let validatedCodeId = null

    if (role === 'employer' || role === 'admin') {
      if (!registrationCode) {
        setAlertMessage({ type: 'error', message: `Registration code required for ${role}` })
        setLoading(false)
        return
      }
      
      const validation = await validateRegistrationCode(registrationCode, role)
      if (!validation.valid) {
        setAlertMessage({ type: 'error', message: validation.message })
        setLoading(false)
        return
      }
      validatedCodeId = validation.codeData.id
    }

    const result = await requestSignupOTP(
      email, 
      password, 
      role, 
      validatedCodeId
    )
    
    if (result.success) {
      setSignupData({ 
        email, 
        role,
        validatedCodeId 
      })
      setStep('verify')
      setAlertMessage({
        type: 'success',
        message: `Verification code sent via ${verificationMethod}! Please check and enter it below.`
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
      setAlertMessage({ type: 'error', message: 'Please enter a valid verification code' })
      return
    }

    setVerifying(true)
    setAlertMessage(null)

    const emailToVerify = signupData?.email || pendingVerification?.email || email
    const validatedCodeId = signupData?.validatedCodeId || pendingVerification?.registrationCodeId
    
    const result = await verifySignupOTP(emailToVerify, otp, validatedCodeId)
    
    if (result.success) {
      setAlertMessage({
        type: 'success',
        message: 'Account verified successfully! Redirecting...'
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
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
    { label: 'Number', test: (p) => /[0-9]/.test(p) },
    { label: 'Special char', test: (p) => /[!@#$%^&*]/.test(p) },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'signup' ? 'Create Account' : 'Verify Identity'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {step === 'signup' ? 'Join Awarjana Creations' : `Enter the code sent to your ${verificationMethod}`}
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
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(role === 'employer' || role === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="text-gray-400 dark:text-gray-500" size={18} />
                    </div>
                    <input
                      type="text"
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value)}
                      placeholder="Enter registration code"
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ask your admin for the registration code
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('email')}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border ${verificationMethod === 'email' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white dark:bg-dark border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                  >
                    <Mail size={18} /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('sms')}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border ${verificationMethod === 'sms' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white dark:bg-dark border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                  >
                    <Phone size={18} /> SMS
                  </button>
                </div>
              </div>

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
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    {requirements.map((req, i) => {
                      const isMet = req.test(password)
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          {isMet ? (
                            <Check size={10} className="text-green-500" />
                          ) : (
                            <X size={10} className="text-red-500" />
                          )}
                          <span className={isMet ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-6 transition-all disabled:opacity-50"
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
                    placeholder="Enter code"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-center text-2xl tracking-widest font-bold"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={verifying || otp.length < 6}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {verifying ? <Loader size={18} className="animate-spin" /> : 'Verify Account'}
              </button>
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
