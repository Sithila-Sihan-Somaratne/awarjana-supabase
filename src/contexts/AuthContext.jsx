// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sha256, validatePassword } from '../lib/crypto'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.error('Error fetching user role:', error)
            setUserRole('customer')
          } else {
            setUserRole(data?.role || 'customer')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          setUserRole(data?.role || 'customer')
        } else {
          setUser(null)
          setUserRole(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const validateRegistrationCode = async (code, role) => {
    try {
      console.log('🔐 [Code Validation] Starting for role:', role)
      
      if (!code || !role) {
        console.log('❌ [Code Validation] Missing code or role')
        return { valid: false, message: 'Code and role are required' }
      }

      const hashedCode = await sha256(code)
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('code', hashedCode)
        .eq('role', role)
        .maybeSingle()

      if (error) {
        console.error('❌ [Code Validation] Database error:', error)
        return { valid: false, message: 'Database error during validation' }
      }

      if (!data) {
        console.log('❌ [Code Validation] No matching code found')
        return { valid: false, message: 'Invalid registration code or role mismatch' }
      }

      if (data.is_used) {
        console.log('⚠️ [Code Validation] Code already used')
        return { valid: false, message: 'Registration code has already been used' }
      }

      console.log('✅ [Code Validation] Code is valid! ID:', data.id)
      return { valid: true, codeId: data.id }
    } catch (err) {
      console.error('💥 [Code Validation] Unexpected error:', err)
      return { valid: false, message: 'Error validating code' }
    }
  }

  const incrementCodeUsage = async (codeId, userId) => {
    try {
      console.log('🔄 [Code Usage] Marking code as used:', { codeId, userId })
      
      const { error: updateError } = await supabase
        .from('registration_codes')
        .update({ 
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('id', codeId)

      if (updateError) {
        console.error('❌ [Code Usage] Error updating:', updateError)
      } else {
        console.log('✅ [Code Usage] Successfully marked as used')
      }
    } catch (err) {
      console.error('💥 [Code Usage] Unexpected error:', err)
    }
  }

  const requestSignupOTP = async (email, password, role = 'customer', registrationCode = null) => {
    console.log('🚀 [Request Signup OTP] Starting for:', { email, role })
    
    try {
      setError(null)

      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        console.log('❌ [Request Signup OTP] Password validation failed:', passwordValidation.errors[0])
        throw new Error(passwordValidation.errors[0])
      }

      if ((role === 'worker' || role === 'admin') && !registrationCode) {
        const msg = `Registration code required for ${role}`
        console.log('❌ [Request Signup OTP]', msg)
        throw new Error(msg)
      }

      let validatedCodeId = null
      if ((role === 'worker' || role === 'admin')) {
        console.log('🔐 [Request Signup OTP] Validating registration code...')
        const codeValidation = await validateRegistrationCode(registrationCode, role)
        
        console.log('📋 [Request Signup OTP] Code validation result:', codeValidation)
        
        if (!codeValidation.valid) {
          throw new Error(codeValidation.message)
        }
        validatedCodeId = codeValidation.codeId
        console.log('✅ [Request Signup OTP] Code validated, ID:', validatedCodeId)
      }

      console.log('📧 [Request Signup OTP] Sending OTP email...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role, tempCodeId: validatedCodeId }
        }
      })

      if (authError) {
        console.error('❌ [Request Signup OTP] Auth error:', authError)
        throw authError
      }

      console.log('✅ [Request Signup OTP] OTP email sent to:', email)
      
      return { 
        success: true, 
        user: authData.user,
        validatedCodeId: validatedCodeId,
        message: 'Verification code sent to your email'
      }
    } catch (err) {
      console.error('💥 [Request Signup OTP] FAILED:', err.message)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const verifySignupOTP = async (email, otp, validatedCodeId) => {
    console.log('🔐 [Verify OTP] Verifying OTP for:', email)
    
    try {
      // 🚨 CRITICAL FIX: Changed from verifyOTP to verifyOtp
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'signup'
      })

      if (error) {
        console.error('❌ [Verify OTP] Verification failed:', error)
        throw new Error('Invalid or expired verification code')
      }

      console.log('✅ [Verify OTP] OTP verified successfully')
      
      if (validatedCodeId) {
        console.log('🔄 [Verify OTP] Marking registration code as used...')
        await incrementCodeUsage(validatedCodeId, data.user.id)
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })

      console.log('🎉 [Verify OTP] Registration completed successfully!')
      
      return { 
        success: true, 
        user: data.user,
        session: data.session,
        message: 'Account verified successfully!'
      }
    } catch (err) {
      console.error('💥 [Verify OTP] FAILED:', err.message)
      return { success: false, error: err.message }
    }
  }

  const resendSignupOTP = async (email) => {
    console.log('🔄 [Resend OTP] Resending OTP to:', email)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        console.error('❌ [Resend OTP] Failed:', error)
        throw error
      }

      console.log('✅ [Resend OTP] New OTP sent')
      return { success: true, message: 'New verification code sent!' }
    } catch (err) {
      console.error('💥 [Resend OTP] FAILED:', err.message)
      return { success: false, error: err.message }
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setUserRole(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const forgotPassword = async (email) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      return { success: true, message: 'Password reset email sent. Check your inbox.' }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const resetPassword = async (newPassword) => {
    try {
      setError(null)
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0])
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      if (user) {
        await supabase
          .from('users')
          .update({ last_password_change: new Date().toISOString() })
          .eq('id', user.id)
      }

      return { success: true, message: 'Password reset successfully' }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const changePassword = async (oldPassword, newPassword) => {
    try {
      setError(null)
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0])
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })

      if (loginError) {
        throw new Error('Current password is incorrect')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      await supabase
        .from('users')
        .update({ last_password_change: new Date().toISOString() })
        .eq('id', user.id)

      return { success: true, message: 'Password changed successfully' }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const value = {
    user,
    userRole,
    loading,
    error,
    requestSignupOTP,
    verifySignupOTP,
    resendSignupOTP,
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}