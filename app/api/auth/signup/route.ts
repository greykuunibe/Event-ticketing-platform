import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, name, googleId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, deletedAt')
      .eq('email', email)
      .single()

    // Check if user was hard-deleted (in deleted_users table)
    const { data: deletedUser } = await supabase
      .from('deleted_users')
      .select('id, email, deletedAt')
      .eq('email', email)
      .single()

    // If user was hard-deleted, prevent recreation
    if (deletedUser) {
      return NextResponse.json(
        { error: 'This account was deleted and cannot be recreated. Please contact support if you need assistance.' },
        { status: 403 }
      )
    }

    if (existingUser) {
      // If user was soft-deleted, prevent them from recreating account
      if (existingUser.deletedAt) {
        return NextResponse.json(
          { error: 'This account was deleted and cannot be recreated. Please contact support if you need assistance.' },
          { status: 403 }
        )
      }
      // User already exists
      return NextResponse.json(
        { error: 'User already exists. Please sign in instead.' },
        { status: 400 }
      )
    }

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: googleId || crypto.randomUUID(),
        email,
        name: name || email.split('@')[0],
        emailVerified: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error('Error in signup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
