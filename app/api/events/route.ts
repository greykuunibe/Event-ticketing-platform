import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

// Create event (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, eventDate, location } = body

    // Generate unique QR code identifier
    const qrCode = randomBytes(16).toString('base64url')

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        name,
        description: description || null,
        eventDate: eventDate ? new Date(eventDate).toISOString() : null,
        location: location || null,
        qrCode,
        userId: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

// Get all events (filtered by user)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        tickets:tickets(count)
      `)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(events || [])
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

