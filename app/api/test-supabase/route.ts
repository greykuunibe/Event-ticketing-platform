import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test 1: Check connection
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (usersError) {
      return NextResponse.json(
        {
          success: false,
          error: usersError.message,
          hint: usersError.message.includes('relation') 
            ? 'Tables are missing. Run supabase/auth-migration.sql in Supabase SQL Editor.'
            : 'Check your SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL',
        },
        { status: 500 }
      )
    }

    // Test 2: Check all required tables
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens']
    const tableStatus: Record<string, boolean> = {}

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      tableStatus[table] = !error
      if (error) {
        console.error(`Table ${table} error:`, error.message)
      }
    }

    const allTablesExist = Object.values(tableStatus).every(Boolean)

    return NextResponse.json({
      success: allTablesExist,
      connection: 'OK',
      tables: tableStatus,
      message: allTablesExist
        ? '✅ All tables exist and connection is working!'
        : '❌ Some tables are missing. Run supabase/auth-migration.sql',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        hint: 'Check your environment variables and Supabase connection',
      },
      { status: 500 }
    )
  }
}

