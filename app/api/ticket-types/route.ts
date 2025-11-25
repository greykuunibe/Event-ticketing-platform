import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Public endpoint to get ticket types filtered by event's user (for ticket booking)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    let userId: string | null = null

    // If eventId is provided, get the event's userId
    if (eventId) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('userId')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        )
      }

      userId = event.userId
    }

    // Require userId - either from event or authenticated user
    // Never return items with NULL userId
    if (!userId) {
      return NextResponse.json([])
    }

    // Build query - always filter by userId and exclude NULL
    const query = supabase
      .from('ticket_types')
      .select('*')
      .eq('userId', userId)
      .not('userId', 'is', null)
      .order('price', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching ticket types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket types' },
      { status: 500 }
    )
  }
}