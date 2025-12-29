// src/components/common/ProtectedRoute.jsx
// Protected Route Component with Role and Credit Checking

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function ProtectedRoute({ children, requiredRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        // Check if user is authenticated
        if (!user) {
          console.log('🔒 [PROTECTED ROUTE] No user, redirecting to login');
          navigate('/login', { state: { from: location.pathname } });
          return;
        }

        // Check email verification in our database
        const { data: userData } = await supabase
          .from('users')
          .select('email_verified, role')
          .eq('id', user.id)
          .maybeSingle();

        if (userData && !userData.email_verified) {
          console.log('🔒 [PROTECTED ROUTE] Email not verified, redirecting');
          navigate('/verify-email');
          return;
        }

        // Check role if required
        if (requiredRole && userData?.role !== requiredRole) {
          console.log('🔒 [PROTECTED ROUTE] Role mismatch, redirecting to unauthorized');
          navigate('/unauthorized');
          return;
        }

        console.log('🔓 [PROTECTED ROUTE] Access granted');
      }
    };

    checkAccess();
  }, [user, userRole, loading, navigate, requiredRole, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return children;
}

export default ProtectedRoute;
