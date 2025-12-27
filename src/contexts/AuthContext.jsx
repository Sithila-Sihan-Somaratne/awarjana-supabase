// src/contexts/AuthContext.jsx
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

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          await handleUserSession(session.user);
        }
      } catch (err) {
        console.error("Session check error:", err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        setUser(null);
        setUserRole(null);
        setPendingVerification(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUserSession = async (user) => {
    setUser(user);

    const { data } = await supabase
      .from("users")
      .select("role, email_verified")
      .eq("id", user.id)
      .maybeSingle();

    setUserRole(data?.role || "customer");
  };

  const validateRegistrationCode = async (code, role) => {
    try {
      if (!code || !role) {
        return { valid: false, message: "Code and role are required" };
      }

      console.log("🔍 [DEBUG] Validating Code:", code, "Role:", role);

      const hashedCode = await hashString(code);
      console.log("📊 Hashed Code:", hashedCode);

      // SIMPLE DIRECT QUERY - no complex chaining
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("code", hashedCode)
        .eq("role", role)
        .maybeSingle();

      console.log("✅ Query completed. Data:", data, "Error:", error);

      if (error) {
        console.error("❌ Database error:", error);
        return { valid: false, message: "Database error during validation" };
      }

      if (!data) {
        console.log("❌ No matching code found");
        return {
          valid: false,
          message: "Invalid registration code or role mismatch",
        };
      }

      if (data.is_used) {
        console.log("❌ Code already used");
        return {
          valid: false,
          message: "Registration code has already been used",
        };
      }

      console.log("✅ Code validation successful!");
      return { valid: true, codeData: data };
    } catch (err) {
      console.error("🔥 Unexpected error:", err);
      return { valid: false, message: "Error validating code" };
    }
  };

  const hashString = async (str) => {
    // Simple hash function for codes
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const requestSignupOTP = async (
    email,
    password,
    role = "customer",
    registrationCode = null
  ) => {
    try {
      setError(null);

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Validate registration code for specific roles
      let validatedCodeData = null;
      if (role === "worker" || role === "admin") {
        if (!registrationCode) {
          throw new Error(`Registration code required for ${role}`);
        }

        const codeValidation = await validateRegistrationCode(
          registrationCode,
          role
        );

        if (!codeValidation.valid) {
          throw new Error(codeValidation.message);
        }
        validatedCodeData = codeValidation.codeData;
      }

      // Sign up with Supabase - THIS AUTOMATICALLY SENDS 6-DIGIT OTP
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role,
            registration_code: registrationCode,
            validated_code_id: validatedCodeData?.id,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // Store user in public.users table (using upsert to handle both insert and update)
      if (data.user) {
        const { error: upsertError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            email: email.toLowerCase().trim(),
            role: role,
            registration_code: registrationCode,
            registration_code_id: validatedCodeData?.id,
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (upsertError) {
          console.error("Failed to create user record:", upsertError);
          // Don't throw here - auth user was created successfully
        }

        // Mark registration code as used
        if (validatedCodeData?.id) {
          await supabase
            .from("registration_codes")
            .update({
              is_used: true,
              used_by: data.user.id,
              used_at: new Date().toISOString(),
            })
            .eq("id", validatedCodeData.id);
        }
      }

      // Store pending verification info
      setPendingVerification({
        email: email.toLowerCase().trim(),
        role,
        registrationCode,
        validatedCodeId: validatedCodeData?.id,
      });

      return {
        success: true,
        message: `Verification code sent to ${email}. Please check your inbox.`,
        user: data.user,
      };
    } catch (err) {
      console.error("Signup error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const verifySignupOTP = async (email, token) => {
    try {
      setError(null);

      // Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token,
        type: "signup",
      });

      if (error) {
        console.error("OTP verification error:", error);

        if (error.message?.toLowerCase().includes("invalid")) {
          throw new Error("Invalid verification code. Please try again.");
        } else if (error.message?.toLowerCase().includes("expired")) {
          throw new Error(
            "Verification code has expired. Please request a new one."
          );
        } else {
          throw error;
        }
      }

      if (!data.user) {
        throw new Error("Verification failed. Please try again.");
      }

      // Update user verification status in public.users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email.toLowerCase().trim());

      if (updateError) {
        console.error("Failed to update verification status:", updateError);
      }

      // Clear pending verification
      setPendingVerification(null);

      // Update local state
      await handleUserSession(data.user);

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: "Email verified successfully!",
      };
    } catch (err) {
      console.error("Verification error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const resendSignupOTP = async (email) => {
    try {
      setError(null);

      // Use Supabase's resend function
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return {
        success: true,
        message: "New verification code sent! Please check your email.",
      };
    } catch (err) {
      console.error("Resend error:", err);
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) throw error;

      // Update local state
      await handleUserSession(data.user);

      return { success: true, user: data.user };
    } catch (err) {
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserRole(null);
      setPendingVerification(null);
      return { success: true };
    } catch (err) {
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      return {
        success: true,
        message: "Password reset email sent. Check your inbox.",
      };
    } catch (err) {
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
    }
  };

  const resetPassword = async (newPassword) => {
    try {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0]);
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { success: true, message: "Password updated successfully" };
    } catch (err) {
      const formattedError = formatErrorMessage(err);
      setError(formattedError);
      return { success: false, error: formattedError };
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
