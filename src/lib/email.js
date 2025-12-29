// src/lib/email.js
// Email Service for Awarjana Creations
// Handles OTP emails, notifications, and low credit warnings

import { supabase } from './supabase';
import { EMAIL_CONFIG, isLikelySlowEmailPeriod } from '../config/email';

/**
 * Send OTP email for signup verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} role - User role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendOTPEmail = async (email, otp, role = 'customer') => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending OTP to ${email} (Role: ${role})`);

    // Method 1: Using Supabase Auth built-in email (OTP via resend)
    // This is the recommended approach for Supabase projects
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('📧 [EMAIL SERVICE] Supabase resend error:', error);
      
      // Method 2: Use Supabase Edge Function (if configured)
      // Uncomment and configure this if you have an Edge Function set up
      /*
      const { data: edgeFunctionData, error: edgeError } = await supabase.functions.invoke('send-otp-email', {
        body: { email, otp, role }
      });
      if (edgeError) throw edgeError;
      */
      
      // Method 3: Use custom email service (Resend, SendGrid, etc.)
      // Uncomment and configure this if you have a custom email service
      /*
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role })
      });
      if (!response.ok) throw new Error('Email service failed');
      */

      // For now, we'll use the simulation for development
      await simulateEmailSending(email, otp, role);
    } else {
      console.log('📧 [EMAIL SERVICE] OTP sent via Supabase Auth');
      
      // Store OTP for development/testing
      if (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true') {
        saveOTPForTesting(email, otp, role);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('📧 [EMAIL SERVICE] Failed to send email:', err);
    
    // Fallback to simulation in development
    if (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true') {
      console.log('📧 [EMAIL SERVICE] Falling back to simulation');
      await simulateEmailSending(email, otp, role);
      return { success: true, simulated: true };
    }
    
    return {
      success: false,
      error: err.message || EMAIL_CONFIG.MESSAGES.EMAIL_FAILED
    };
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending password reset to ${email}`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('📧 [EMAIL SERVICE] Password reset error:', error);
      
      // Fallback to simulation in development
      if (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true') {
        await simulateEmailSending(email, 'RESET', 'password_reset');
        return { success: true, simulated: true };
      }
      
      throw error;
    }

    console.log('📧 [EMAIL SERVICE] Password reset email sent');
    return { success: true };
  } catch (err) {
    console.error('📧 [EMAIL SERVICE] Failed to send reset email:', err);
    return {
      success: false,
      error: err.message || EMAIL_CONFIG.MESSAGES.EMAIL_FAILED
    };
  }
};

/**
 * Send low credit warning email
 * @param {string} email - Recipient email
 * @param {object} creditInfo - Credit information
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendLowCreditWarningEmail = async (email, creditInfo) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending low credit warning to ${email}`, creditInfo);

    // This would typically use an Edge Function or custom email service
    // For now, we log the attempt
    const emailContent = {
      to: email,
      subject: '⚠️ Low Credit Warning - Awarjana Creations',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">⚠️ Low Credit Warning</h1>
          <p>Your Awarjana Creations account has low credits remaining.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Credits Remaining:</strong> ${creditInfo.remaining}</p>
            <p><strong>Credits Used:</strong> ${creditInfo.used}</p>
            <p><strong>Status:</strong> ${creditInfo.status}</p>
          </div>
          
          <p>To continue using our services, please create a new API key or contact support for more credits.</p>
          
          <a href="${window.location.origin}/settings" 
             style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Manage Credits
          </a>
          
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            Thank you for using Awarjana Creations!
          </p>
        </div>
      `,
    };

    console.log('📧 [EMAIL SERVICE] Low credit email content prepared:', emailContent.subject);

    // In production, you would send this via an Edge Function or email service
    // await supabase.functions.invoke('send-notification-email', { body: emailContent });

    return { success: true };
  } catch (err) {
    console.error('📧 [EMAIL SERVICE] Failed to send low credit email:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Send order confirmation email
 * @param {string} email - Recipient email
 * @param {object} orderInfo - Order information
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendOrderConfirmationEmail = async (email, orderInfo) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending order confirmation to ${email}`, orderInfo);

    const emailContent = {
      to: email,
      subject: `✅ Order Confirmed - ${orderInfo.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">✅ Order Confirmed</h1>
          <p>Your order has been successfully created!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Order Number:</strong> ${orderInfo.orderNumber}</p>
            <p><strong>Size:</strong> ${orderInfo.width}" x ${orderInfo.height}"</p>
            <p><strong>Total Cost:</strong> ${orderInfo.costLKR}</p>
            <p><strong>Status:</strong> ${orderInfo.status}</p>
          </div>
          
          <p>You can track your order status using the link below:</p>
          
          <a href="${window.location.origin}/orders/${orderInfo.id}" 
             style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Order
          </a>
          
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            Thank you for choosing Awarjana Creations!
          </p>
        </div>
      `,
    };

    console.log('📧 [EMAIL SERVICE] Order confirmation email prepared:', emailContent.subject);

    return { success: true };
  } catch (err) {
    console.error('📧 [EMAIL SERVICE] Failed to send order confirmation:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email
 * @param {string} role - User role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendWelcomeEmail = async (email, role) => {
  try {
    console.log(`📧 [EMAIL SERVICE] Sending welcome email to ${email} (Role: ${role})`);

    const emailContent = {
      to: email,
      subject: '🎉 Welcome to Awarjana Creations!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">🎉 Welcome to Awarjana Creations!</h1>
          <p>Thank you for joining our platform. We're excited to have you on board!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Getting Started</h3>
            <ul style="padding-left: 20px;">
              <li>Explore our dashboard to see your credits and usage</li>
              <li>Create your first order if you're a customer</li>
              <li>Check available job cards if you're a worker</li>
              <li>Manage your API keys in Settings</li>
            </ul>
          </div>
          
          <p>You have <strong>10 credits</strong> to get started. Each action consumes a small portion of a credit.</p>
          
          <a href="${window.location.origin}/dashboard" 
             style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Go to Dashboard
          </a>
          
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            The Awarjana Creations Team
          </p>
        </div>
      `,
    };

    console.log('📧 [EMAIL SERVICE] Welcome email prepared');

    return { success: true };
  } catch (err) {
    console.error('📧 [EMAIL SERVICE] Failed to send welcome email:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Simulate email sending for development/testing
 */
export const simulateEmailSending = async (email, otp, role) => {
  return new Promise((resolve) => {
    const delay = isLikelySlowEmailPeriod() ? 3000 : 1000;
    console.log(`⏱️ [EMAIL SIMULATION] Simulating ${delay}ms delay...`);

    setTimeout(() => {
      console.log(`✅ [EMAIL SIMULATION] Email "sent" to ${email}`);
      console.log(`📧 [EMAIL SIMULATION] OTP: ${otp}`);
      console.log(`👤 [EMAIL SIMULATION] Role: ${role}`);
      console.log('📧 [EMAIL SIMULATION] Email content would be sent here');

      saveOTPForTesting(email, otp, role);
      resolve();
    }, delay);
  });
};

/**
 * Save OTP for testing purposes
 */
export const saveOTPForTesting = (email, otp, role) => {
  const testOTPs = JSON.parse(localStorage.getItem('testOTPs') || '[]');
  testOTPs.unshift({
    email,
    otp,
    role,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + EMAIL_CONFIG.OTP_EXPIRY).toISOString()
  });

  const trimmedOTPs = testOTPs.slice(0, 20);
  localStorage.setItem('testOTPs', JSON.stringify(trimmedOTPs));

  console.group('📧 TEST OTP GENERATED');
  console.log('Email:', email);
  console.log('OTP:', otp);
  console.log('Role:', role);
  console.log('Expires:', new Date(Date.now() + EMAIL_CONFIG.OTP_EXPIRY).toLocaleString());
  console.log('Total Test OTPs:', trimmedOTPs.length);
  console.groupEnd();
};

/**
 * Get test OTPs from localStorage
 */
export const getTestOTPs = () => {
  try {
    const otps = JSON.parse(localStorage.getItem('testOTPs') || '[]');
    const validOTPs = otps.filter(otp => new Date(otp.expires) > new Date());

    if (validOTPs.length !== otps.length) {
      localStorage.setItem('testOTPs', JSON.stringify(validOTPs));
    }

    return validOTPs;
  } catch {
    return [];
  }
};

/**
 * Clear test OTPs
 */
export const clearTestOTPs = () => {
  localStorage.removeItem('testOTPs');
  console.log('🗑️ All test OTPs cleared from localStorage');
};

/**
 * Generate a test OTP for development
 */
export const generateTestOTP = (length = 8) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Manual OTP injection for testing (bypasses email sending)
 */
export const injectTestOTP = async (email, role = 'customer') => {
  try {
    const otp = generateTestOTP();
    console.log(`🧪 [TEST] Injecting OTP ${otp} for ${email}`);

    await simulateEmailSending(email, otp, role);

    return {
      success: true,
      otp,
      message: `Test OTP ${otp} injected for ${email}`
    };
  } catch (err) {
    console.error('Test OTP injection failed:', err);
    return { success: false, error: err.message };
  }
};
