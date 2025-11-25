'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useEvent } from './EventContext'
import { CalendarDotsIcon } from '@phosphor-icons/react'
import Dropdown from './Dropdown'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard',
    description: 'Overview of ticket sales, revenue, and customer statistics'
  },
  { 
    name: 'Events', 
    href: '/admin/events',
    description: 'Create and manage your events, view statistics and QR codes'
  },
  { 
    name: 'Tickets', 
    href: '/admin/tickets',
    description: 'View and manage all ticket purchases'
  },
  { 
    name: 'Admission', 
    href: '/admin/admission',
    description: 'Admit participants and track entry on event day'
  },
  { 
    name: 'Menu Items', 
    href: '/admin/menu',
    description: 'Manage dishes and drinks available for tickets'
  },
  { 
    name: 'Ticket Types', 
    href: '/admin/ticket-types',
    description: 'Manage ticket types and pricing for your events'
  },
]

export default function AdminHeader() {
  const { data: session } = useSession()
  const { selectedEventId, setSelectedEventId, events, setEvents } = useEvent()
  const pathname = usePathname()

  // Find the active navigation item
  const activeNav = navigation.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
  )

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (!response.ok) throw new Error('Failed to fetch events')
        const data = await response.json()
        setEvents(data)
      } catch (error) {
        console.error('Error fetching events:', error)
      }
    }
    fetchEvents()
  }, [setEvents])

  return (
    <header>
      <div className='flex w-full items-center justify-between border-b border-gray-200 py-4 px-6'>
        {/* Active Route Title and Description */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {activeNav?.name || 'Admin'}
          </h2>
          {activeNav?.description && (
            <p className="text-sm text-gray-600 mt-1">
              {activeNav.description}
            </p>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-x-4 ml-4">
          {/* Event Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Event:</label>
            <Dropdown
              options={[
                { value: '', label: 'All Events', icon: CalendarDotsIcon },
                ...events.map((event) => ({
                  value: event.id,
                  label: event.name,
                  icon: CalendarDotsIcon,
                })),
              ]}
              value={selectedEventId}
              onChange={(value) => setSelectedEventId(value)}
              className="min-w-[180px]"
            />
          </div>

          <div className="flex items-center gap-x-2">
            <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="hidden lg:block lg:max-w-xs">
              <p className="text-sm font-semibold text-gray-900">
                {session?.user?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>

          </div>
        </div>
      </div>
    </header>
  )
}
