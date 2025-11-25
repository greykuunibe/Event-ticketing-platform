import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Public endpoint to get ticket types filtered by event's user (for ticket booking)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // eventId is required for public ticket booking
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    let userId: string | null = null

    // Get the event's userId
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('userId')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    userId = event.userId

    // Require userId - event must have a userId
    if (!userId) {
      console.error('Event has no userId:', eventId)
      return NextResponse.json(
        { error: 'Event configuration error' },
        { status: 500 }
      )
    }

    // Build query - always filter by userId and exclude NULL
    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('userId', userId)
      .not('userId', 'is', null)
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching ticket types from database:', error)
      throw error
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error in ticket-types API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket types' },
      { status: 500 }
    )
  }
}