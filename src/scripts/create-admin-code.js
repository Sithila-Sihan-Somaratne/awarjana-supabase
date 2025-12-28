import { createClient } from '@supabase/supabase-js'
import { sha256 } from '../src/lib/crypto.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminCode() {
  const code = 'AWARJANA-ADMIN-2024'
  const hashedCode = await sha256(code)
  
  const { data, error } = await supabase
    .from('registration_codes')
    .insert([
      {
        code: hashedCode,
        role: 'admin',
        is_used: false
      }
    ])
    .select()
  
  if (error) {
    console.error('❌ Failed to create admin code:', error.message)
  } else {
    console.log('✅ Admin registration code created!')
    console.log(`📋 Code: ${code}`)
    console.log(`🔐 Hashed: ${hashedCode}`)
    console.log('⚠️  Save this code securely!')
  }
}

createAdminCode()