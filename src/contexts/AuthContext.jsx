import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { validatePassword, formatErrorMessage } from "../lib/crypto";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(null);

  // --- DATABASE VERIFICATION (GHOST BUSTER LOGIC) ---
  const verifyUserExistsInDatabase = async (userId) => {
    try {
      console.log("🔍 [AuthContext] Verifying user exists in database...");
      
      // 1. Check Public Table
      const { data: publicUser, error: publicError } = await supabase
        .from("users")
        .select("id, email, role, email_verified")
        .eq("id", userId)
        .maybeSingle();

      // 2. INTERRUPT: Query Auth server to see if user actually exists in auth.users
      // This is the safety check against deleted users with active JWTs
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      console.log("📊 [AuthContext] Database verification result:", {
        existsInPublicUsers: !!publicUser,
        existsInAuth: !!authUser,
        publicError: publicError?.message,
        authError: authError?.message
      });

      return {
        exists: !!publicUser && !!authUser,
        userData: publicUser,
        error: publicError || authError
      };
    } catch (err) {
      console.error("❌ [AuthContext] Database verification error:", err);
      return { exists: false, error: err.message };
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        console.log("🔄 [AuthContext] Checking existing session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error("❌ [AuthContext] Session error:", sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log("✅ [AuthContext] Active session found for:", session.user.email);
          
          // CRITICAL: Verify user is not a "Ghost"
          const verification = await verifyUserExistsInDatabase(session.user.id);
          
          if (!mounted) return;

          if (!verification.exists) {
            console.warn("🛑 [AuthContext] Ghost session detected! Purging...");
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            setUserRole(null);
            setError("User account not found. Please sign in again.");
          } else {
            await handleUserSession(session.user);
          }
        } else {
          console.log("ℹ️ [AuthContext] No active session found");
        }
      } catch (err) {
        console.error("❌ [AuthContext] Session check error:", err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 [AuthContext] Auth state changed:", event);
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log("🚪 [AuthContext] User signed out");
          setUser(null);
          setUserRole(null);
          setPendingVerification(null);
          localStorage.clear();
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUserSession = async (user) => {
    console.log("👤 [AuthContext] Handling user session for:", user.id);
    setUser(user);

    try {
      // Sync role from JWT metadata immediately for speed
      const jwtRole = user.app_metadata?.role;
      if (jwtRole) {
        console.log("🔑 [AuthContext] Role found in JWT:", jwtRole);
        setUserRole(jwtRole);
      }

      // Sync role and verification from Database for accuracy
      const { data, error: userError } = await supabase
        .from("users")
        .select("role, email_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (userError || !data) {
        console.warn("⚠️ [AuthContext] Data mismatch. Logging out.");
        await logout();
      } else {
        const role = data.role || "customer";
        setUserRole(role);

        // Sync verification status if database is lagging
        const isEmailVerified = !!user.email_confirmed_at;
        if (data.email_verified !== isEmailVerified) {
          console.log("🔄 [AuthContext] Syncing verification status...");
          await supabase.from("users").update({ email_verified: isEmailVerified }).eq("id", user.id);
        }
      }
    } catch (err) {
      console.warn("⚠️ [AuthContext] Session handler error:", err.message);
      if (!userRole) setUserRole("customer");
    }
  };

  // --- REGISTRATION CODE LOGIC ---
  const hashString = async (str) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.error("❌ [AuthContext] Hashing error:", err);
      throw err;
    }
  };

  const validateRegistrationCode = async (code, role) => {
    try {
      console.log("🔍 [AuthContext] Validating Code for role:", role);
      const hashedCode = await hashString(code);
      
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("code", hashedCode)
        .eq("role", role)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { valid: false, message: "Invalid code or role mismatch" };
      if (data.is_used) return { valid: false, message: "Code already used" };

      console.log("✅ [AuthContext] Code valid!");
      return { valid: true, codeData: data };
    } catch (err) {
      console.error("❌ [AuthContext] Code validation error:", err);
      return { valid: false, message: "Error validating code" };
    }
  };

  // --- AUTH ACTIONS ---
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      
      const verification = await verifyUserExistsInDatabase(data.user.id);
      if (!verification.exists) throw new Error("Account records not found.");
      
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
    return { success: true };
  };

  const requestSignupOTP = async (email, password, role, registrationCodeId) => {
    try {
      const { data, error } = await supabase.auth.signUp({
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
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}