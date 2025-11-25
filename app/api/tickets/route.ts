import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, fullName, phoneNumber, email, ticketType, quantity, items } = body

    // Validate eventId is provided
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculate total amount based on ticket type and quantity
    const ticketPrices: Record<string, number> = {
      'Regular Single': 120,
      'Regular Couple': 240,
      'VIP Couple': 300,
    }

    const pricePerTicket = ticketPrices[ticketType] || 0
    const ticketQuantity = quantity || 1
    const totalAmount = pricePerTicket * ticketQuantity

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        eventId,
        fullName,
        phoneNumber,
        email: email || null,
        ticketType,
        quantity: ticketQuantity,
        totalAmount,
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      throw new Error(ticketError?.message || 'Failed to create ticket')
    }

    // Create ticket items
    if (items && items.length > 0) {
      const ticketItems = items.map((item: { dish: string; drink: string }) => ({
        ticketId: ticket.id,
        dish: item.dish,
        drink: item.drink,
      }))

      const { error: itemsError } = await supabase
        .from('ticket_items')
        .insert(ticketItems)

      if (itemsError) {
        throw new Error(itemsError.message)
      }
    }

    // Fetch ticket with items
    const { data: ticketWithItems, error: fetchError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*)
      `)
      .eq('id', ticket.id)
      .single()

    if (fetchError || !ticketWithItems) {
      throw new Error(fetchError?.message || 'Failed to fetch ticket')
    }

    return NextResponse.json(ticketWithItems, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const eventId = searchParams.get('eventId')

    let query = supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*)
      `)
      .order('createdAt', { ascending: false })

    // Filter by event if provided
    if (eventId) {
      query = query.eq('eventId', eventId)
    }

    if (status && status !== 'all') {
      query = query.eq('paymentStatus', status)
    }

    if (search) {
      query = query.or(
        `fullName.ilike.%${search}%,phoneNumber.ilike.%${search}%,email.ilike.%${search}%,paymentReference.ilike.%${search}%`
      )
    }

    const { data: tickets, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(tickets || [])
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

