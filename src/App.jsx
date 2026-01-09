// src/App.jsx
// Main Application Component with Routing and Providers

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { GlobalThemeToggle } from './components/GlobalThemeToggle';
import { Link } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';

// Dashboard Components
import MainDashboard from './pages/dashboard/MainDashboard';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import EmployerDashboard from './pages/dashboard/EmployerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

// Order Management
import NewOrder from './pages/orders/NewOrder';
import OrderDetails from './pages/orders/OrderDetails';
import PublicOrderTracker from './pages/orders/PublicOrderTracker';

// Employer Components
import JobCardView from './pages/employer/JobCardView';
import MaterialUsage from './pages/employer/MaterialUsage';
import SubmitDraft from './pages/employer/SubmitDraft';

// Admin Components
import InventoryManagement from './pages/admin/InventoryManagement';
import RegistrationCodes from './pages/admin/RegistrationCodes';
import AnalyticsReports from './pages/admin/AnalyticsReports';
import UserManagement from './pages/admin/UserManagement';

// Profile & Settings
import Profile from './pages/Profile';
import Settings from './pages/Settings';

/**
 * Main Layout Component
 * Handles the persistent header and page padding
 */
function MainLayout() {
  const { user, userRole, logout } = useAuth();
  const location = useLocation();

  // Don't show header on auth pages
  const hideHeader = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  if (hideHeader) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-dark-lighter shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-primary-500">
                  Awarjana Creations
                </h1>
              </Link>

              <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:inline">
                {userRole ? `(${userRole.charAt(0).toUpperCase() + userRole.slice(1)})` : ''}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </div>

              <button
                onClick={logout}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * App Routes Component
 * Defines the routing structure and access control
 */
function AppRoutes() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Session...</p>
        </div>
      </div>
    );
  }

  /**
   * CRITICAL FIX FOR PASSWORD RESET:
   * When a user verifies OTP, Supabase signs them in.
   * We must block the "Auto-redirect to Dashboard" if they are currently on /reset-password,
   * otherwise the ResetPassword component unmounts before it can save the new password.
   */
  const isResetting = location.pathname === '/reset-password';

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated && !isResetting ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated && !isResetting ? <Navigate to="/dashboard" replace /> : <Signup />} 
      />
      
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Reset Password must remain accessible even when 'isAuthenticated' becomes true 
          during the OTP flow.
      */}
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<MainDashboard />} />

        {/* Customer Routes */}
        <Route
          path="/dashboard/customer"
          element={
            <ProtectedRoute requiredRole="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute requiredRole="customer">
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route
          path="/orders/track"
          element={
            <ProtectedRoute requiredRole="customer">
              <PublicOrderTracker />
            </ProtectedRoute>
          }
        />

        {/* Employer Routes */}
        <Route
          path="/dashboard/employer"
          element={
            <ProtectedRoute requiredRole="employer">
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employer/job-cards/:id"
          element={
            <ProtectedRoute requiredRole="employer">
              <JobCardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employer/material-usage"
          element={
            <ProtectedRoute requiredRole="employer">
              <MaterialUsage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employer/submit-draft/:orderId"
          element={
            <ProtectedRoute requiredRole="employer">
              <SubmitDraft />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute requiredRole="admin">
              <InventoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/codes"
          element={
            <ProtectedRoute requiredRole="admin">
              <RegistrationCodes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole="admin">
              <AnalyticsReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Profile & Settings */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

/**
 * Root App Component
 */
function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="relative min-h-screen">
              <AppRoutes />
              <GlobalThemeToggle />
            </div>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;