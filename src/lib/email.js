// src/lib/email.js
import { supabase } from './supabase'
import { EMAIL_CONFIG, isLikelySlowEmailPeriod } from '../config/email'

/**
 * Send OTP email for signup verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} role - User role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendOTPEmail = async (email, otp, role = 'customer') => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending OTP ${otp} to ${email} (Role: ${role})`)
    
    // In production, implement your email service here:
    
    // Option 1: Using Supabase Edge Functions
    // const { error } = await supabase.functions.invoke('send-otp-email', {
    //   body: { email, otp, role }
    // })
    
    // Option 2: Using your own email service (Resend, SendGrid, etc.)
    // const response = await fetch('/api/send-otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, otp, role })
    // })
    
    // Option 3: Using Supabase email templates (if configured)
    // const { error } = await supabase.auth.resend({
    //   type: 'signup',
    //   email: email,
    //   options: {
    //     emailRedirectTo: `${window.location.origin}/verify-otp?otp=${otp}`
    //   }
    // })
    
    // For now, we'll simulate email sending
    await simulateEmailSending(email, otp, role)
    
    return { success: true }
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Failed to send email:', err)
    return { 
      success: false, 
      error: err.message || EMAIL_CONFIG.MESSAGES.EMAIL_FAILED 
    }
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending password reset to ${email}`)
    
    // Use Supabase built-in password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Failed to send reset email:', err)
    return { 
      success: false, 
      error: err.message || EMAIL_CONFIG.MESSAGES.EMAIL_FAILED 
    }
  }
}

/**
 * Send welcome email after successful verification
 * @param {string} email - Recipient email
 * @param {string} role - User role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendWelcomeEmail = async (email, role) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending welcome email to ${email} (Role: ${role})`)
    
    // Implement your welcome email logic here
    
    return { success: true }
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Failed to send welcome email:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Simulate email sending for testing
 */
export const simulateEmailSending = async (email, otp, role) => {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    const delay = isLikelySlowEmailPeriod() ? 3000 : 1000
    console.log(`⏳ [EMAIL SIMULATION] Simulating ${delay}ms delay...`)
    
    setTimeout(() => {
      console.log(`✅ [EMAIL SIMULATION] Email "sent" to ${email}`)
      console.log(`📝 [EMAIL SIMULATION] OTP: ${otp}`)
      console.log(`👤 [EMAIL SIMULATION] Role: ${role}`)
      console.log('📧 [EMAIL SIMULATION] Email content would be sent here')
      
      // For testing, you could save this to a local file or database
      saveOTPForTesting(email, otp, role)
      
      resolve()
    }, delay)
  })
}

/**
 * Save OTP for testing purposes
 */
export const saveOTPForTesting = (email, otp, role) => {
  // Save to localStorage for easy access during development
  const testOTPs = JSON.parse(localStorage.getItem('testOTPs') || '[]')
  testOTPs.unshift({
    email,
    otp,
    role,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + EMAIL_CONFIG.OTP_EXPIRY).toISOString()
  })
  
  // Keep only last 20 OTPs (increased from 10 for better testing)
  const trimmedOTPs = testOTPs.slice(0, 20)
  localStorage.setItem('testOTPs', JSON.stringify(trimmedOTPs))
  
  // Also log to console in a structured way
  console.group('📧 TEST OTP GENERATED')
  console.log('Email:', email)
  console.log('OTP:', otp)
  console.log('Role:', role)
  console.log('Expires:', new Date(Date.now() + EMAIL_CONFIG.OTP_EXPIRY).toLocaleString())
  console.log('Total Test OTPs:', trimmedOTPs.length)
  console.groupEnd()
}

/**
 * Get test OTPs from localStorage
 */
export const getTestOTPs = () => {
  try {
    const otps = JSON.parse(localStorage.getItem('testOTPs') || '[]')
    // Filter out expired OTPs
    const validOTPs = otps.filter(otp => new Date(otp.expires) > new Date())
    
    // Update storage if some were expired
    if (validOTPs.length !== otps.length) {
      localStorage.setItem('testOTPs', JSON.stringify(validOTPs))
    }
    
    return validOTPs
  } catch {
    return []
  }
}

/**
 * Clear test OTPs
 */
export const clearTestOTPs = () => {
  localStorage.removeItem('testOTPs')
  console.log('🧹 All test OTPs cleared from localStorage')
}

/**
 * Generate a test OTP for development
 */
export const generateTestOTP = (length = 8) => {
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10)
  }
  return otp
}

/**
 * Manual OTP injection for testing (bypasses email sending)
 */
export const injectTestOTP = async (email, role = 'customer') => {
  try {
    const otp = generateTestOTP()
    console.log(`🧪 [TEST] Injecting OTP ${otp} for ${email}`)
    
    await simulateEmailSending(email, otp, role)
    
    return { 
      success: true, 
      otp,
      message: `Test OTP ${otp} injected for ${email}`
    }
  } catch (err) {
    console.error('Test OTP injection failed:', err)
    return { success: false, error: err.message }
  }
}