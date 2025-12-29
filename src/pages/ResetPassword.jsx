import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/common/Alert';
import { Lock, Loader, Eye, EyeOff, Check, X } from 'lucide-react';
import { validatePassword } from '../lib/crypto';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] });

  useEffect(() => {
    const storedEmail = localStorage.getItem('reset_email');
    if (!storedEmail) navigate('/forgot-password');
    else setEmail(storedEmail);
  }, [navigate]);

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordStrength(validatePassword(value));
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!passwordStrength.valid) {
      setAlertMessage({ type: 'error', message: passwordStrength.errors[0] });
      return;
    }
    if (password !== confirmPassword) {
      setAlertMessage({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    // Passing email to resetPassword is key if no session exists
    const result = await resetPassword(password, email); 

    if (result.success) {
      setAlertMessage({ type: 'success', message: 'Password updated! Logging you in...' });
      localStorage.removeItem('reset_email');
      setTimeout(async () => {
        await login(email, password);
        navigate('/dashboard');
      }, 2000);
    } else {
      setAlertMessage({ type: 'error', message: result.error || 'Reset failed. Session might have expired.' });
    }
    setLoading(false);
  };

  const requirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p) => /[!@#$%^&*]/.test(p) },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">New Password</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Set a new password for {email}</p>

          {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}

          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Requirements immediately under first input */}
              {password && (
                <div className="mt-3 grid grid-cols-1 gap-1">
                  {requirements.map((req, i) => {
                    const isMet = req.test(password);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {isMet ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-red-500" />}
                        <span className={isMet ? 'text-green-500' : 'text-gray-500'}>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
              {loading ? <Loader size={18} className="animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}