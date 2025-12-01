import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function checkUser(email: string) {
  try {
    // First try with deletedAt check
    let { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, deletedAt')
      .eq('email', email)
      .is('deletedAt', null) // Only get non-deleted users
      .single()

    // If deletedAt column doesn't exist or query fails, try without it
    if (error && error.code !== 'PGRST116') {
      console.log('Retrying user check without deletedAt filter')
      const retryQuery = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', email)
        .single()
      
      if (!retryQuery.error && retryQuery.data) {
        user = retryQuery.data
        error = null
      } else if (retryQuery.error && retryQuery.error.code === 'PGRST116') {
        // User doesn't exist
        return NextResponse.json({ exists: false })
      } else if (retryQuery.error) {
        error = retryQuery.error
      }
    }

    // PGRST116 is "not found" error - user doesn't exist
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ exists: false })
    }

    if (error) {
      console.error('Error checking user:', error)
      return NextResponse.json(
        { error: 'Failed to check user', details: error.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    // Check if user is soft-deleted
    if ((user as any).deletedAt) {
      // User exists but is deleted - treat as not existing for signup purposes
      return NextResponse.json({ exists: false })
    }

    // User exists and is not deleted
    return NextResponse.json({
      exists: true,
      userId: user.id,
      name: user.name,
    })
  } catch (error: any) {
    console.error('Exception in checkUser:', error)
    return NextResponse.json(
      { error: 'Failed to check user', details: error.message },
      { status: 500 }
    )
  }
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

