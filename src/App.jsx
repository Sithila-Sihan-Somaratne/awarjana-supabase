import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import EmailVerification from './pages/EmailVerification'
import Unauthorized from './pages/Unauthorized'

// Dashboard Components
import MainDashboard from './pages/dashboard/MainDashboard'
import CustomerDashboard from './pages/dashboard/CustomerDashboard'
import WorkerDashboard from './pages/dashboard/WorkerDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'

// Order Management
import NewOrder from './pages/orders/NewOrder'
import OrderDetails from './pages/orders/OrderDetails'
import OrderTracker from './pages/orders/OrderTracker'

// Worker Components
import JobCards from './pages/worker/JobCards'
import MaterialUsage from './pages/worker/MaterialUsage'
import SubmitDraft from './pages/worker/SubmitDraft'

// Admin Components
import InventoryManagement from './pages/admin/InventoryManagement'
import RegistrationCodes from './pages/admin/RegistrationCodes'
import AnalyticsReports from './pages/admin/AnalyticsReports'
import UserManagement from './pages/admin/UserManagement'

// Profile
import Profile from './pages/Profile'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={
            <ProtectedRoute>
              <ResetPassword />
            </ProtectedRoute>
          } />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Main Dashboard Route - Role-based redirection */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          } />
          
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
          <Route path="/orders/:id" element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          } />
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
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App;