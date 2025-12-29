import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Alert from '../components/common/Alert';
import { Lock, Loader, Eye, EyeOff, Check, X, Hash, ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('reset_email');
    if (!storedEmail) navigate('/forgot-password');
    else setEmail(storedEmail);
  }, [navigate]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);
    
    // Verifying the 8-digit token from your email
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery' // This MUST be 'recovery' for forgot password flow
    });

    if (error) {
      setAlertMessage({ type: 'error', message: 'Invalid or expired code. Please check your email.' });
    } else {
      setIsVerified(true);
      setAlertMessage({ type: 'success', message: 'Identity verified! Set your new password.' });
    }
    setLoading(false);
  };

  const handleFinalReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setAlertMessage({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    // After verifyOtp, the user has a temporary session to update their password
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setAlertMessage({ type: 'error', message: error.message });
    } else {
      setAlertMessage({ type: 'success', message: 'Password updated! Redirecting to login...' });
      localStorage.removeItem('reset_email');
      setTimeout(() => navigate('/login'), 2500);
    }
    setLoading(false);
  };

  const requirements = [
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { label: 'Number', test: (p) => /[0-9]/.test(p) },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border dark:border-gray-700">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Reset Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isVerified ? "Create a secure new password" : `Enter the 8-digit code sent to ${email}`}
          </p>
        </div>
        
        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} />}

        {!isVerified ? (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                placeholder="Enter 8-digit code"
                maxLength={8}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl dark:text-white text-center tracking-[0.3em] font-mono text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || otp.length < 8} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              Verify Identity
            </button>
          </form>
        ) : (
          <form onSubmit={handleFinalReset} className="space-y-5 mt-4">
            <div>
              <label className="block text-sm font-semibold dark:text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {requirements.map((req, i) => (
                  <div key={i} className={`flex items-center text-[11px] font-bold ${req.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                    {req.test(password) ? <Check size={12} className="mr-1"/> : <X size={12} className="mr-1"/>} {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !requirements.every(r => r.test(password))} 
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20"
            >
              {loading ? <Loader className="animate-spin mx-auto" size={18} /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}