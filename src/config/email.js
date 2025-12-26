// src/config/email.js
/**
 * Email Configuration
 * Settings for handling Supabase email delivery
 */

// Create the main config object
export const EMAIL_CONFIG = {
  // Retry settings for email operations
  RETRY_ATTEMPTS: 3,
  RETRY_INITIAL_DELAY: 1000, // 1 second
  RETRY_MAX_DELAY: 5000, // 5 seconds
  
  // Email timeouts
  SIGNUP_EMAIL_TIMEOUT: 30000, // 30 seconds
  RESET_EMAIL_TIMEOUT: 30000, // 30 seconds
  RESEND_EMAIL_TIMEOUT: 20000, // 20 seconds
  
  // OTP settings
  OTP_LENGTH: 8,
  OTP_EXPIRY: 15 * 60 * 1000, // 15 minutes (changed from 24 hours)
  OTP_RESEND_COOLDOWN: 60000, // 1 minute between resends
  
  // Email validation
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 254,
  
  // Messages
  MESSAGES: {
    SIGNUP_EMAIL_SENT: 'Verification code sent! Check your inbox and spam folder.',
    SIGNUP_EMAIL_RESENT: 'New verification code sent! Check your email.',
    RESET_EMAIL_SENT: 'Password reset email sent. Check your inbox.',
    EMAIL_VERIFICATION_PENDING: 'Waiting for email delivery... This may take a few moments.',
    EMAIL_DELIVERY_SLOW: 'Email delivery is slow. Please wait or try resending.',
    EMAIL_FAILED: 'Failed to send email. Please check your connection and try again.',
  }
}

// Helper functions as named exports
export function isLikelySlowEmailPeriod() {
  const hour = new Date().getHours()
  // Email delivery is often slower during peak hours (9-17)
  return hour >= 9 && hour <= 17
}

export function getRecommendedRetryDelay() {
  if (isLikelySlowEmailPeriod()) {
    return 2000 // 2 seconds during peak hours
  }
  return 1000 // 1 second otherwise
}