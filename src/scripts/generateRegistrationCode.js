// scripts/generateRegistrationCode.js
import { supabase } from '../lib/supabase.js';
import { sha256 } from '../lib/crypto.js';

async function generateRegistrationCode(role, count = 1) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random code
    const plainCode = `${role.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}-${Date.now().toString(36)}`;
    
    // Hash it
    const hashedCode = await sha256(plainCode);
    
    // Store in database
    const { error } = await supabase
      .from('registration_codes')
      .insert({
        code: hashedCode,
        role: role,
        is_used: false
      });
    
    if (error) {
      console.error(`Error storing code ${i+1}:`, error);
    } else {
      codes.push({
        plainCode: plainCode,  // Give this to the user
        role: role,
        hashedCode: hashedCode  // What's stored in DB
      });
      console.log(`Generated ${role} code: ${plainCode}`);
    }
  }
  
  return codes;
}

// Example usage
// generateRegistrationCode('admin', 5);
// generateRegistrationCode('employer', 10);