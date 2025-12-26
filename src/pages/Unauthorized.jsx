// src/pages/Unauthorized.jsx
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
          <Shield className="text-red-500" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-gray-400 mb-8">
          You don't have permission to access this page. 
          This area is restricted to administrators only.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
          >
            <ArrowLeft size={18} />
            Go to Dashboard
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>If you believe this is an error, contact your administrator.</p>
            <p className="mt-1">Error Code: 403 - Forbidden</p>
          </div>
        </div>
      </div>
    </div>
  )
}