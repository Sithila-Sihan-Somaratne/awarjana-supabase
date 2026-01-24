import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { formatErrorMessage } from "../lib/crypto";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(null);
  const lastSyncedId = useRef(null);

  const verifyUserExistsInDatabase = async (userId) => {
    try {
      const { data: publicUser, error: pErr } = await supabase
        .from("users")
        .select("id, role, email_verified")
        .eq("id", userId)
        .maybeSingle();
      if (pErr) return { exists: true }; 
      return { exists: !!publicUser, userData: publicUser };
    } catch (err) {
      return { exists: true }; 
    }
  };

  const handleUserSession = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setUserRole(null);
      lastSyncedId.current = null;
      return;
    }

    setUser(authUser);
    const jwtRole = authUser.app_metadata?.role;
    if (jwtRole) setUserRole(jwtRole);
    
    // Prevent redundant DB calls if already synced
    if (lastSyncedId.current === authUser.id) return;

    try {
      const { data } = await supabase
        .from("users")
        .select("role, email_verified")
        .eq("id", authUser.id)
        .maybeSingle();
      
      if (data) {
        setUserRole(data.role || jwtRole || "customer");
        lastSyncedId.current = authUser.id;
        const isConfirmed = !!authUser.email_confirmed_at;
        if (data.email_verified !== isConfirmed) {
          await supabase.from("users").update({ email_verified: isConfirmed }).eq("id", authUser.id);
        }
      }
    } catch (err) {
      console.warn("Session sync warning:", err.message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          // 2. Verify against your 'users' table before showing the UI
          const verification = await verifyUserExistsInDatabase(session.user.id);
          if (verification.exists === false) {
            await logout();
          } else {
            await handleUserSession(session.user);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listener for state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false);
        return; 
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        await handleUserSession(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        lastSyncedId.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleUserSession]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      const check = await verifyUserExistsInDatabase(data.user.id);
      if (check.exists === false) throw new Error("Database profile missing.");
      await handleUserSession(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const logout = async () => {
    try {
      // Find and remove the specific Supabase token key to prevent restoration loops
      const sbKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (sbKey) localStorage.removeItem(sbKey);
      
      localStorage.clear();
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setUserRole(null);
      lastSyncedId.current = null;
      setLoading(false);
      // Hard redirect to clear any residual memory state
      window.location.href = '/login';
    }
  };

  const requestSignupOTP = async (email, password, role, registrationCode = null) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { role, registration_code: registrationCode } }
      });
      if (error) throw error;
      setPendingVerification({ email, role });
      return { success: true, message: "Verification code sent!" };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const verifySignupOTP = async (email, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "signup",
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("users").update({ email_verified: true }).eq("id", data.user.id);
        await handleUserSession(data.user);
      }
      setPendingVerification(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const verifyResetOTP = async (email, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "recovery",
      });
      if (error) throw error;
      // This establishes the session so resetPassword (updateUser) will work
      if (data.user) await handleUserSession(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const resetPassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  }

  const value = {
    user, userRole, loading, error, login, logout,
    requestSignupOTP, verifySignupOTP, pendingVerification,
    resetPassword, verifyResetOTP,
    forgotPassword: async (email) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
        if (error) throw error;
        return { success: true };
      } catch (err) {
        return { success: false, error: formatErrorMessage(err) };
      }
    },
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);