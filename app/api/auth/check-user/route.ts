import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

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
  } catch (error) {
    console.error('Error in check-user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

