import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { formatErrorMessage } from "../lib/crypto";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(null);

  // --- 1. DATABASE VERIFICATION (GHOST BUSTER LOGIC) ---
  const verifyUserExistsInDatabase = async (userId) => {
    try {
      console.log("🔍 [AuthContext] Verifying user integrity...");
      
      // Check Public Profile Table
      const { data: publicUser, error: pErr } = await supabase
        .from("users")
        .select("id, role, email_verified")
        .eq("id", userId)
        .maybeSingle();

      // Check Internal Auth Server
      const { data: { user: authUser }, error: aErr } = await supabase.auth.getUser();

      return {
        exists: !!publicUser && !!authUser,
        userData: publicUser,
        error: pErr || aErr
      };
    } catch (err) {
      console.error("❌ Integrity check failed:", err);
      return { exists: false };
    }
  };

  // --- 2. SESSION HANDLER & TRACKER ---
  const handleUserSession = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setUserRole(null);
      return;
    }

    setUser(authUser);
    
    try {
      // Immediate Role Sync from JWT
      const jwtRole = authUser.app_metadata?.role;
      if (jwtRole) setUserRole(jwtRole);

      // Deep Sync from Database
      const { data, error: uErr } = await supabase
        .from("users")
        .select("role, email_verified")
        .eq("id", authUser.id)
        .maybeSingle();

      if (uErr || !data) {
        console.warn("⚠️ Data mismatch detected.");
      } else {
        setUserRole(data.role || "customer");
        
        // Update verification if auth server and DB are out of sync
        const isVerified = !!authUser.email_confirmed_at;
        if (data.email_verified !== isVerified) {
          await supabase.from("users").update({ email_verified: isVerified }).eq("id", authUser.id);
        }
      }

      // Session Tracker: Log login activity
      await supabase.from("activity_logs").insert({
        user_id: authUser.id,
        action_type: "login",
        action_details: { 
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.warn("Session sync warning:", err.message);
    }
  }, []);

  // --- 3. LIFECYCLE & OBSERVERS ---
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && mounted) {
        const verification = await verifyUserExistsInDatabase(session.user.id);
        if (!verification.exists) {
          console.warn("🛑 Ghost session purged.");
          await logout();
        } else {
          await handleUserSession(session.user);
        }
      }
      if (mounted) setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth Change:", event);
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        setPendingVerification(null);
        localStorage.clear();
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleUserSession]);

  // --- 4. UTILS & HASHING ---
  const hashString = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
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
      if (!check.exists) throw new Error("Account records missing.");
      
      await handleUserSession(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: formatErrorMessage(err) };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    localStorage.clear();
  };

  const requestSignupOTP = async (email, password, role, registrationCodeId) => {
    try {
      // If registration code is provided, validate it first
      if (registrationCodeId) {
        const { data: codeData, error: codeError } = await supabase
          .from("registration_codes")
          .select("id, is_used")
          .eq("id", registrationCodeId)
          .single();
        
        if (codeError || !codeData || codeData.is_used) {
          throw new Error("Registration code is invalid or already used.");
        }
      }

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

  const verifySignupOTP = async (email, token, registrationCodeId) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "signup",
      });
      if (error) throw error;
      
      if (data.user) {
        // Update user verification status
        await supabase.from("users").update({ email_verified: true }).eq("id", data.user.id);
        
        // If there was a registration code, mark it as used
        if (registrationCodeId) {
          await supabase.from("registration_codes").update({
            is_used: true,
            used_by: data.user.id,
            used_at: new Date().toISOString()
          }).eq("id", registrationCodeId);
        }
        
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

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
