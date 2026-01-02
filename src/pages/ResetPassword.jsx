// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/crypto';
import Alert from '../components/common/Alert';
import { Lock, Loader, Check, X, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] });

  const requirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ];

  useEffect(() => {
    const stored = localStorage.getItem('reset_email');
    if (stored) setEmail(stored);
  }, []);

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordStrength(validatePassword(value));
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);
    
    try {
      const { error } = await supabase.auth.verifyOtp({ 
        email, 
        token: otp, 
        type: 'recovery' 
      });
      
      if (error) throw error;
      
      setIsVerified(true);
      setAlertMessage({ 
        type: 'success', 
        message: 'Identity verified. Set your new password.' 
      });
    } catch (err) {
      setAlertMessage({ 
        type: 'error', 
        message: err.message || 'Failed to verify code' 
      });
    } finally { 
      setLoading(false); 
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAlertMessage(null);

    if (!passwordStrength.valid) {
      setAlertMessage({ 
        type: 'error', 
        message: passwordStrength.errors[0] || 'Please fix password errors'
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Passwords do not match' 
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setAlertMessage({ 
        type: 'success', 
        message: 'Password updated successfully! Redirecting to login...' 
      });
      
      localStorage.removeItem('reset_email');
      
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setAlertMessage({ 
        type: 'error', 
        message: err.message || 'Failed to update password' 
      });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {!isVerified ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {!isVerified ? 'Enter your verification code' : 'Create a strong password'}
          </p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          {!isVerified ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <input 
                  type="text" 
                  placeholder="Enter 8-digit code" 
                  maxLength={8}
                  className="w-full px-4 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-center text-2xl tracking-widest font-bold"
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading || otp.length < 8} 
                className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : 'Verify Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400 dark:text-gray-500" size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter a strong password"
                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    value={password} 
                    onChange={(e) => handlePasswordChange(e.target.value)} 
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {password && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 gap-1">
                      {requirements.map((req, i) => {
                        const isMet = req.test(password);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {isMet ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <X size={12} className="text-red-500" />
                            )}
                            <span className={isMet ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400 dark:text-gray-500" size={18} />
                  </div>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
                    <X size={14} />
                    <p className="text-xs font-medium tracking-wide">Passwords do not match</p>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={loading || !passwordStrength.valid || password !== confirmPassword} 
                className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Remember your password?{" "}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
