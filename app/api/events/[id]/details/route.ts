import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

// Paystack transaction fee: 1.95%
const PAYSTACK_FEE_RATE = 0.0195
const NET_REVENUE_MULTIPLIER = 1 - PAYSTACK_FEE_RATE // 0.9805

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
      .select('id, paymentStatus, totalAmount, quantity, ticketType, phoneNumber, isDirectPayment')
      .eq('eventId', id)

    if (ticketsError) throw ticketsError

    // Get ticket types to map ticketType name to peoplePerTicket
    const { data: ticketTypes } = await supabase
      .from('ticket_types')
      .select('name, peoplePerTicket')
      .eq('userId', user.id)

    // Create a map of ticket type name to peoplePerTicket
    const ticketTypeMap = new Map(
      ticketTypes?.map(tt => [tt.name, tt.peoplePerTicket || 1]) || []
    )

    // Calculate unique participants (unique phone numbers)
    const uniqueParticipants = new Set(tickets?.map(t => t.phoneNumber).filter(Boolean) || []).size

    // Calculate net revenue from paid tickets: apply Paystack fee only for non-direct payments
    const totalRevenue = tickets
      ?.filter((t) => t.paymentStatus === 'paid')
      .reduce((sum, t) => {
        const amount = parseFloat(t.totalAmount.toString())
        // If direct payment, use full amount; otherwise apply Paystack fee
        return sum + (t.isDirectPayment ? amount : amount * NET_REVENUE_MULTIPLIER)
      }, 0) || 0

    const stats = {
      totalTickets: tickets?.length || 0,
      paidTickets: tickets?.filter((t) => t.paymentStatus === 'paid').length || 0,
      pendingTickets: tickets?.filter((t) => t.paymentStatus === 'pending').length || 0,
      totalRevenue,
      totalQuantity: tickets?.reduce((sum, t) => {
        const peoplePerTicket = ticketTypeMap.get(t.ticketType) || 1
        return sum + (t.quantity || 1) * peoplePerTicket
      }, 0) || 0,
      participants: uniqueParticipants,
      ticketsByType: tickets?.reduce((acc: any, t) => {
        const peoplePerTicket = ticketTypeMap.get(t.ticketType) || 1
        acc[t.ticketType] = (acc[t.ticketType] || 0) + (t.quantity || 1) * peoplePerTicket
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