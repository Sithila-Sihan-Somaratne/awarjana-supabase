// Utility functions for cryptography and validation

// Hash a string using SHA-256
export async function sha256(message) {
  try {
    // Encode the message as UTF-8
    const msgBuffer = new TextEncoder().encode(message)
    
    // Hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (error) {
    console.error('SHA-256 hashing failed:', error)
    throw new Error('Failed to hash data')
  }
}

// Validate password strength
export function validatePassword(password) {
  const errors = []
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)')
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)')
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)')
  }
  
  // Check for special character
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Retry function with exponential backoff
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [Retry] Attempt ${attempt}/${maxRetries}`)
    
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error
      
      // Don't retry on certain errors
      if (error?.message?.includes('Email rate limit exceeded') ||
          error?.message?.includes('User already registered') ||
          error?.message?.includes('Invalid login credentials')) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1)
      
      // Only wait if not the last attempt
      if (attempt < maxRetries) {
        console.log(`⏳ [Retry] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Format error messages for display
export function formatErrorMessage(error) {
  if (!error) return 'An unknown error occurred'
  
  if (typeof error === 'string') return error
  
  if (error.message) {
    // Supabase specific errors
    if (error.message.includes('Email rate limit exceeded')) {
      return 'Too many attempts. Please try again in a few minutes.'
    }
    
    if (error.message.includes('User already registered')) {
      return 'An account with this email already exists. Please try logging in.'
    }
    
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.'
    }
    
    if (error.message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

// Generate a random code for registration
export function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}