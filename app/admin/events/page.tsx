'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useSearch } from '@/components/admin/SearchContext'
import { useNotification } from '@/hooks/useNotification'
import { generateQRCode } from '@/lib/qrcode'
import { CalendarDotsIcon, PlusIcon } from '@phosphor-icons/react'
import Image from 'next/image'
import EventCardSkeleton from '@/components/admin/skeletons/EventCardSkeleton'

interface Event {
  id: string
  name: string
  description: string | null
  eventDate: string | null
  location: string | null
  qrCode: string
  createdAt: string
}

interface EventStats {
  totalTickets: number
  paidTickets: number
  totalRevenue: number
  totalQuantity: number
  participants: number
}

export default function EventsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError } = useNotification()
  const formRef = useRef<HTMLFormElement>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({})
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchEvents()
    }
  }, [status, session])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch events')
      const data = await response.json()
      setEvents(data)
      setFilteredEvents(data)

      // Fetch stats and QR codes for each event
      const statsPromises = data.map(async (event: Event) => {
        try {
          const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, '')
          const [statsRes, qrRes] = await Promise.all([
            fetch(`/api/events/${event.id}/details`),
            generateQRCode(`${baseUrl}/tickets/new?event=${event.qrCode}`)
          ])

          if (statsRes.ok) {
            const statsData = await statsRes.json()
            return {
              id: event.id,
              stats: statsData.statistics,
              qrCode: qrRes
            }
          }
          return { id: event.id, stats: null, qrCode: qrRes }
        } catch (error) {
          console.error(`Error fetching data for event ${event.id}:`, error)
          return { id: event.id, stats: null, qrCode: null }
        }
      })

      const results = await Promise.all(statsPromises)
      const newStats: Record<string, EventStats> = {}
      const newQrCodes: Record<string, string> = {}

      results.forEach(({ id, stats, qrCode }) => {
        if (stats) {
          newStats[id] = stats
        }
        if (qrCode) {
          newQrCodes[id] = qrCode
        }
      })

      setEventStats(newStats)
      setQrCodes(newQrCodes)
    } catch (error) {
      console.error('Error fetching events:', error)
      showError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          eventDate: formData.get('eventDate'),
          location: formData.get('location'),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }

      await fetchEvents()
      if (formRef.current) {
        formRef.current.reset()
      }
      setShowCreateForm(false)
      success('Event created successfully!')
    } catch (error: any) {
      console.error('Error creating event:', error)
      showError(error.message || 'Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  const handleShowQRCode = (event: Event) => {
    setSelectedEvent(event)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getEventStatus = (eventDate: string | null) => {
    if (!eventDate) return { label: 'TBA', color: 'bg-gray-500' }
    const now = new Date()
    const event = new Date(eventDate)
    const diff = event.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) return { label: 'Past', color: 'bg-gray-500' }
    if (days === 0) return { label: 'Today', color: 'bg-gray-500' }
    if (days <= 7) return { label: 'Upcoming', color: 'bg-orange-600' }
    return { label: 'Scheduled', color: 'bg-gray-500' }
  }

  const handleCopyQRCode = async (event: Event) => {
    if (!qrCodes[event.id]) return

    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, '')
      const qrUrl = `${baseUrl}/tickets/new?event=${event.qrCode}`
      await navigator.clipboard.writeText(qrUrl)
      success('QR code link copied to clipboard!')
    } catch (error) {
      console.error('Error copying QR code:', error)
      showError('Failed to copy QR code')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBA'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'TBA'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const { registerSearchHandler } = useSearch()

  useEffect(() => {
    registerSearchHandler((query: string) => {
      if (!query.trim()) {
        setFilteredEvents(events)
        return
      }

      const lowerQuery = query.toLowerCase()
      const filtered = events.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerQuery) ||
          event.description?.toLowerCase().includes(lowerQuery) ||
          event.location?.toLowerCase().includes(lowerQuery)
      )
      setFilteredEvents(filtered)
    })
  }, [events, registerSearchHandler])

  return (
    <div className="space-y-6 py-6">
      {/* Create Event Button */}
      {!showCreateForm && !loading && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
          >
            <PlusIcon size={16} weight="fill" />
            <span className="active:scale-[0.95] transition-transform">Create Event</span>
          </button>
        </div>
      )}

      {/* Create Event Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-zinc-800/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Event</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-all active:scale-[0.95]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form ref={formRef} onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                  placeholder="Enter event name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                  placeholder="Enter event description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    name="eventDate"
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                    placeholder="Enter location"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform disabled:opacity-50"
                >
                  <span className="active:scale-[0.95] transition-transform">{creating ? 'Creating...' : 'Create Event'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex items-center justify-center gap-2 bg-zinc-100 text-center px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
                >
                  <span className="active:scale-[0.95] transition-transform">Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && qrCodes[selectedEvent.id] && (
        <div className="fixed inset-0 bg-zinc-800/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{selectedEvent.name}</h2>
            <div className="bg-white p-4 rounded-lg mb-4 flex justify-center">
              <img src={qrCodes[selectedEvent.id]} alt="QR Code" className="max-w-full" />
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Share this QR code for ticket purchases
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, '')
                  const qrUrl = `${baseUrl}/tickets/new?event=${selectedEvent.qrCode}`
                  try {
                    await navigator.clipboard.writeText(qrUrl)
                    success('Link copied to clipboard!')
                  } catch (error) {
                    showError('Failed to copy link')
                  }
                }}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
              >
                <span className="active:scale-[0.95] transition-transform">Copy Link</span>
              </button>
              <button
                onClick={() => {
                  setSelectedEvent(null)
                }}
                className="flex items-center justify-center gap-2 w-full bg-zinc-100 text-center px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
              >
                <span className="active:scale-[0.95] transition-transform">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {loading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">
              {events.length === 0
                ? 'No events yet. Create your first event!'
                : 'No events match your search.'}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const stats = eventStats[event.id]
            const status = getEventStatus(event.eventDate)
            const qrCode = qrCodes[event.id]

            return (
              <div key={event.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className='flex flex-col w-full border-b border-gray-200'>
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center rounded-md bg-stone-100 p-2">
                        <CalendarDotsIcon size={30} weight="duotone" />
                      </div>
                      <h3 className="text-2xl font-medium">{event.name}</h3>
                    </div>
                    <div className='text-right'>
                      <span className="">{formatDate(event.eventDate)}</span>
                      <div className="">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${status.color === 'bg-orange-600' ? 'bg-orange-600 text-white' : 'bg-gray-500 text-white'}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* location and time */}
                  <div className="space-y-2 p-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Location</p>
                      <p>{event.location || 'TBA'}</p>
                    </div>
                    <div className='text-right'>
                      <p className="text-sm text-gray-500 mb-1">Time</p>
                      <p>{formatTime(event.eventDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-3 items-center justify-center py-8 px-4 w-full">
                  <div className='text-left'>
                    <p className="text-sm text-gray-500 mb-1">Participants</p>
                    <p >{stats?.participants ?? 0}</p>
                  </div>
                  <div className='text-center'>
                    <p className="text-sm text-gray-500 mb-1">Tickets</p>
                    <p >{stats?.totalQuantity ?? 0}</p>
                  </div>
                  <div className='text-right'>
                    <p className="text-sm text-gray-500 mb-1">Revenue</p>
                    <p >{formatCurrency(stats?.totalRevenue ?? 0)}</p>
                  </div>
                </div>

                <div className="bg-stone-100 p-4">

                  {/* QR Code Section - Right Side */}
                  <div className="flex-shrink-0 ml-auto w-fit ">
                    {qrCode ? (
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => handleShowQRCode(event)}
                          className="text-xs flex flex-col items-center gap-2 text-gray-600 hover:text-gray-800 hover:pointer-cursor"
                        >
                          <div className="w-30 relative h-30 bg-white rounded-lg rounded border border-gray-200">
                            <Image src={qrCode} alt="QR Code" fill className='object-contain hover:cursor-pointer hover:scale-105 transition-all duration-300 rounded-lg' />
                          </div>
                          Tap to view full QR code
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-gray-400">Loading...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

