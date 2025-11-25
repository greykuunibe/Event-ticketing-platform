'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useSearch } from '@/components/admin/SearchContext'
import { useEvent } from '@/components/admin/EventContext'
import { useSearchStore } from '@/stores/searchStore'
import TicketList from '@/components/admin/TicketList'
import Statistics from '@/components/admin/Statistics'
import StatisticsSkeleton from '@/components/admin/skeletons/StatisticsSkeleton'
import TableSkeleton from '@/components/admin/skeletons/TableSkeleton'

interface TicketItem {
  dish: string
  drink: string
}

interface Event {
  id: string
  name: string
  description: string | null
  eventDate: string | null
  location: string | null
}

interface Ticket {
  id: string
  fullName: string
  phoneNumber: string
  email: string | null
  ticketType: string
  quantity: number
  totalAmount: number
  paymentStatus: string
  paymentReference: string | null
  items: TicketItem[]
  createdAt: string
  eventId: string
  events?: Event
}

interface StatisticsData {
  totalTickets: number
  paidTickets: number
  pendingTickets: number
  totalRevenue: number
  uniqueCustomers: number
  totalQuantitySold: number
  averageTicketPrice: number
  revenueChange: number
  customersChange: number
  ticketsChange: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { selectedEventId } = useEvent()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<StatisticsData>({
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
  })
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const url = selectedEventId 
        ? `/api/admin/tickets?eventId=${selectedEventId}`
        : '/api/admin/tickets'
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/dashboard')
          return
        }
        throw new Error('Failed to fetch tickets')
      }
  
      const data = await response.json()
      setTickets(data.tickets)
      setFilteredTickets(data.tickets)
      setStatistics(data.statistics)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, router]) // Make sure all dependencies are here

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchTickets()
      // Set up real-time polling every 50 seconds
      const interval = setInterval(() => {
        fetchTickets()
      }, 50000)
  
      return () => clearInterval(interval)
    }
  }, [status, session?.user?.id, selectedEventId, fetchTickets]) 

  const { registerSearchHandler } = useSearch()

  useEffect(() => {
    registerSearchHandler((query: string) => {
      if (!query.trim()) {
        setFilteredTickets(tickets)
        return
      }

      const lowerQuery = query.toLowerCase()
      const filtered = tickets.filter(
        (ticket) =>
          ticket.fullName.toLowerCase().includes(lowerQuery) ||
          ticket.email?.toLowerCase().includes(lowerQuery) ||
          ticket.phoneNumber.includes(query) ||
          ticket.ticketType.toLowerCase().includes(lowerQuery) ||
          ticket.paymentReference?.toLowerCase().includes(lowerQuery)
      )
      setFilteredTickets(filtered)
    })
  }, [tickets, registerSearchHandler])

  // Register tickets for global search
  const { registerData } = useSearchStore()
  useEffect(() => {
    const searchableItems = tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.fullName,
      subtitle: ticket.phoneNumber,
      description: ticket.email || undefined,
      keywords: [
        ticket.fullName,
        ticket.phoneNumber,
        ticket.email || '',
        ticket.paymentReference || '',
        ticket.id,
        ticket.ticketType,
      ].filter(Boolean),
      category: 'Tickets',
      href: `/admin/tickets`,
      metadata: {
        phoneNumber: ticket.phoneNumber,
        email: ticket.email,
        paymentReference: ticket.paymentReference,
        ticketType: ticket.ticketType,
        paymentStatus: ticket.paymentStatus,
      },
    }))
    registerData(searchableItems)
  }, [tickets, registerData])

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <StatisticsSkeleton />
        <div className="mt-8">
          <TableSkeleton rows={8} columns={7} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      {/* Statistics Cards */}
      <Statistics
        uniqueCustomers={statistics.uniqueCustomers}
        totalRevenue={statistics.totalRevenue}
        totalTicketsSold={statistics.totalQuantitySold}
        averageTicketPrice={statistics.averageTicketPrice}
        customersChange={statistics.customersChange}
        revenueChange={statistics.revenueChange}
        ticketsChange={statistics.ticketsChange}
      />

      {/* Tickets Table */}
      <div className="mt-8">
        <TicketList tickets={filteredTickets} onRefresh={fetchTickets} />
      </div>
    </div>
  )
}
