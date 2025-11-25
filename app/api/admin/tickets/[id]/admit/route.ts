import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'
import { sendAdmissionEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First, verify the ticket exists and belongs to one of the user's events
    const { data: userEvents, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('userId', user.id)

    if (eventsError) {
      throw new Error(eventsError.message)
    }

    const userEventIds = userEvents?.map(e => e.id) || []

    if (userEventIds.length === 0) {
      return NextResponse.json({ error: 'No events found' }, { status: 404 })
    }

    // Get the ticket with all related data
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*),
        events (*)
      `)
      .eq('id', id)
      .in('eventId', userEventIds)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if already admitted
    if (ticket.admitted) {
      return NextResponse.json(
        { error: 'Ticket already admitted', ticket },
        { status: 400 }
      )
    }

    // Check if ticket is paid
    if (ticket.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Only paid tickets can be admitted' },
        { status: 400 }
      )
    }

    // Update ticket to admitted
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        admitted: true,
        admittedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        ticket_items (*),
        events (*)
      `)
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Send admission email if email is provided
    if (updatedTicket.email) {
      try {
        await sendAdmissionEmail(updatedTicket.email, {
          fullName: updatedTicket.fullName,
          ticketType: updatedTicket.ticketType,
          items: (updatedTicket.ticket_items || []).map((item: any) => ({
            dish: item.dish,
            drink: item.drink,
          })),
          paymentReference: updatedTicket.paymentReference || '',
          totalAmount: updatedTicket.totalAmount,
          eventName: (updatedTicket.events as any)?.name || 'Event',
          admittedAt: updatedTicket.admittedAt,
        })
      } catch (emailError) {
        console.error('Error sending admission email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket admitted successfully',
    })
  } catch (error: any) {
    console.error('Error admitting ticket:', error)
    return NextResponse.json(
      {
        error: 'Failed to admit ticket',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

