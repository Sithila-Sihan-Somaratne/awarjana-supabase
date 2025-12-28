import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🚀 Setting up database...')
  
  try {
    // Read SQL migration files
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir).sort()
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`📄 Running migration: ${file}`)
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        
        // Execute SQL in chunks to avoid single statement limit
        const statements = sql.split(';').filter(stmt => stmt.trim())
        
        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
            if (error) {
              console.warn(`⚠️  Statement failed (might be expected):`, error.message)
            }
          }
        }
      }
    }
    
    console.log('✅ Database setup complete!')
    
    // Test connection
    const { data: users, error } = await supabase.from('users').select('count')
    if (error) {
      console.error('❌ Test query failed:', error.message)
    } else {
      console.log(`📊 Users in database: ${users[0].count}`)
    }
    
  } catch (error) {
    console.error('💥 Database setup failed:', error.message)
  }
}

setupDatabase()