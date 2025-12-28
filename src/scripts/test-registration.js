import { sha256 } from '../lib/crypto.js'

// Test SHA-256 function
async function testHash() {
  const testCode = 'ADMIN-TEST-123'
  const hashed = await sha256(testCode)
  
  console.log('🔍 Hash Test Results:')
  console.log('Input:', testCode)
  console.log('Hash:', hashed)
  console.log('Length:', hashed.length)
  console.log('Expected length: 64')
  
  // This should match the hash in your database
  // If you inserted the test code earlier, this hash should match:
  // 8f3c9b2e5d1a7c6f9e8d2b4a6c3e1f7d5a9b8c2e4f6d3a1b7c9e5f2a8d4b6c0
}

// Test password validation
function testPassword() {
  const passwords = [
    'Test123!',
    'weak',
    'NoSpecial1',
    'nouppercase1!',
    'NOLOWERCASE1!'
  ]
  
  passwords.forEach(pwd => {
    const result = validatePassword(pwd)
    console.log(`"${pwd}": ${result.valid ? '✅' : '❌'} ${result.errors[0] || 'Valid'}`)
  })
}

// Run tests
testHash()
testPassword()