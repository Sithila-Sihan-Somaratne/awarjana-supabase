import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOTPVerification(email, otp) {
  console.log('🧪 Testing OTP verification...')
  console.log('📧 Email:', email)
  console.log('🔢 OTP:', otp)
  
  try {
    // Test OTP verification directly
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    })
    
    console.log('📊 Result:', { data, error })
    
    if (error) {
      console.error('❌ OTP verification failed:', error.message)
      return false
    }
    
    console.log('✅ OTP verification successful!')
    console.log('👤 User:', data.user?.email)
    console.log('🔑 Session:', !!data.session)
    return true
    
  } catch (err) {
    console.error('💥 Unexpected error:', err.message)
    return false
  }
}

// Usage: node scripts/test-otp.js email@example.com 12345678
const args = process.argv.slice(2)
if (args.length === 2) {
  testOTPVerification(args[0], args[1])
} else {
  console.log('Usage: node scripts/test-otp.js <email> <otp>')
  console.log('Example: node scripts/test-otp.js test@example.com 12345678')
}