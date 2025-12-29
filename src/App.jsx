// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import GlobalThemeToggle from './components/GlobalThemeToggle';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';

// Dashboard Components
import MainDashboard from './pages/dashboard/MainDashboard';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import WorkerDashboard from './pages/dashboard/WorkerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

// Order Management
import NewOrder from './pages/orders/NewOrder';
import OrderDetails from './pages/orders/OrderDetails';
import OrderTracker from './pages/orders/OrderTracker';

// Worker Components
import JobCards from './pages/worker/JobCards';
import MaterialUsage from './pages/worker/MaterialUsage';
import SubmitDraft from './pages/worker/SubmitDraft';

// Admin Components
import InventoryManagement from './pages/admin/InventoryManagement';
import RegistrationCodes from './pages/admin/RegistrationCodes';
import AnalyticsReports from './pages/admin/AnalyticsReports';
import UserManagement from './pages/admin/UserManagement';

// Profile
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Main Layout
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
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary-500">
                Awarjana Creations
              </h1>
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:inline">
                {userRole ? `(${userRole.charAt(0).toUpperCase() + userRole.slice(1)})` : ''}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </div>
              
              {/* Logout Button */}
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

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="relative min-h-screen">
            <Routes>
              {/* Public Routes (No Header) */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Protected Routes with Layout */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                {/* Main Dashboard Route */}
                <Route path="/dashboard" element={<MainDashboard />} />
                
                {/* Customer Routes */}
                <Route path="/dashboard/customer" element={
                  <ProtectedRoute requiredRole="customer">
                    <CustomerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/orders/new" element={
                  <ProtectedRoute requiredRole="customer">
                    <NewOrder />
                  </ProtectedRoute>
                } />
                <Route path="/orders/:id" element={<OrderDetails />} />
                <Route path="/orders/track" element={
                  <ProtectedRoute requiredRole="customer">
                    <OrderTracker />
                  </ProtectedRoute>
                } />
                
                {/* Worker Routes */}
                <Route path="/dashboard/worker" element={
                  <ProtectedRoute requiredRole="worker">
                    <WorkerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/worker/job-cards" element={
                  <ProtectedRoute requiredRole="worker">
                    <JobCards />
                  </ProtectedRoute>
                } />
                <Route path="/worker/material-usage" element={
                  <ProtectedRoute requiredRole="worker">
                    <MaterialUsage />
                  </ProtectedRoute>
                } />
                <Route path="/worker/drafts/submit/:orderId" element={
                  <ProtectedRoute requiredRole="worker">
                    <SubmitDraft />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/inventory" element={
                  <ProtectedRoute requiredRole="admin">
                    <InventoryManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/codes" element={
                  <ProtectedRoute requiredRole="admin">
                    <RegistrationCodes />
                  </ProtectedRoute>
                } />
                <Route path="/admin/analytics" element={
                  <ProtectedRoute requiredRole="admin">
                    <AnalyticsReports />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole="admin">
                    <UserManagement />
                  </ProtectedRoute>
                } />
                
                {/* Common Routes */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            {/* Global Floating Theme Toggle */}
            <GlobalThemeToggle />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
