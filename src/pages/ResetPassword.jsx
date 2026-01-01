// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    { label: 'Uppercase & Lowercase', test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: 'Number or Symbol', test: (p) => /[0-9!@#$%^&*]/.test(p) },
  ];

  useEffect(() => {
    const stored = localStorage.getItem('reset_email');
    if (stored) setEmail(stored);
  }, []);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
      if (error) throw error;
      setIsVerified(true);
      setAlertMessage({ type: 'success', message: 'Identity verified. Set your new password.' });
    } catch (err) {
      setAlertMessage({ type: 'error', message: err.message });
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setAlertMessage({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setAlertMessage({ type: 'success', message: 'Password updated! Redirecting to login...' });
      localStorage.removeItem('reset_email');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setAlertMessage({ type: 'error', message: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-xl border dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Security Reset</h1>
          <p className="text-gray-500 font-bold text-xs mt-2 uppercase tracking-widest">Update your credentials</p>
        </div>

        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} className="mb-6" />}

        {!isVerified ? (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input 
              type="text" placeholder="8-Digit Code" maxLength={8}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-center text-2xl font-black tracking-[0.5em] dark:text-white"
              value={otp} onChange={(e) => setOtp(e.target.value)} required
            />
            <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
              {loading ? <Loader className="animate-spin" size={20} /> : 'VERIFY CODE'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} placeholder="New Password"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl dark:text-white"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                {showPassword ? <X size={20}/> : <Eye size={20}/>}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 px-2">
              {requirements.map((req, i) => (
                <div key={i} className={`flex items-center gap-2 text-[10px] font-bold uppercase ${req.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                  {req.test(password) ? <Check size={12}/> : <X size={12}/>} {req.label}
                </div>
              ))}
            </div>
            <input 
              type="password" placeholder="Confirm New Password"
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl dark:text-white"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
            />
            <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all">
              {loading ? <Loader className="animate-spin mx-auto" size={20} /> : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}