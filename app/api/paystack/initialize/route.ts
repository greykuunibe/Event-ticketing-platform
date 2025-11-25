import { NextRequest, NextResponse } from 'next/server'
import { initializePayment } from '@/lib/paystack'
import { supabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, email } = body

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Ticket already paid' },
        { status: 400 }
      )
    }

    // Get event's userId to fetch current ticket type price
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('userId')
      .eq('id', ticket.eventId)
      .single()

    if (eventError || !event || !event.userId) {
      return NextResponse.json(
        { error: 'Event configuration error' },
        { status: 500 }
      )
    }

    // Validate ticket type exists
    if (!ticket.ticketType || ticket.ticketType.trim() === '') {
      return NextResponse.json(
        { error: 'Ticket type is missing from ticket' },
        { status: 400 }
      )
    }

    // Fetch current ticket type price from database (recalculate to ensure accuracy)
    const { data: ticketTypeData, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('price')
      .eq('name', ticket.ticketType.trim())
      .eq('userId', event.userId)
      .single()

    if (ticketTypeError || !ticketTypeData) {
      console.error('Error fetching ticket type:', {
        error: ticketTypeError,
        ticketType: ticket.ticketType,
        userId: event.userId
      })
      return NextResponse.json(
        { error: `Ticket type "${ticket.ticketType}" not found or not configured` },
        { status: 400 }
      )
    }

    // Recalculate total amount using current price from database
    const pricePerTicket = parseFloat(ticketTypeData.price.toString())
    const ticketQuantity = ticket.quantity || 1
    const calculatedTotalAmount = pricePerTicket * ticketQuantity

    // Generate payment reference
    const paymentReference = `TKT-${randomBytes(8).toString('hex').toUpperCase()}`

    // Update ticket with payment reference and recalculated total amount
    // This ensures the ticket reflects current pricing
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        paymentReference,
        totalAmount: calculatedTotalAmount
      })
      .eq('id', ticketId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Initialize payment with recalculated amount
    const paymentResponse = await initializePayment(
      email || ticket.email || 'customer@example.com',
      calculatedTotalAmount,
      paymentReference,
      {
        ticketId: ticket.id,
        fullName: ticket.fullName,
        ticketType: ticket.ticketType,
      }
    )

    if (paymentResponse.status && paymentResponse.data) {
      return NextResponse.json({
        authorizationUrl: paymentResponse.data.authorization_url,
        accessCode: paymentResponse.data.access_code,
        reference: paymentReference,
      })
    }

    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error initializing payment:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}

