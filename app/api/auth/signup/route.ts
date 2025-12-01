import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, googleId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Test database connection first
    const { error: connectionError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (connectionError) {
      console.error('Database connection error:', connectionError)
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check your Supabase configuration.',
          details: connectionError.message 
        },
        { status: 500 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, name, deletedAt')
      .eq('email', email)
      .single()

    // If error is not "not found", it's a real error
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return NextResponse.json(
        { 
          error: 'Failed to check user existence',
          details: checkError.message 
        },
        { status: 500 }
      )
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate user ID
    const userId = googleId || randomUUID()
    
    console.log('Creating user with:', {
      email,
      userId,
      hasGoogleId: !!googleId,
      name: name || email.split('@')[0]
    })

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        emailVerified: new Date().toISOString(),
        deletedAt: null, // Explicitly set to null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      
      // Provide more specific error messages
      if (createError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      
      if (createError.code === '23503') { // Foreign key violation
        return NextResponse.json(
          { error: 'Database constraint error. Please contact support.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Failed to create user account',
          details: createError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error: any) {
    console.error('Error in signup:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    )
  }
}