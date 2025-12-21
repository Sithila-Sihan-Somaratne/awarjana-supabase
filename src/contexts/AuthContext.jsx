import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sha256, generateResetToken, validatePassword } from '../lib/crypto'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Fetch user role from database
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.error('Error fetching user role:', error)
          } else {
            setUserRole(data?.role || 'customer')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          // Fetch user role
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
      subscription?.unsubscribe()
    }
  }, [])

  /**
   * Validate registration code against database
   */
  const validateRegistrationCode = async (code, role) => {
    try {
      // Hash the code
      const hashedCode = await sha256(code)

      // Find code in database
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('code', hashedCode)
        .eq('role', role)
        .single()

      if (error || !data) {
        return { valid: false, message: 'Invalid registration code' }
      }

      // Check if code has usage left
      if (data.times_used >= data.max_uses) {
        return { valid: false, message: 'Registration code limit reached' }
      }

      return { valid: true, codeId: data.id }
    } catch (err) {
      console.error('Code validation error:', err)
      return { valid: false, message: 'Error validating code' }
    }
  }

  /**
   * Increment code usage count
   */
  const incrementCodeUsage = async (codeId, userId) => {
    try {
      // Get current usage
      const { data: codeData } = await supabase
        .from('registration_codes')
        .select('times_used')
        .eq('id', codeId)
        .single()

      // Update usage count
      await supabase
        .from('registration_codes')
        .update({ times_used: (codeData?.times_used || 0) + 1 })
        .eq('id', codeId)

      // Log the usage
      await supabase
        .from('code_usage_logs')
        .insert([
          {
            code_id: codeId,
            user_id: userId,
            role: null, // Will be set by trigger if needed
            ip_address: null // Could be added if needed
          }
        ])
    } catch (err) {
      console.error('Error incrementing code usage:', err)
    }
  }

  const signup = async (email, password, role = 'customer', registrationCode = null) => {
    try {
      setError(null)

      // Validate password strength
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0])
      }

      // If worker or admin, validate registration code
      if ((role === 'worker' || role === 'admin') && !registrationCode) {
        throw new Error('Registration code required for ' + role)
      }

      if ((role === 'worker' || role === 'admin')) {
        const codeValidation = await validateRegistrationCode(registrationCode, role)
        if (!codeValidation.valid) {
          throw new Error(codeValidation.message)
        }
        var validatedCodeId = codeValidation.codeId
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (authError) throw authError

      // Create user record in database
      const { error: dbError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            role,
            created_at: new Date().toISOString(),
          }
        ])

      if (dbError) throw dbError

      // Increment code usage if applicable
      if (validatedCodeId) {
        await incrementCodeUsage(validatedCodeId, authData.user.id)
      }

      return { success: true, user: authData.user }
    } catch (err) {
      setError(err.message)
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

  /**
   * Send password reset email
   */
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

  /**
   * Reset password with token
   */
  const resetPassword = async (newPassword) => {
    try {
      setError(null)

      // Validate new password
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0])
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      // Log password change
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

  /**
   * Update user password (when logged in)
   */
  const changePassword = async (oldPassword, newPassword) => {
    try {
      setError(null)

      // Validate new password
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0])
      }

      // Verify old password by attempting login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })

      if (loginError) {
        throw new Error('Current password is incorrect')
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      // Log password change
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
    signup,
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
