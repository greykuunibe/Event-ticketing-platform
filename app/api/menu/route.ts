import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

// Public endpoint to get menu items filtered by event's user (for ticket booking)
// Or by authenticated user (for admin panel)
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
    } else {
      // If no eventId, check if user is authenticated (for admin panel)
      const user = await getAuthenticatedUser()
      if (user) {
        userId = user.id
      }
    }

    // Require userId - either from event or authenticated user
    // Never return items with NULL userId
    if (!userId) {
      return NextResponse.json({
        dishes: [],
        drinks: [],
      })
    }

    // Build queries - always filter by userId and exclude NULL
    const dishesQuery = supabase
      .from('dishes')
      .select('id, name, imageUrl')
      .eq('userId', userId)
      .not('userId', 'is', null)
      .order('name', { ascending: true })

    const drinksQuery = supabase
      .from('drinks')
      .select('id, name, imageUrl')
      .eq('userId', userId)
      .not('userId', 'is', null)
      .order('name', { ascending: true })

    const [dishesRes, drinksRes] = await Promise.all([
      dishesQuery,
      drinksQuery,
    ])

    if (dishesRes.error) throw dishesRes.error
    if (drinksRes.error) throw drinksRes.error

    return NextResponse.json({
      dishes: dishesRes.data || [],
      drinks: drinksRes.data || [],
    })
  } catch (error: any) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    )
  }
}

