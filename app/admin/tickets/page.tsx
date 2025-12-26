'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/hooks/useNotification'
import { useSearch } from '@/components/admin/SearchContext'
import { useEvent } from '@/components/admin/EventContext'
import { useSearchStore } from '@/stores/searchStore'
import TicketList from '@/components/admin/TicketList'
import { TicketIcon, TagIcon } from '@phosphor-icons/react'
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
  events?: Event
}

interface TicketType {
  id: string
  name: string
  price: number
  peoplePerTicket: number
  color?: string | null
  createdAt: string
}

type ViewMode = 'tickets' | 'ticket-types'

export default function TicketsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useNotification()
  const { selectedEventId } = useEvent()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('tickets')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingType, setEditingType] = useState<TicketType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    peoplePerTicket: '1',
    color: '#4c6afe', // Default blue color
  })
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    try {
      const url = selectedEventId 
        ? `/api/admin/tickets?eventId=${selectedEventId}`
        : '/api/admin/tickets'
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/tickets')
          return
        }
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      setTickets(data.tickets)
      setFilteredTickets(data.tickets)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      if (viewMode === 'tickets') {
        fetchTickets()
        // Also fetch ticket types for filtering
        fetchTicketTypes()
        // Set up real-time polling every 50 seconds
        const interval = setInterval(() => {
          fetchTickets()
        }, 50000)
        return () => clearInterval(interval)
      } else {
        fetchTicketTypes()
      }
    }
  }, [status, session?.user?.id, viewMode, selectedEventId]) // Use session?.user?.id instead of session

  const fetchTicketTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ticket-types')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/tickets')
          return
        }
        throw new Error('Failed to fetch ticket types')
      }

      const data = await response.json()
      setTicketTypes(data)
    } catch (error) {
      console.error('Error fetching ticket types:', error)
      showError('Failed to load ticket types')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) return

    try {
      setSubmitting(true)
      const endpoint = '/api/admin/ticket-types'

      if (editingType) {
        // Update
        const response = await fetch(`${endpoint}/${editingType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            price: parseFloat(formData.price),
            peoplePerTicket: parseInt(formData.peoplePerTicket) || 1,
            color: formData.color,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update')
        }
      } else {
        // Create
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            price: parseFloat(formData.price),
            peoplePerTicket: parseInt(formData.peoplePerTicket) || 1,
            color: formData.color,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create')
        }
      }

      setFormData({ name: '', price: '', peoplePerTicket: '1', color: '#4c6afe' })
      setEditingType(null)
      setShowCreateForm(false)
      fetchTicketTypes()
      success(editingType ? 'Ticket type updated successfully!' : 'Ticket type created successfully!')
    } catch (error: any) {
      console.error('Error saving ticket type:', error)
      showError(error.message || 'Failed to save ticket type')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (type: TicketType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      price: type.price.toString(),
      peoplePerTicket: type.peoplePerTicket.toString(),
      color: type.color || '#4c6afe',
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket type? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/ticket-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchTicketTypes()
      success('Ticket type deleted successfully!')
    } catch (error) {
      console.error('Error deleting ticket type:', error)
      showError('Failed to delete ticket type')
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', price: '', peoplePerTicket: '1', color: '#4c6afe' })
    setEditingType(null)
    setShowCreateForm(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const { registerSearchHandler } = useSearch()

  useEffect(() => {
    if (viewMode === 'tickets') {
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
    }
  }, [tickets, registerSearchHandler, viewMode])

  // Register tickets for global search
  const { registerData } = useSearchStore()
  useEffect(() => {
    if (viewMode === 'tickets') {
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
    } else {
      // Clear data when not in tickets view
      registerData([])
    }
  }, [tickets, viewMode, registerData])

  if (loading && viewMode === 'ticket-types') {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    )
  }

  if (loading && viewMode === 'tickets') {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={8} columns={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {viewMode === 'tickets' ? (
        <TicketList 
          tickets={filteredTickets} 
          onRefresh={fetchTickets} 
          ticketTypes={ticketTypes}
          viewMode={viewMode}
          onViewModeChange={(mode) => {
            setViewMode(mode)
            setShowCreateForm(false)
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Controls with View Toggle and Add Button */}
          <div className="flex py-6 flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg shadow-sm">
              <button
                onClick={() => {
                  setViewMode('tickets')
                  setShowCreateForm(false)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm text-gray-600 hover:text-gray-900 active:scale-[0.95]"
              >
                <TicketIcon size={16} />
                <span className="active:scale-[0.95] transition-transform">Tickets</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('ticket-types')
                  setShowCreateForm(false)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm bg-white shadow-sm text-gray-900 active:scale-[0.95]"
              >
                <TagIcon size={16} />
                <span className="active:scale-[0.95] transition-transform">Ticket Types</span>
              </button>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
              >
                <TagIcon size={16} weight="fill" />
                <span className="active:scale-[0.95] transition-transform">Add Ticket Type</span>
              </button>
            )}
          </div>

          {/* Create/Edit Form Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-zinc-800/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingType ? 'Edit' : 'Add New'} Ticket Type
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-600 transition-all active:scale-[0.95]"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                      placeholder="e.g., Regular Single, VIP Couple"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (GHS) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">People Per Ticket *</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.peoplePerTicket}
                        onChange={(e) => setFormData({ ...formData, peoplePerTicket: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-3">Base Color *</label>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {[
                        { value: '#4c6afe', label: 'Blue', name: 'Blue (#4c6afe)' },
                        { value: '#86de02', label: 'Green', name: 'Green (#86de02)' },
                        { value: '#f97316', label: 'Orange', name: 'Orange (#f97316)' },
                      ].map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: colorOption.value })}
                          className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                            formData.color === colorOption.value
                              ? 'border-zinc-800 bg-zinc-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-lg border-2 border-gray-200"
                            style={{ backgroundColor: colorOption.value }}
                          />
                          <span className="text-xs font-medium text-gray-700">{colorOption.label}</span>
                          <span className="text-[10px] font-mono text-gray-500">{colorOption.value}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Select one of the available colors for the ticket gradient</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform disabled:opacity-50"
                    >
                      <span className="active:scale-[0.95] transition-transform">{submitting ? 'Saving...' : editingType ? 'Update' : 'Create'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center justify-center gap-2 bg-zinc-100 text-center px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
                    >
                      <span className="active:scale-[0.95] transition-transform">Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ticket Types List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      People Per Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ticketTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm">No ticket types found</p>
                          <p className="text-xs text-gray-400">Try adding a new ticket type</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ticketTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(type.price)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{type.peoplePerTicket}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg border border-gray-200"
                              style={{ backgroundColor: type.color || '#4c6afe' }}
                            />
                            <span className="text-xs font-mono text-gray-600">{type.color || '#4c6afe'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(type.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(type)}
                              className="px-3 py-1 text-sm text-zinc-800 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-all active:scale-[0.95]"
                            >
                              <span className="active:scale-[0.95] transition-transform">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(type.id)}
                              className="text-red-600 hover:text-red-800 transition-all active:scale-[0.95]"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

