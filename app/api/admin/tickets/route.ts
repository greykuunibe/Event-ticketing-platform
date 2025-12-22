import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

// Paystack transaction fee: 1.95%
const PAYSTACK_FEE_RATE = 0.0195
const NET_REVENUE_MULTIPLIER = 1 - PAYSTACK_FEE_RATE // 0.9805

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const eventId = searchParams.get('eventId')

    // First, get all event IDs for this user
    const { data: userEvents, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('userId', user.id)

    if (eventsError) {
      throw new Error(eventsError.message)
    }

    const userEventIds = userEvents?.map(e => e.id) || []

    // If no events for this user, return empty
    if (userEventIds.length === 0) {
      return NextResponse.json({
        tickets: [],
        statistics: {
          totalTickets: 0,
          paidTickets: 0,
          pendingTickets: 0,
          totalRevenue: 0,
          uniqueCustomers: 0,
          totalQuantitySold: 0,
          averageTicketPrice: 0,
          revenueChange: 0,
          customersChange: 0,
          ticketsChange: 0,
        },
      })
    }

    let query = supabase
      .from('tickets')
      .select(`
        *,
        ticket_items (*),
        events (*)
      `)
      .in('eventId', userEventIds)
      .order('createdAt', { ascending: false })

    // Filter by event if provided (and ensure it belongs to user)
    if (eventId) {
      if (!userEventIds.includes(eventId)) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
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

    // Calculate statistics based on filtered tickets (only user's events)
    const totalTicketsResult = eventId
      ? await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('eventId', eventId)
      : await supabase.from('tickets').select('*', { count: 'exact', head: true }).in('eventId', userEventIds)
    if (totalTicketsResult.error) throw totalTicketsResult.error
    const totalTickets = totalTicketsResult.count || 0

    const paidTicketsResult = eventId
      ? await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('paymentStatus', 'paid').eq('eventId', eventId)
      : await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('paymentStatus', 'paid').in('eventId', userEventIds)
    if (paidTicketsResult.error) throw paidTicketsResult.error
    const paidTickets = paidTicketsResult.count || 0

    // Get unique customers (distinct phone numbers) for filtered tickets
    let customersQuery = supabase.from('tickets').select('phoneNumber').in('eventId', userEventIds)
    if (eventId) {
      customersQuery = customersQuery.eq('eventId', eventId)
    }
    const { data: uniqueCustomersData } = await customersQuery
    
    const uniqueCustomers = new Set(uniqueCustomersData?.map(t => t.phoneNumber) || []).size

    // Get all tickets for quantity calculation (all tickets sold, regardless of payment status)
    let allTicketsQuery = supabase.from('tickets').select('quantity, totalAmount, paymentStatus').in('eventId', userEventIds)
    if (eventId) {
      allTicketsQuery = allTicketsQuery.eq('eventId', eventId)
    }
    const { data: allTicketsData } = await allTicketsQuery

    const totalQuantitySold = allTicketsData?.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0) || 0

    // Get paid tickets for revenue calculation
    const revenueData = allTicketsData?.filter(t => t.paymentStatus === 'paid') || []
    const grossRevenue = revenueData.reduce((sum, ticket) => sum + Number(ticket.totalAmount), 0)
    // Apply Paystack fee: net revenue = gross revenue * (1 - 0.0195)
    const totalRevenue = grossRevenue * NET_REVENUE_MULTIPLIER
    const paidQuantity = revenueData.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0)
    
    // Calculate average ticket price (based on paid tickets only, after Paystack fee)
    const averageTicketPrice = paidQuantity > 0 
      ? totalRevenue / paidQuantity 
      : 0

    // Calculate previous day's data for comparison
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayStart)
    
    // Get today's data
    let todayQuery = supabase
      .from('tickets')
      .select('quantity, totalAmount, paymentStatus, phoneNumber, createdAt')
      .in('eventId', userEventIds)
      .gte('createdAt', todayStart.toISOString())
    if (eventId) {
      todayQuery = todayQuery.eq('eventId', eventId)
    }
    const { data: todayTicketsData } = await todayQuery

    // Get yesterday's data
    let yesterdayQuery = supabase
      .from('tickets')
      .select('quantity, totalAmount, paymentStatus, phoneNumber, createdAt')
      .in('eventId', userEventIds)
      .gte('createdAt', yesterdayStart.toISOString())
      .lt('createdAt', yesterdayEnd.toISOString())
    if (eventId) {
      yesterdayQuery = yesterdayQuery.eq('eventId', eventId)
    }
    const { data: yesterdayTicketsData } = await yesterdayQuery

    // Calculate today's metrics
    const todayQuantitySold = todayTicketsData?.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0) || 0
    const todayRevenueData = todayTicketsData?.filter(t => t.paymentStatus === 'paid') || []
    const todayGrossRevenue = todayRevenueData.reduce((sum, ticket) => sum + Number(ticket.totalAmount), 0)
    // Apply Paystack fee to today's revenue
    const todayRevenue = todayGrossRevenue * NET_REVENUE_MULTIPLIER
    const todayCustomersData = todayTicketsData?.map(t => t.phoneNumber) || []
    const todayUniqueCustomers = new Set(todayCustomersData).size

    // Calculate yesterday's metrics
    const yesterdayQuantitySold = yesterdayTicketsData?.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0) || 0
    const yesterdayRevenueData = yesterdayTicketsData?.filter(t => t.paymentStatus === 'paid') || []
    const yesterdayGrossRevenue = yesterdayRevenueData.reduce((sum, ticket) => sum + Number(ticket.totalAmount), 0)
    // Apply Paystack fee to yesterday's revenue
    const yesterdayRevenue = yesterdayGrossRevenue * NET_REVENUE_MULTIPLIER
    const yesterdayCustomersData = yesterdayTicketsData?.map(t => t.phoneNumber) || []
    const yesterdayUniqueCustomers = new Set(yesterdayCustomersData).size

    // Calculate changes (comparing today vs yesterday)
    const ticketsChange = todayQuantitySold - yesterdayQuantitySold
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100)
      : todayRevenue > 0 ? 100 : 0
    const customersChange = todayUniqueCustomers - yesterdayUniqueCustomers

    // Calculate admission statistics
    const admittedTicketsResult = eventId
      ? await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('admitted', true).eq('eventId', eventId)
      : await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('admitted', true).in('eventId', userEventIds)
    if (admittedTicketsResult.error) throw admittedTicketsResult.error
    const admittedTickets = admittedTicketsResult.count || 0

    const paidNotAdmitted = paidTickets - admittedTickets
    const admissionRate = paidTickets > 0 ? (admittedTickets / paidTickets) * 100 : 0

    // Transform tickets: map ticket_items to items
    const transformedTickets = (tickets || []).map((ticket: any) => ({
      ...ticket,
      items: ticket.ticket_items?.map((item: any) => ({
        dish: item.dish,
        drink: item.drink,
      })) || [],
      ticket_items: undefined, // Remove the original field
    }))

    return NextResponse.json({
      tickets: transformedTickets,
      statistics: {
        totalTickets: totalTickets || 0,
        paidTickets: paidTickets || 0,
        pendingTickets: (totalTickets || 0) - (paidTickets || 0),
        totalRevenue,
        uniqueCustomers,
        totalQuantitySold,
        averageTicketPrice,
        revenueChange,
        customersChange,
        ticketsChange,
        admittedTickets,
        paidNotAdmitted,
        admissionRate,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin tickets:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch tickets',
        message: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

