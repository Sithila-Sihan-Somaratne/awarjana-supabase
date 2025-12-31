// src/pages/dashboard/MainDashboard.jsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function MainDashboard() {
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

      // Redirect based on user role
      const pathSegments = location.pathname.split('/')
      const requestedDashboard = pathSegments[pathSegments.length - 1]

      // Define which roles can access which dashboards
      const roleAccess = {
        'customer': ['customer'],
        'employer': ['employer'],
        'admin': ['admin']
      }

      // If user is trying to access a dashboard that doesn't match their role
      if (!roleAccess[userRole]?.includes(requestedDashboard)) {
        // Redirect to their role's default dashboard
        navigate(`/dashboard/${userRole}`, { replace: true })
      } else {
        // User is already in correct dashboard
        // Set up real-time subscriptions based on role
        setupRealtimeSubscriptions()
      }
    }

    checkAccessAndRedirect()
  }, [user, userRole, loading, navigate, location])

  const setupRealtimeSubscriptions = () => {
    // Clean up any existing subscriptions
    const cleanup = () => {
      supabase.removeAllChannels()
    }

    // Set up role-specific subscriptions
    if (userRole === 'customer') {
      // Subscribe to order updates
      const ordersChannel = supabase
        .channel('customer-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order update received:', payload)
            // You could dispatch an event or update state here
          }
        )
        .subscribe()
    } else if (userRole === 'employer') {
      // Subscribe to job card updates
      const jobCardsChannel = supabase
        .channel('employer-jobcards')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_cards',
            filter: `employer_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Job card update received:', payload)
          }
        )
        .subscribe()
    } else if (userRole === 'admin') {
      // Admin gets all updates
      const adminChannel = supabase
        .channel('admin-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('Admin order update:', payload)
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            console.log('User update:', payload)
          }
        )
        .subscribe()
    }

    return cleanup
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    </div>
  )
}