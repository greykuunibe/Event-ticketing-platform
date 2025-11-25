import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get event (filtered by userId)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get tickets statistics
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, paymentStatus, totalAmount, quantity, ticketType, phoneNumber')
      .eq('eventId', id)

    if (ticketsError) throw ticketsError

    // Calculate unique participants (unique phone numbers)
    const uniqueParticipants = new Set(tickets?.map(t => t.phoneNumber).filter(Boolean) || []).size

    const stats = {
      totalTickets: tickets?.length || 0,
      paidTickets: tickets?.filter((t) => t.paymentStatus === 'paid').length || 0,
      pendingTickets: tickets?.filter((t) => t.paymentStatus === 'pending').length || 0,
      totalRevenue: tickets
        ?.filter((t) => t.paymentStatus === 'paid')
        .reduce((sum, t) => sum + parseFloat(t.totalAmount.toString()), 0) || 0,
      totalQuantity: tickets?.reduce((sum, t) => sum + (t.quantity || 1), 0) || 0,
      participants: uniqueParticipants,
      ticketsByType: tickets?.reduce((acc: any, t) => {
        acc[t.ticketType] = (acc[t.ticketType] || 0) + (t.quantity || 1)
        return acc
      }, {}) || {},
    }

    return NextResponse.json({
      event,
      statistics: stats,
    })
  } catch (error: any) {
    console.error('Error fetching event details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event details' },
      { status: 500 }
    )
  }
}