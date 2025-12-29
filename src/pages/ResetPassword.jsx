import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Alert from '../components/common/Alert';
import { Lock, Loader, Check, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';

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

  const requirements = [
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
    { label: 'Number', test: (p) => /[0-9]/.test(p) },
    { label: 'Symbol (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ];

  useEffect(() => {
    const stored = localStorage.getItem('reset_email');
    if (!stored) navigate('/forgot-password');
    else setEmail(stored);
  }, [navigate]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (error) {
      setAlertMessage({ type: 'error', message: 'Invalid 8-digit code.' });
    } else {
      setIsVerified(true);
      setAlertMessage({ type: 'success', message: 'Identity verified. Set your new password.' });
    }
    setLoading(false);
  };

  const handleFinalReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setAlertMessage({ type: 'error', message: 'Passwords do not match' });
    if (!requirements.every(r => r.test(password))) return setAlertMessage({ type: 'error', message: 'Requirements not met' });

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setAlertMessage({ type: 'error', message: error.message });
    } else {
      setAlertMessage({ type: 'success', message: 'Password updated! Redirecting...' });
      localStorage.removeItem('reset_email');
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-2xl border dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold dark:text-white">Secure Reset</h1>
          <p className="text-gray-500 text-sm">{email}</p>
        </div>

        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} />}

        {!isVerified ? (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <input
              type="text" value={otp} maxLength={8}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full py-4 text-center text-3xl font-mono tracking-[0.3em] border-2 rounded-2xl dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:border-blue-500 outline-none"
              placeholder="00000000" required
            />
            <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
              {loading ? <Loader className="animate-spin mx-auto" /> : 'Verify Identity'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFinalReset} className="space-y-4">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="New Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 border rounded-2xl dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" required 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 p-2">
              {requirements.map((req, i) => (
                <div key={i} className={`flex items-center gap-2 text-[10px] ${req.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                  {req.test(password) ? <Check size={12}/> : <X size={12}/>} {req.label}
                </div>
              ))}
            </div>

            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="w-full p-4 border rounded-2xl dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" required 
            />
            <button disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all">
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}