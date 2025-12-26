import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../../components/LoadingSpinner'

export function MainDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      if (loading) return
      
      if (!user) {
        navigate('/login', { state: { from: location } })
        return
      }

      // Check email verification
      const { data: userData } = await supabase
        .from('users')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle()

      if (userData && !userData.email_verified) {
        navigate('/verify-email')
        return
      }

      // Redirect based on role
      switch(userRole) {
        case 'admin':
          navigate('/dashboard/admin', { replace: true })
          break
        case 'worker':
          navigate('/dashboard/worker', { replace: true })
          break
        case 'customer':
        default:
          navigate('/dashboard/customer', { replace: true })
      }
    }

    checkAccessAndRedirect()
  }, [user, userRole, loading, navigate, location])

  return <LoadingSpinner />
}