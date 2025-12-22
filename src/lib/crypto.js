// src/lib/crypto.js
export async function sha256(message) {
  // Convert string to Uint8Array
  const msgBuffer = new TextEncoder().encode(message);
  
  // Hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateResetToken() {
  return crypto.randomUUID();
}

/**
 * Retry logic with exponential backoff for email operations
 * Helps handle Supabase email service delays
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Retry] Attempt ${attempt + 1}/${maxRetries + 1}`)
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`⏳ [Retry] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error('❌ [Retry] All attempts failed:', lastError)
  throw lastError
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error) {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    const message = error.message.toLowerCase()
    
    if (message.includes('invalid login credentials')) {
      return 'Invalid email or password'
    }
    if (message.includes('email not confirmed')) {
      return 'Please verify your email address first'
    }
    if (message.includes('user already registered')) {
      return 'This email is already registered'
    }
    if (message.includes('password')) {
      return 'Password does not meet requirements'
    }
    if (message.includes('network')) {
      return 'Network error. Please check your connection.'
    }
    
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}