import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Alert } from '../components/common/Alert';
import { Mail, Lock, Loader, Eye, EyeOff } from "lucide-react";
import { EMAIL_CONFIG } from "../config/email";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage(null);

    // Email validation
    if (
      email.length < EMAIL_CONFIG.MIN_EMAIL_LENGTH ||
      email.length > EMAIL_CONFIG.MAX_EMAIL_LENGTH
    ) {
      setAlertMessage({
        type: "error",
        message: `Email must be between ${EMAIL_CONFIG.MIN_EMAIL_LENGTH} and ${EMAIL_CONFIG.MAX_EMAIL_LENGTH} characters`,
      });
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      // Check if email is verified
      if (result.user && !result.user.email_confirmed_at) {
        setAlertMessage({
          type: "error",
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
        });
        setLoading(false);
        return;
      }

      setAlertMessage({
        type: "success",
        message: "Login successful! Redirecting...",
      });
      setTimeout(() => navigate("/dashboard"), 1500);
    } else {
      setAlertMessage({ 
        type: "error", 
        message: result.error || "Login failed. Please check your credentials." 
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Awarjana Creations
          </h1>
          <p className="text-gray-400 mb-8">Photoframe Management System</p>

          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3 text-gray-500"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-gray-500"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2 bg-dark border border-gray-600 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}