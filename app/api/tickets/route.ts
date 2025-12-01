import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('[TICKET API] ===== TICKET CREATION STARTED =====')
    const body = await request.json()
    const { eventId, fullName, phoneNumber, email, ticketType, quantity, items } = body

    console.log('[TICKET API] Step 1: Received ticket creation request:', {
      eventId,
      fullName,
      phoneNumber,
      email,
      ticketType,
      quantity,
      itemsCount: items?.length || 0
    })

    // Validate required fields
    if (!eventId) {
      console.error('[TICKET API] ERROR: Event ID is required')
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    if (!ticketType || ticketType.trim() === '') {
      console.error('[TICKET API] ERROR: Ticket type is required')
      return NextResponse.json(
        { error: 'Ticket type is required' },
        { status: 400 }
      )
    }

    console.log('[TICKET API] Step 2: Validating event exists...')
    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('[TICKET API] ERROR: Event not found:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    console.log('[TICKET API] Step 3: Event found, fetching userId...')
    // Get event's userId to fetch correct ticket types
    const { data: eventWithUser, error: eventUserError } = await supabase
      .from('events')
      .select('userId')
      .eq('id', eventId)
      .single()

    if (eventUserError || !eventWithUser || !eventWithUser.userId) {
      console.error('[TICKET API] ERROR: Event configuration error:', eventUserError)
      return NextResponse.json(
        { error: 'Event configuration error' },
        { status: 500 }
      )
    }

    console.log('[TICKET API] Step 4: Fetching ticket type from database...')
    // Check if ticketType is a UUID (ID) or a name string
    // UUID format: 8-4-4-4-12 hexadecimal characters
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketType)
    
    // Fetch ticket type price from database - try by ID first, then by name
    let ticketTypeQuery = supabase
      .from('ticket_types')
      .select('id, name, price')
      .eq('userId', eventWithUser.userId)

    if (isUUID) {
      ticketTypeQuery = ticketTypeQuery.eq('id', ticketType)
    } else {
      ticketTypeQuery = ticketTypeQuery.eq('name', ticketType.trim())
    }

    const { data: ticketTypeData, error: ticketTypeError } = await ticketTypeQuery.single()

    if (ticketTypeError || !ticketTypeData) {
      console.error('[TICKET API] ERROR: Ticket type not found:', {
        error: ticketTypeError,
        ticketType,
        isUUID,
        userId: eventWithUser.userId
      })
      
      // Try to get available ticket types for better error message
      const { data: availableTypes } = await supabase
        .from('ticket_types')
        .select('id, name')
        .eq('userId', eventWithUser.userId)
      
      const availableNames = availableTypes?.map(t => t.name).join(', ') || 'none'
      
      return NextResponse.json(
        { 
          error: `Ticket type "${ticketType}" not found or not configured for this event. Available types: ${availableNames}`,
          availableTypes: availableTypes?.map(t => ({ id: t.id, name: t.name })) || []
        },
        { status: 400 }
      )
    }

    console.log('[TICKET API] Step 5: Ticket type found:', {
      id: ticketTypeData.id,
      name: ticketTypeData.name,
      price: ticketTypeData.price
    })

    // Calculate total amount based on ticket type price and quantity
    const pricePerTicket = parseFloat(ticketTypeData.price.toString())
    const ticketQuantity = quantity || 1
    const totalAmount = pricePerTicket * ticketQuantity

    console.log('[TICKET API] Step 6: Calculated pricing:', {
      pricePerTicket,
      quantity: ticketQuantity,
      totalAmount
    })

    // Use the ticket type name (not ID) for storage
    const ticketTypeName = ticketTypeData.name || ticketType

    console.log('[TICKET API] Step 7: Creating ticket in database...')
    // Create ticket
    // Explicitly set paymentStatus to 'pending' so payment can be initialized
    // (Even though DB default is 'paid', we want to start as 'pending' until payment succeeds)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        eventId,
        fullName,
        phoneNumber,
        email: email || null,
        ticketType: ticketTypeName,
        quantity: ticketQuantity,
        totalAmount,
        paymentStatus: 'pending', // Explicitly set to pending so payment can be initialized
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      console.error('[TICKET API] ERROR: Failed to create ticket:', ticketError)
      throw new Error(ticketError?.message || 'Failed to create ticket')
    }

    console.log('[TICKET API] Step 8: Ticket created in database:', {
      ticketId: ticket.id,
      paymentStatus: ticket.paymentStatus,
      totalAmount: ticket.totalAmount,
      paymentReference: ticket.paymentReference
    })

    // Create ticket items
    if (items && items.length > 0) {
      console.log('[TICKET API] Step 9: Creating ticket items...', items.length, 'items')
      const ticketItems = items.map((item: { dish: string; drink: string }) => ({
        ticketId: ticket.id,
        dish: item.dish,
        drink: item.drink,
      }))

      const { error: itemsError } = await supabase
        .from('ticket_items')
        .insert(ticketItems)

      if (itemsError) {
        console.error('[TICKET API] ERROR: Failed to create ticket items:', itemsError)
        throw new Error(itemsError.message)
      }
      console.log('[TICKET API] Step 10: Ticket items created successfully')
    }

    console.log('[TICKET API] Step 11: Fetching complete ticket with items...')
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
      console.error('[TICKET API] ERROR: Failed to fetch ticket:', fetchError)
      throw new Error(fetchError?.message || 'Failed to fetch ticket')
    }

    console.log('[TICKET API] Step 12: Ticket creation complete:', {
      ticketId: ticketWithItems.id,
      paymentStatus: ticketWithItems.paymentStatus,
      totalAmount: ticketWithItems.totalAmount,
      itemsCount: ticketWithItems.ticket_items?.length || 0
    })
    console.log('[TICKET API] ===== TICKET CREATION COMPLETE =====')

    return NextResponse.json(ticketWithItems, { status: 201 })
  } catch (error) {
    console.error('[TICKET API] EXCEPTION: Error creating ticket:', error)
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

    console.log('[TICKETS API GET] Request params:', { status, search, eventId })

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
      console.log('[TICKETS API GET] Searching for:', search)
      query = query.or(
        `fullName.ilike.%${search}%,phoneNumber.ilike.%${search}%,email.ilike.%${search}%,paymentReference.ilike.%${search}%`
      )
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error('[TICKETS API GET] Query error:', error)
      throw new Error(error.message)
    }

    console.log('[TICKETS API GET] Found tickets:', tickets?.length || 0)
    if (search && tickets) {
      console.log('[TICKETS API GET] Matching tickets:', tickets.map((t: any) => ({
        id: t.id,
        paymentReference: t.paymentReference,
        paymentStatus: t.paymentStatus,
        fullName: t.fullName
      })))
    }

    return NextResponse.json(tickets || [])
  } catch (error) {
    console.error('[TICKETS API GET] Exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

