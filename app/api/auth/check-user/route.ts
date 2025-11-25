import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function checkUser(email: string) {
  // Check if user exists
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email)
    .is('deletedAt', null) // Only get non-deleted users
    .single()

  // PGRST116 is "not found" error - user doesn't exist
  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ exists: false })
  }

  if (error) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json({ exists: false })
  }

  // User exists
  return NextResponse.json({
    exists: true,
    userId: user.id,
    name: user.name,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    return await checkUser(email)
  } catch (error) {
    console.error('Error in check-user GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    return await checkUser(email)

  } catch (error) {
    console.error('Error in check-user POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

