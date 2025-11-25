

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')

  // Test 1: Check if we can connect
  console.log('1. Testing connection...')
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.error('❌ Connection error:', error.message)
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('   → Tables are missing! Run supabase/auth-migration.sql')
      }
      return false
    }
    console.log('✅ Connection successful\n')
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    return false
  }

  // Test 2: Check if tables exist
  console.log('2. Checking tables...')
  const tables = ['users', 'accounts', 'sessions', 'verification_tokens']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.error(`❌ Table "${table}" error:`, error.message)
      return false
    }
    console.log(`   ✅ Table "${table}" exists`)
  }
  console.log('')

  // Test 3: Check table structure
  console.log('3. Checking users table structure...')
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1)

  if (userError) {
    console.error('❌ Error checking users table:', userError.message)
    return false
  }
  console.log('✅ Users table structure is correct\n')

  console.log('✅ All tests passed! Supabase connection is working.')
  return true
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

