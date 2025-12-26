'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/hooks/useNotification'
import { useEvent } from '@/components/admin/EventContext'
import { CheckCircleIcon, XCircleIcon, TicketIcon, ArrowsDownUpIcon, TagIcon, SortAscendingIcon } from '@phosphor-icons/react'
import { useSearch } from '@/components/admin/SearchContext'
import { useSearchStore } from '@/stores/searchStore'
import Dropdown from '@/components/admin/Dropdown'
import AdmissionStatistics from '@/components/admin/AdmissionStatistics'
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
  isDirectPayment: boolean
  items: TicketItem[]
  createdAt: string
  eventId: string
  admitted: boolean
  admittedAt: string | null
  events?: Event
}

interface AdmissionStats {
  totalPaid: number
  admitted: number
  notAdmitted: number
  admissionRate: number
}

export default function AdmissionPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useNotification()
  const { selectedEventId } = useEvent()
  const { searchQuery, registerSearchHandler } = useSearch()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [admissionFilter, setAdmissionFilter] = useState<'all' | 'admitted' | 'notAdmitted'>('all')
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [admitting, setAdmitting] = useState<string | null>(null)
  const [stats, setStats] = useState<AdmissionStats>({
    totalPaid: 0,
    admitted: 0,
    notAdmitted: 0,
    admissionRate: 0,
  })

  const fetchTickets = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      const url = selectedEventId
        ? `/api/admin/tickets?eventId=${selectedEventId}&status=paid`
        : '/api/admin/tickets?status=paid'
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/admission')
          return
        }
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      const paidTickets = data.tickets || []
      setTickets(paidTickets)
      setFilteredTickets(paidTickets)

      // Fetch ticket types to get peoplePerTicket values
      const ticketTypesResponse = await fetch('/api/admin/ticket-types')
      if (!ticketTypesResponse.ok) {
        console.error('Failed to fetch ticket types:', ticketTypesResponse.status, ticketTypesResponse.statusText)
      }
      const ticketTypes = ticketTypesResponse.ok ? await ticketTypesResponse.json() : []
      
      if (ticketTypes.length === 0) {
        console.warn('No ticket types found. All calculations will default to 1 person per ticket.')
      }
      
      // Create a map of ticket type name to peoplePerTicket (case-insensitive matching)
      const ticketTypeMap = new Map<string, number>()
      ticketTypes.forEach((tt: any) => {
        if (tt.name) {
          // Store both exact match and lowercase match for flexibility
          const name = tt.name.trim()
          const peoplePerTicket = Number(tt.peoplePerTicket) || 1
          ticketTypeMap.set(name, peoplePerTicket)
          ticketTypeMap.set(name.toLowerCase(), peoplePerTicket) // Also store lowercase for matching
        }
      })
      
      // Log ticket types for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Ticket types loaded:', Array.from(ticketTypeMap.entries()))
        console.log('Unique ticket types in paid tickets:', Array.from(new Set(paidTickets.map(t => t.ticketType))))
      }

      // Helper function to get peoplePerTicket with fallback
      const getPeoplePerTicket = (ticketType: string): number => {
        const exact = ticketTypeMap.get(ticketType)
        if (exact !== undefined) return exact
        const lower = ticketTypeMap.get(ticketType.toLowerCase())
        if (lower !== undefined) return lower
        // If not found, default to 1 but log a warning
        console.warn(`Ticket type "${ticketType}" not found in ticket types map. Defaulting to 1 person per ticket.`)
        return 1
      }

      // Calculate statistics based on actual people count (quantity * peoplePerTicket)
      const totalPaid = paidTickets.reduce((sum: number, ticket: Ticket) => {
        const peoplePerTicket = getPeoplePerTicket(ticket.ticketType)
        return sum + (ticket.quantity || 1) * peoplePerTicket
      }, 0)
      
      const admitted = paidTickets
        .filter((t: Ticket) => t.admitted)    
        .reduce((sum: number, ticket: Ticket) => {
          const peoplePerTicket = getPeoplePerTicket(ticket.ticketType)
          return sum + (ticket.quantity || 1) * peoplePerTicket
        }, 0)
      
      const notAdmitted = totalPaid - admitted
      const admissionRate = totalPaid > 0 ? (admitted / totalPaid) * 100 : 0

      setStats({
        totalPaid,
        admitted,
        notAdmitted,
        admissionRate,
      })
    } catch (error) {
      console.error('Error fetching tickets:', error)
      showError('Failed to load tickets')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [selectedEventId, router, showError])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Initial load with loading state
      fetchTickets(true)
      // Set up real-time polling every 5 seconds for admission tracking (without loading state)
      const interval = setInterval(() => {
        fetchTickets(false)
      }, 5000)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, selectedEventId])

  // Get unique ticket types from tickets
  const availableTicketTypes = Array.from(new Set(tickets.map(t => t.ticketType)))

  useEffect(() => {
    let filtered = [...tickets]

    // Apply search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ticket) =>
          ticket.fullName.toLowerCase().includes(lowerQuery) ||
          ticket.email?.toLowerCase().includes(lowerQuery) ||
          ticket.phoneNumber.includes(searchQuery) ||
          ticket.paymentReference?.toLowerCase().includes(lowerQuery) ||
          ticket.id.toLowerCase().includes(lowerQuery)
      )
    }

    // Apply admission status filter
    if (admissionFilter !== 'all') {
      filtered = filtered.filter((ticket) => {
        if (admissionFilter === 'admitted') return ticket.admitted
        if (admissionFilter === 'notAdmitted') return !ticket.admitted
        return true
      })
    }

    // Apply ticket type filter
    if (ticketTypeFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.ticketType === ticketTypeFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortBy === 'amount') {
        comparison = a.totalAmount - b.totalAmount
      } else if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredTickets(filtered)
  }, [searchQuery, tickets, admissionFilter, ticketTypeFilter, sortBy, sortOrder])

  // Register search handler
  useEffect(() => {
    registerSearchHandler((query: string) => {
      // Search is handled in the filter effect above
    })
  }, [registerSearchHandler])

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
      category: 'Participants',
      metadata: {
        phoneNumber: ticket.phoneNumber,
        email: ticket.email,
        paymentReference: ticket.paymentReference,
        ticketType: ticket.ticketType,
        totalAmount: ticket.totalAmount,
      },
      admitted: ticket.admitted,
      action: !ticket.admitted
        ? {
            label: 'Admit',
            onClick: () => {
              handleAdmit(ticket.id)
            },
            icon: CheckCircleIcon,
          }
        : undefined,
    }))
    registerData(searchableItems)
  }, [tickets, registerData])

  const handleAdmit = async (ticketId: string) => {
    try {
      setAdmitting(ticketId)
      const response = await fetch(`/api/admin/tickets/${ticketId}/admit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to admit ticket')
      }

      const data = await response.json()
      success('Participant admitted successfully! Confirmation email sent.')
      fetchTickets(false)
      // Close search overlay after successful admission
      useSearchStore.getState().closeSearch()
    } catch (error: any) {
      console.error('Error admitting ticket:', error)
      showError(error.message || 'Failed to admit ticket')
    } finally {
      setAdmitting(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <StatisticsSkeleton />
        <div className="mt-8">
          <TableSkeleton rows={8} columns={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      {/* Statistics Cards */}
      <AdmissionStatistics
        totalPaid={stats.totalPaid}
        admitted={stats.admitted}
        notAdmitted={stats.notAdmitted}
        admissionRate={stats.admissionRate}
      />

      {/* Tickets Table */}
      <div className="mt-8">
        {/* Filters */}
        <div className="flex py-6 flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* Admission Status Filter */}
            <Dropdown
              options={[
                { value: 'all', label: 'All Status', icon: CheckCircleIcon },
                { value: 'admitted', label: 'Admitted', icon: CheckCircleIcon },
                { value: 'notAdmitted', label: 'Not Admitted', icon: XCircleIcon },
              ]}
              value={admissionFilter}
              onChange={(value) => setAdmissionFilter(value as 'all' | 'admitted' | 'notAdmitted')}
            />

            {/* Ticket Type Filter */}
            <Dropdown
              options={[
                { value: 'all', label: 'All Ticket Types', icon: TagIcon },
                ...availableTicketTypes.map((type) => ({
                  value: type,
                  label: type,
                  icon: TagIcon,
                })),
              ]}
              value={ticketTypeFilter}
              onChange={(value) => setTicketTypeFilter(value)}
            />

            {/* Sort By */}
            <Dropdown
              options={[
                { value: 'date', label: 'Sort by Date', icon: SortAscendingIcon },
                { value: 'amount', label: 'Sort by Amount', icon: SortAscendingIcon },
                { value: 'name', label: 'Sort by Name', icon: SortAscendingIcon },
              ]}
              value={sortBy}
              onChange={(value) => setSortBy(value as 'date' | 'amount' | 'name')}
            />

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 shadow-sm active:scale-[0.95] transition-transform"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowsDownUpIcon size={16} />
              <span className="active:scale-[0.95] transition-transform">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Ref
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admitted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <TicketIcon size={48} className="text-gray-400" />
                      <p className="text-sm">
                        {searchQuery || admissionFilter !== 'all' || ticketTypeFilter !== 'all'
                          ? 'No tickets found matching your filters'
                          : 'No paid tickets found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      ticket.admitted ? 'bg-green-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ticket.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.phoneNumber}</div>
                      {ticket.email && (
                        <div className="text-xs text-gray-500">{ticket.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.ticketType}</div>
                      <div className="text-xs text-gray-500">Qty: {ticket.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(ticket.totalAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-700">
                        {ticket.paymentReference || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {ticket.isDirectPayment ? 'Direct Deposit' : 'Paystack'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.admitted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon size={14} weight="fill" />
                          Admitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <XCircleIcon size={14} weight="fill" />
                          Not Admitted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.admittedAt
                        ? new Date(ticket.admittedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      {ticket.admitted ? (
                        <span className="text-green-600 font-medium">Already Admitted</span>
                      ) : (
                        <button
                          onClick={() => handleAdmit(ticket.id)}
                          disabled={admitting === ticket.id}
                          className="flex items-center justify-center gap-2 bg-linear-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {admitting === ticket.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Admitting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon size={16} weight="fill" />
                              <span>Admit</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}

