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
  
  // Use a ref to prevent unnecessary re-syncs when switching tabs
  const lastSyncedId = useRef(null);

  // --- 1. DATABASE VERIFICATION (GHOST BUSTER) ---
  const verifyUserExistsInDatabase = async (userId) => {
    try {
      console.log("🔍 [AuthContext] Verifying user integrity...");
      
      const { data: publicUser, error: pErr } = await supabase
        .from("users")
        .select("id, role, email_verified")
        .eq("id", userId)
        .maybeSingle();

      // If RLS loops or 500s, we don't kick the user out
      if (pErr) {
        console.warn("⚠️ Integrity check bypassed due to RLS/Network error:", pErr.message);
        return { exists: true }; 
      }

      return {
        exists: !!publicUser,
        userData: publicUser
      };
    } catch (err) {
      console.error("❌ Integrity check failed:", err);
      return { exists: true }; 
    }
  };

  // --- 2. SESSION HANDLER ---
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

      if (uErr) {
        console.warn("⚠️ Database sync skipped (RLS/Network):", uErr.message);
        return;
      }

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

  // --- 3. LIFECYCLE & OBSERVERS ---
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          const verification = await verifyUserExistsInDatabase(session.user.id);
          
          if (verification.exists === false) {
            console.warn("🛑 Ghost session confirmed. Purging...");
            await logout();
          } else {
            await handleUserSession(session.user);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth Event:", event);
      
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        await handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        lastSyncedId.current = null;
        localStorage.clear();
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleUserSession]);

  // --- 4. UTILS & HELPERS ---
  const hashString = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const validateRegistrationCode = async (code, role) => {
    try {
      const hashedCode = await hashString(code);
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("code", hashedCode)
        .eq("role", role)
        .eq("is_used", false)
        .maybeSingle();

      if (error || !data) return { valid: false, message: "Invalid or expired code" };
      return { valid: true, codeData: data };
    } catch (err) {
      return { valid: false, message: "Validation error" };
    }
  };

  // --- 5. AUTH ACTIONS ---
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
    }
  };

  const requestSignupOTP = async (email, password, role, registrationCodeId) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { role, registration_code_id: registrationCodeId },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setPendingVerification({ email, password, role, registrationCodeId });
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
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
  };

  const value = {
    user,
    userRole,
    loading,
    error,
    pendingVerification,
    login,
    logout,
    requestSignupOTP,
    verifySignupOTP,
    validateRegistrationCode,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}