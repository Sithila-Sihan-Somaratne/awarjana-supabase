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

  // Check if user exists in BOTH auth.users AND public.users
  const verifyUserExistsInDatabase = async (userId) => {
    try {
      console.log("🔍 Verifying user exists in database...");
      
      // Check in public.users
      // Use maybeSingle() to avoid errors if user doesn't exist yet
      const { data: publicUser, error: publicError } = await supabase
        .from("users")
        .select("id, email, role, email_verified")
        .eq("id", userId)
        .maybeSingle();

      console.log("📊 Database verification result:", {
        existsInPublicUsers: !!publicUser,
        error: publicError?.message
      });

      return {
        exists: !!publicUser,
        userData: publicUser,
        error: publicError
      };
    } catch (err) {
      console.error("❌ Database verification error:", err);
      return { exists: false, error: err.message };
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        console.log("🔄 [AuthContext] Checking existing session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("📋 Session check results:", {
          hasSession: !!session,
          sessionUser: session?.user?.email,
          sessionUserId: session?.user?.id,
          sessionError: sessionError?.message
        });
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log("✅ Active session found for:", session.user.email);
          
          // CRITICAL: Check JWT metadata first (Fast & Recursion-Proof)
          const jwtRole = session.user.app_metadata?.role;
          if (jwtRole) {
            console.log("🔑 Role found in JWT metadata:", jwtRole);
            setUserRole(jwtRole);
          }

          // Verify user actually exists in database
          const verification = await verifyUserExistsInDatabase(session.user.id);
          
          if (!verification.exists) {
            console.warn("⚠️ Session exists but user not found in database! (Ghost Session Detected)");
            
            // Force logout since user doesn't exist
            await supabase.auth.signOut();
            setUser(null);
            setUserRole(null);
            
            // Clear EVERYTHING to prevent infinite loops
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login if possible
            window.location.href = '/login';
            
            setError("User account not found. Please sign in again.");
          } else {
            console.log("✅ User verified in database, proceeding...");
            await handleUserSession(session.user);
          }
        } else {
          console.log("ℹ️ No active session found - user is logged out");
        }
      } catch (err) {
        console.error("❌ Session check error:", err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state changed:", event, {
          hasSession: !!session,
          userEmail: session?.user?.email,
          userId: session?.user?.id
        });

        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          console.log("✅ User signed in:", session.user.email);
          
          // Sync role from JWT immediately
          const jwtRole = session.user.app_metadata?.role;
          if (jwtRole) setUserRole(jwtRole);

          // Verify user exists before proceeding
          const verification = await verifyUserExistsInDatabase(session.user.id);
          if (!verification.exists) {
            console.error("❌ Signed in but user not found in database!");
            // Wait a tiny bit for trigger to finish
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryVerification = await verifyUserExistsInDatabase(session.user.id);
            if (!retryVerification.exists) {
              await supabase.auth.signOut();
              return;
            }
          }
          
          await handleUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log("🚪 User signed out or session expired");
          setUser(null);
          setUserRole(null);
          setPendingVerification(null);
          
          // Clear any stale localStorage data
          localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_URL.replace(/[^a-zA-Z0-9]/g, '-')}-auth-token`);
        } else if (event === 'USER_UPDATED') {
          console.log("👤 User data updated");
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("🔄 Token refreshed");
        }
      }
    );

    return () => {
      console.log("🧹 [AuthContext] Cleaning up...");
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUserSession = async (user) => {
    console.log("👤 [AuthContext] Handling user session for:", user.id);
    console.log("   User email:", user.email);
    
    setUser(user);

    try {
      // NEW: Check JWT metadata first to avoid recursion
      const jwtRole = user.app_metadata?.role;
      if (jwtRole) {
        console.log("🔑 Role found in JWT metadata:", jwtRole);
        setUserRole(jwtRole);
      }

      console.log("🔍 Fetching user role from database...");
      const { data, error: userError } = await supabase
        .from("users")
        .select("role, email_verified")
        .eq("id", user.id)
        .maybeSingle();

      console.log("📊 User role query results:", {
        dataFound: !!data,
        role: data?.role,
        emailVerified: data?.email_verified,
        error: userError?.message
      });

      if (userError) {
        console.warn("⚠️ User role fetch error:", userError.message);
        if (!jwtRole) setUserRole("customer");
      } else if (!data) {
        console.warn("⚠️ No user data found - forcing logout");
        await supabase.auth.signOut();
        setUser(null);
        setUserRole(null);
        setError("User account not found. Please sign in again.");
      } else {
        const role = data?.role || "customer";
        console.log("✅ User role set to:", role);
        setUserRole(role);

        // SYNC FIX: If public table is out of sync with Auth, update it
        const isEmailVerified = !!user.email_confirmed_at;
        if (data.email_verified !== isEmailVerified) {
          console.log("🔄 Syncing email_verified status to database...");
          await supabase
            .from("users")
            .update({ email_verified: isEmailVerified })
            .eq("id", user.id);
        }
      }
    } catch (err) {
      console.warn("⚠️ User session error:", err.message);
      if (!userRole) setUserRole("customer");
    }
  };

  const validateRegistrationCode = async (code, role) => {
    try {
      console.log("🔍 [DEBUG - START] Validating Code:");
      console.log("   Input Code (Raw):", `"${code}"`);
      console.log("   Input Role (Raw):", `"${role}"`);

      if (!code || !role) {
        console.log("❌ Missing code or role");
        return { valid: false, message: "Code and role are required" };
      }

      const hashedCode = await hashString(code);
      console.log("   Hashed Code:", hashedCode);
      console.log("   Role (for DB query):", `"${role}"`);

      // Log the actual Supabase query being built
      console.log("   🛠️  Executing DB Query with:");
      console.log('     .eq("code",', `"${hashedCode}")`);
      console.log('     .eq("role",', `"${role}")`);

      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("code", hashedCode)
        .eq("role", role)
        .maybeSingle();

      console.log("✅ Query completed.");
      console.log("   Data returned:", data);
      console.log("   Error (if any):", error);
      console.log("   Raw SQL would be:");
      console.log(`     SELECT * FROM registration_codes WHERE code = '${hashedCode}' AND role = '${role}'`);

      if (error) {
        console.error("❌ Database error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Check for RLS violation
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log("   🔒 RLS Policy violation detected!");
          return { 
            valid: false, 
            message: "Permission denied. Check RLS policies on registration_codes table." 
          };
        }
        
        return { valid: false, message: "Database error during validation" };
      }

      if (!data) {
        console.log("❌ No matching code found. Possible reasons:");
        console.log("   1. Code doesn't exist in database");
        console.log("   2. Role doesn't match");
        console.log("   3. RLS policy blocking access");
        
        // Let's check if ANY code exists with this hash
        console.log("   🔍 Checking if any code exists with this hash...");
        const { data: anyCodeData, error: anyCodeError } = await supabase
          .from("registration_codes")
          .select("role, is_used, created_at")
          .eq("code", hashedCode)
          .maybeSingle();
          
        if (anyCodeError) {
          console.log("   ❌ Error checking for any code:", anyCodeError);
        } else if (anyCodeData) {
          console.log("   ⚠️ Found code with different role:", anyCodeData);
          return {
            valid: false,
            message: `Code exists but is for ${anyCodeData.role} role, not ${role}`
          };
        } else {
          console.log("   ℹ️ No code found with this hash in database");
        }
        
        return {
          valid: false,
          message: "Invalid registration code or role mismatch",
        };
      }

      console.log("✅ Code found in database:", {
        id: data.id,
        role: data.role,
        is_used: data.is_used,
        created_at: data.created_at,
        used_by: data.used_by
      });

      if (data.is_used) {
        console.log("❌ Code already used by user:", data.used_by);
        return {
          valid: false,
          message: "Registration code has already been used",
        };
      }

      console.log("🎉 Code validation successful!");
      return { valid: true, codeData: data };
    } catch (err) {
      console.error("🔥 Unexpected error in validateRegistrationCode:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      return { valid: false, message: "Error validating code" };
    }
  };

  const hashString = async (str) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.error("❌ Hashing error:", err);
      throw err;
    }
  };

  const requestSignupOTP = async (email, password, role, registrationCodeId) => {
    try {
      console.log("📝 Requesting signup OTP for:", email);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            role: role,
            registration_code_id: registrationCodeId,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log("📤 Signup response:", {
        hasUser: !!data.user,
        userEmail: data.user?.email,
        error: error?.message
      });

      if (error) throw error;

      setPendingVerification({
        email: email.toLowerCase().trim(),
        password,
        role,
        registrationCodeId,
      });

      console.log("✅ Signup OTP requested successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Signup error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const verifySignupOTP = async (email, token) => {
    try {
      console.log("🔑 Verifying OTP for:", email);
      setError(null);
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "signup",
      });

      console.log("📤 Verification response:", {
        hasUser: !!data.user,
        userEmail: data.user?.email,
        error: error?.message
      });

      if (error) throw error;

      if (data.user) {
        console.log("✅ Verification successful, syncing status...");
        // FORCE SYNC: Ensure public table is updated immediately
        await supabase
          .from("users")
          .update({ email_verified: true })
          .eq("id", data.user.id);
          
        await handleUserSession(data.user);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: "Email verified successfully!",
      };
    } catch (err) {
      console.error("❌ Verification error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const resendSignupOTP = async (email) => {
    try {
      console.log("🔄 Resending OTP to:", email);
      setError(null);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log("📤 Resend response:", { error: error?.message });

      if (error) throw error;

      console.log("✅ New OTP sent");
      return {
        success: true,
        message: "New verification code sent! Please check your email.",
      };
    } catch (err) {
      console.error("❌ Resend error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login for:", email);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      console.log("📤 Login response:", {
        hasUser: !!data.user,
        userEmail: data.user?.email,
        error: error?.message
      });

      if (error) throw error;
      
      // Verify user exists in database after login
      const verification = await verifyUserExistsInDatabase(data.user.id);
      if (!verification.exists) {
        console.error("❌ Login succeeded but user not in database!");
        await supabase.auth.signOut();
        throw new Error("Account not found. Please contact support.");
      }
      
      await handleUserSession(data.user);
      console.log("✅ Login successful");
      return { success: true, user: data.user };
    } catch (err) {
      console.error("❌ Login error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const logout = async () => {
    try {
      console.log("🚪 Logging out...");
      const { error } = await supabase.auth.signOut();
      console.log("📤 Logout response:", { error: error?.message });
      
      if (error) throw error;
      setUser(null);
      setUserRole(null);
      setPendingVerification(null);
      console.log("✅ Logout successful");
      return { success: true };
    } catch (err) {
      console.error("❌ Logout error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const forgotPassword = async (email) => {
    try {
      console.log("🔑 Requesting password reset for:", email);
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      console.log("📤 Forgot password response:", { error: error?.message });

      if (error) throw error;

      console.log("✅ Password reset email sent");
      return {
        success: true,
        message: "Password reset email sent. Check your inbox.",
      };
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const resetPassword = async (newPassword) => {
    try {
      console.log("🔄 Resetting password...");
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        console.log("❌ Password validation failed:", passwordValidation.errors[0]);
        throw new Error(passwordValidation.errors[0]);
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      console.log("📤 Reset password response:", { error: error?.message });

      if (error) throw error;

      console.log("✅ Password reset successful");
      return { success: true, message: "Password updated successfully" };
    } catch (err) {
      console.error("❌ Reset password error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const testDatabaseConnection = async () => {
    try {
      console.log("🧪 Testing database connection...");
      const { data, error } = await supabase
        .from('registration_codes')
        .select('id')
        .limit(1);
      
      console.log("📊 Database test result:", { 
        hasData: !!data?.length, 
        error: error?.message,
        success: !error 
      });
      
      if (error) {
        return { 
          success: false, 
          error: `Database error: ${error.message}. Check RLS policies.` 
        };
      }
      
      console.log("✅ Database connection successful");
      return { success: true, data };
    } catch (error) {
      console.error("❌ Test failed:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userRole,
    loading,
    error,
    pendingVerification,
    requestSignupOTP,
    verifySignupOTP,
    resendSignupOTP,
    login,
    logout,
    forgotPassword,
    resetPassword,
    testDatabaseConnection,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}