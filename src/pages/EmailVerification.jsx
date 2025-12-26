// src/pages/VerifyEmail.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Alert } from '../components/Alert'
import { Mail, Loader, Key, RefreshCw } from 'lucide-react'
import { getTestOTPs, clearTestOTPs } from '../lib/email'

export function EmailVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    user, 
    emailVerified, 
    pendingVerification, 
    verifySignupOTP,
    resendSignupOTP,
    refreshUserData 
  } = useAuth()
  
  const [otp, setOtp] = useState('')
  const [showTestOTPs, setShowTestOTPs] = useState(false)
  const [testOtps, setTestOtps] = useState([])
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)

  const emailToVerify = pendingVerification?.email || user?.email || 
    (location.state?.email || '')

  // Auto-redirect if already verified
  useEffect(() => {
    if (user && emailVerified) {
      // Redirect to appropriate dashboard based on role
      navigate('/dashboard')
    }
  }, [user, emailVerified, navigate])

  // Load test OTPs in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTestOtps(getTestOTPs())
    }
  }, [])

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Please enter a valid verification code (at least 6 digits)' 
      })
      return
    }

    setVerifying(true)
    setAlertMessage(null)

    const validatedCodeId = pendingVerification?.validatedCodeId
    const result = await verifySignupOTP(emailToVerify, otp, validatedCodeId)
    
    if (result.success) {
      setAlertMessage({
        type: 'success',
        message: 'Email verified successfully! Redirecting...'
      })
      // Force refresh user data
      await refreshUserData?.()
      // Small delay for state update
      setTimeout(() => navigate('/dashboard'), 1500)
    } else {
      setAlertMessage({ 
        type: 'error', 
        message: result.error || 'Failed to verify email' 
      })
    }
    
    setVerifying(false)
  }

  const handleResendOTP = async () => {
    setResending(true)
    setAlertMessage(null)

    const result = await resendSignupOTP(emailToVerify)
    
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

  const handleOtpChange = (value) => {
    const digits = value.replace(/[^0-9]/g, '')
    setOtp(digits)
  }

  const refreshTestOTPs = () => {
    setTestOtps(getTestOTPs())
  }

  const clearTestOTPsHandler = () => {
    clearTestOTPs()
    setTestOtps([])
  }

  const useTestOTP = (testOtp) => {
    setOtp(testOtp.otp)
    setAlertMessage({
      type: 'info',
      message: `Using test OTP for ${testOtp.email}`
    })
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-primary mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-400 mb-6">
            Enter the verification code sent to{' '}
            <span className="font-medium text-white">{emailToVerify}</span>
          </p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="Enter 6-digit code"
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

            <button
              onClick={handleVerifyOTP}
              disabled={verifying || otp.length < 6}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>

            <div className="text-center pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResendOTP}
                disabled={resending}
                className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
              >
                {resending ? 'Resending...' : 'Resend verification code'}
              </button>
            </div>

            {/* Development-only Test OTP Section */}
            {process.env.NODE_ENV === 'development' && testOtps.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">
                    Development Test OTPs
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={refreshTestOTPs}
                      className="text-xs text-gray-400 hover:text-white"
                      title="Refresh"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => setShowTestOTPs(!showTestOTPs)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {showTestOTPs ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                
                {showTestOTPs && (
                  <div className="space-y-3">
                    {testOtps.map((testOtp, index) => (
                      <div 
                        key={index} 
                        className="p-3 bg-gray-900 rounded border border-gray-700"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-gray-400">{testOtp.email}</p>
                            <p className="text-sm font-mono">{testOtp.otp}</p>
                            <p className="text-xs text-gray-500">{testOtp.role}</p>
                          </div>
                          <button
                            onClick={() => useTestOTP(testOtp)}
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                          >
                            Use This
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={clearTestOTPsHandler}
                      className="w-full text-xs text-red-400 hover:text-red-300 py-1"
                    >
                      Clear All Test OTPs
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}export default EmailVerification
