import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Alert from '../components/common/Alert';
import { Mail, Loader, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);

    try {
      // This triggers the Supabase Reset Password Email template 
      // where you put: "Your verification code is: {{ .Token }}"
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      // Store the email so the next page knows who to verify
      localStorage.setItem('reset_email', email);
      
      // Move directly to the entry page for the 8-digit code
      navigate('/reset-password');
    } catch (err) {
      setAlertMessage({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 border dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to receive an 8-digit verification code.
          </p>
        </div>

        {alertMessage && (
          <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
        )}

        <form onSubmit={handleSendOTP} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            Send Reset Code
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm font-bold text-blue-600 hover:underline flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}