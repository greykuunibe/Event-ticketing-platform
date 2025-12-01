import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paymentReference } = body

    // Find ticket by ID or payment reference
    let ticket = null

    if (id) {
      const { data: ticketById } = await supabase
        .from('tickets')
        .select('id, paymentReference')
        .eq('id', id)
        .single()

      if (ticketById) {
        ticket = ticketById
      }
    }

    // If not found by ID, try payment reference
    if (!ticket && paymentReference) {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, paymentReference')
        .or(`paymentReference.eq.${paymentReference},paymentReference.ilike.${paymentReference}`)
        .limit(1)

      if (tickets && tickets.length > 0) {
        ticket = tickets[0]
      }
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Update payment status to paid
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ paymentStatus: 'paid' })
      .eq('id', ticket.id)

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment status', details: updateError.message },
        { status: 500 }
      )
    }

    // Update payment reference if provided and different
    if (paymentReference && paymentReference !== ticket.paymentReference) {
      const { error: refError } = await supabase
        .from('tickets')
        .update({ paymentReference })
        .eq('id', ticket.id)

      if (refError) {
        console.error('Error updating payment reference:', refError)
        // Don't fail if reference update fails
      }
    }

    return NextResponse.json({ 
      success: true,
      ticketId: ticket.id,
      paymentStatus: 'paid'
    })
  } catch (error: any) {
    console.error('Error in update-payment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

