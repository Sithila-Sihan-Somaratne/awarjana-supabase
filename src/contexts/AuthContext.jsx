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
    if (lastSyncedId.current === authUser.id) return;

    try {
      const { data, error: uErr } = await supabase
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const verification = await verifyUserExistsInDatabase(session.user.id);
          if (verification.exists === false) {
            await logout();
          } else {
            await handleUserSession(session.user);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // FIX: Prevent automatic sync/redirect during recovery
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
        localStorage.clear();
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
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setUserRole(null);
      lastSyncedId.current = null;
      localStorage.clear();
      setLoading(false);
    }
  };

  const verifyResetOTP = async (email, token) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "recovery",
      });
      if (error) throw error;
      return { success: true };
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
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
      if (error) throw error;
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
    verifySignupOTP, verifyResetOTP, forgotPassword, resetPassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}