import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/common/Alert';
import { Mail, Key, Loader, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  
  const [step, setStep] = useState('request'); // 'request' or 'sent'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);

    console.log("📨 [ForgotPassword] Requesting reset for:", email);
    const result = await forgotPassword(email);

    if (result.success) {
      console.log("✅ [ForgotPassword] Reset email sent successfully");
      setStep('sent');
      setAlertMessage({
        type: 'success',
        message: 'If an account exists, a reset link has been sent to your email.'
      });
    } else {
      console.error("❌ [ForgotPassword] Reset request failed:", result.error);
      setAlertMessage({ type: 'error', message: result.error });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'request' ? 'Reset Password' : 'Check Your Email'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {step === 'request' 
              ? 'Enter your email to receive a password reset link.' 
              : `We've sent a recovery link to ${email}`}
          </p>

          {alertMessage && (
            <Alert 
              type={alertMessage.type} 
              message={alertMessage.message} 
              onClose={() => setAlertMessage(null)} 
            />
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-full">
                  <Key className="text-primary-600 dark:text-primary-400" size={32} />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Click the link in the email to set a new password. If you don't see it, check your spam folder.
              </p>
              <button 
                onClick={() => setStep('request')} 
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium text-sm transition-colors"
              >
                Didn't get the email? Try again
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}