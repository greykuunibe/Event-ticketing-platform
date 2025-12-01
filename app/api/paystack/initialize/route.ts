import { NextRequest, NextResponse } from 'next/server'
import { initializePayment } from '@/lib/paystack'
import { supabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('[PAYSTACK INIT] ===== PAYMENT INITIALIZATION STARTED =====')
    const body = await request.json()
    const { ticketId, email } = body

    console.log('[PAYSTACK INIT] Step 1: Received payment initialization request:', {
      ticketId,
      email
    })

    console.log('[PAYSTACK INIT] Step 2: Fetching ticket from database...')
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('[PAYSTACK INIT] ERROR: Ticket not found:', ticketError)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    console.log('[PAYSTACK INIT] Step 3: Ticket found:', {
      ticketId: ticket.id,
      currentPaymentStatus: ticket.paymentStatus,
      currentTotalAmount: ticket.totalAmount,
      currentPaymentReference: ticket.paymentReference
    })

    if (ticket.paymentStatus === 'paid') {
      console.error('[PAYSTACK INIT] ERROR: Ticket already paid')
      return NextResponse.json(
        { error: 'Ticket already paid' },
        { status: 400 }
      )
    }

    console.log('[PAYSTACK INIT] Step 4: Fetching event userId...')
    // Get event's userId to fetch current ticket type price
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('userId')
      .eq('id', ticket.eventId)
      .single()

    if (eventError || !event || !event.userId) {
      console.error('[PAYSTACK INIT] ERROR: Event configuration error:', eventError)
      return NextResponse.json(
        { error: 'Event configuration error' },
        { status: 500 }
      )
    }

    // Validate ticket type exists
    if (!ticket.ticketType || ticket.ticketType.trim() === '') {
      console.error('[PAYSTACK INIT] ERROR: Ticket type is missing')
      return NextResponse.json(
        { error: 'Ticket type is missing from ticket' },
        { status: 400 }
      )
    }

    console.log('[PAYSTACK INIT] Step 5: Fetching current ticket type price...')
    // Fetch current ticket type price from database (recalculate to ensure accuracy)
    const { data: ticketTypeData, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('price')
      .eq('name', ticket.ticketType.trim())
      .eq('userId', event.userId)
      .single()

    if (ticketTypeError || !ticketTypeData) {
      console.error('[PAYSTACK INIT] ERROR: Ticket type not found:', {
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

    console.log('[PAYSTACK INIT] Step 6: Recalculated pricing:', {
      pricePerTicket,
      quantity: ticketQuantity,
      calculatedTotalAmount,
      originalTotalAmount: ticket.totalAmount
    })

    // Generate payment reference
    const paymentReference = `TKT-${randomBytes(8).toString('hex').toUpperCase()}`

    console.log('[PAYSTACK INIT] Step 7: Generated payment reference:', paymentReference)

    console.log('[PAYSTACK INIT] Step 8: Updating ticket with payment reference and recalculated amount...')
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
      console.error('[PAYSTACK INIT] ERROR: Failed to update ticket:', updateError)
      throw new Error(updateError.message)
    }

    console.log('[PAYSTACK INIT] Step 9: Ticket updated successfully')
    console.log('[PAYSTACK INIT] Step 10: Calling Paystack initializePayment API...')

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

    console.log('[PAYSTACK INIT] Step 11: Paystack response:', {
      status: paymentResponse.status,
      hasData: !!paymentResponse.data,
      hasAuthorizationUrl: !!paymentResponse.data?.authorization_url
    })

    if (paymentResponse.status && paymentResponse.data) {
      console.log('[PAYSTACK INIT] Step 12: Payment initialized successfully:', {
        reference: paymentReference,
        authorizationUrl: paymentResponse.data.authorization_url
      })
      console.log('[PAYSTACK INIT] ===== PAYMENT INITIALIZATION COMPLETE =====')
      return NextResponse.json({
        authorizationUrl: paymentResponse.data.authorization_url,
        accessCode: paymentResponse.data.access_code,
        reference: paymentReference,
      })
    }

    console.error('[PAYSTACK INIT] ERROR: Paystack initialization failed - invalid response')
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  } catch (error) {
    console.error('[PAYSTACK INIT] EXCEPTION: Error initializing payment:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}

