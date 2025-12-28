#!/usr/bin/env node
/**
 * Simple Registration Code Generator
 * Generates secure registration codes for workers and admins
 * 
 * Usage:
 *   node generate-codes.js worker 5
 *   node generate-codes.js admin 2
 */

import crypto from 'crypto';

// SHA-256 hash function
async function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Generate random code
function generateCode(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const role = args[0] || 'worker';
  const count = parseInt(args[1]) || 1;

  if (!['worker', 'admin'].includes(role)) {
    console.error('❌ Error: Role must be "worker" or "admin"');
    process.exit(1);
  }

  console.log(`\n🔐 Generating ${count} ${role} registration code(s)...\n`);
  console.log('=' .repeat(80));

  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const plainCode = generateCode();
    const hashedCode = await sha256(plainCode);
    
    codes.push({
      plain: plainCode,
      hashed: hashedCode,
      role: role
    });

    console.log(`\n📝 Code #${i + 1}:`);
    console.log(`   Plain Code:  ${plainCode}`);
    console.log(`   Role:        ${role}`);
    console.log(`   Hashed:      ${hashedCode.substring(0, 32)}...`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 SQL to insert into Supabase:\n');
  console.log('-- Copy and paste this into Supabase SQL Editor --\n');
  
  codes.forEach((code, i) => {
    console.log(`INSERT INTO registration_codes (code, role, is_used) VALUES ('${code.hashed}', '${code.role}', false);`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ IMPORTANT: Share these PLAIN CODES with users:\n');
  
  codes.forEach((code, i) => {
    console.log(`   ${i + 1}. ${code.plain} (${code.role})`);
  });

  console.log('\n⚠️  WARNING: These plain codes will NOT be shown again!');
  console.log('   Save them securely before closing this window.\n');
}

main().catch(console.error);
