import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword } from '../lib/crypto';
import Alert from '../components/common/Alert';
import { Lock, Loader, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword, verifyResetOTP, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] });

  useEffect(() => {
    // 1. Recover email if the user just came from the ForgotPassword request
    const stored = localStorage.getItem('reset_email');
    if (stored) setEmail(stored);
    
    // 2. Direct Recovery Link handling:
    // If the URL contains an access token (Supabase default) or the recovery type hash,
    // we consider the session active and skip the OTP verification step.
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      setIsVerified(true);
    }
  }, []);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);
    
    // verifyResetOTP will verify the code and sign the user in internally
    const result = await verifyResetOTP(email, otp); 
    
    if (result.success) {
      setIsVerified(true);
      setAlertMessage({ type: 'success', message: 'Identity verified. Set your new password.' });
    } else {
      setAlertMessage({ type: 'error', message: result.error || 'Invalid or expired code' });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAlertMessage(null);
    
    const strength = validatePassword(password);
    if (!strength.valid || password !== confirmPassword) {
        setAlertMessage({ type: 'error', message: 'Please ensure passwords match and meet requirements.' });
        return;
    }

    setLoading(true);
    // This call requires an active session (which was set by the OTP or the Recovery Link)
    const result = await resetPassword(password);
    
    if (result.success) {
      setIsSuccess(true);
      localStorage.removeItem('reset_email');
      
      setLoading(false);
      setAlertMessage({ 
        type: 'success', 
        message: 'Password updated successfully! Redirecting to login...' 
      });
      
      // Delay navigation so the user sees the success state
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setLoading(false);
      setAlertMessage({ type: 'error', message: result.error });
    }
  };

  const passwordsMatch = password === confirmPassword;
  const showMatchError = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold dark:text-white mb-2 text-center">
            {!isVerified ? 'Verify Identity' : 'Set New Password'}
          </h1>
          
          {alertMessage && (
            <Alert 
              type={alertMessage.type} 
              message={alertMessage.message} 
              onClose={() => setAlertMessage(null)} 
            />
          )}

          {!isVerified ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Enter the code sent to: <br/>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>
              </p>
              <input 
                type="text" 
                maxLength={8}
                placeholder="000000"
                className="w-full px-4 py-4 bg-gray-50 dark:bg-dark border border-gray-300 dark:border-gray-600 rounded-lg text-center text-3xl font-bold tracking-widest focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                required
              />
              <button 
                type="submit" 
                disabled={loading || otp.length < 6} 
                className="w-full btn-primary h-12 flex items-center justify-center font-bold"
              >
                {loading ? <Loader className="animate-spin" size={24} /> : 'Verify Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6 mt-4">
               <div className="space-y-4">
                 <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="New Password"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg dark:bg-dark dark:text-white focus:ring-2 outline-none ${
                        password.length > 0 && !passwordStrength.valid ? 'border-red-500 focus:ring-red-500' : 'dark:border-gray-600 focus:ring-primary-500'
                      }`}
                      value={password} 
                      onChange={(e) => { 
                        setPassword(e.target.value); 
                        setPasswordStrength(validatePassword(e.target.value)); 
                      }} 
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-3 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                 </div>

                 <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm Password"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg dark:bg-dark dark:text-white focus:ring-2 outline-none ${
                        showMatchError ? 'border-red-500 focus:ring-red-500' : 'dark:border-gray-600 focus:ring-primary-500'
                      }`}
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      className="absolute right-3 top-3 text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                 </div>
               </div>

               <div className="text-xs space-y-1 px-1">
                 {password.length > 0 && !passwordStrength.valid && (
                    passwordStrength.errors.map((err, i) => (
                      <p key={i} className="text-red-500 flex items-center gap-1">
                        <XCircle size={12} /> {err}
                      </p>
                    ))
                 )}
                 {showMatchError && (
                   <p className="text-red-500 flex items-center gap-1">
                     <XCircle size={12} /> Passwords do not match
                   </p>
                 )}
                 {password.length > 0 && passwordStrength.valid && passwordsMatch && (
                   <p className="text-green-500 flex items-center gap-1">
                     <CheckCircle2 size={12} /> Password requirements met
                   </p>
                 )}
               </div>

               <button 
                type="submit" 
                disabled={loading || isSuccess || !passwordStrength.valid || !passwordsMatch}
                className={`w-full h-12 rounded-lg font-bold transition-all flex items-center justify-center ${
                  isSuccess ? 'bg-green-600 text-white' : 'btn-primary'
                }`}
               >
                {loading ? (
                  <Loader className="animate-spin" size={24} />
                ) : isSuccess ? (
                  <CheckCircle2 className="animate-bounce" size={24} />
                ) : (
                  'Update Password'
                )}
               </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}