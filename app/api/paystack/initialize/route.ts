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

    // Generate payment reference
    const paymentReference = `TKT-${randomBytes(8).toString('hex').toUpperCase()}`

    // Update ticket with payment reference
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ paymentReference })
      .eq('id', ticketId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Initialize payment
    const paymentResponse = await initializePayment(
      email || ticket.email || 'customer@example.com',
      ticket.totalAmount,
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

