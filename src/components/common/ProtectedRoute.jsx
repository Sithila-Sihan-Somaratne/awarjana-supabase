// src/components/ProtectedRoute.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export function ProtectedRoute({ children, requiredRole }) {
  const navigate = useNavigate()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        if (!user) {
          navigate('/login')
          return
        }

        // Check email verification in our database
        const { data: userData } = await supabase
          .from('users')
          .select('email_verified, role')
          .eq('id', user.id)
          .maybeSingle()

        if (userData && !userData.email_verified) {
          navigate('/verify-email')
          return
        }

        // Check role if required
        if (requiredRole && userData?.role !== requiredRole) {
          navigate('/unauthorized')
          return
        }
      }
    }

    checkAccess()
  }, [user, userRole, loading, navigate, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return children
}