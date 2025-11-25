'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Event {
  id: string
  name: string
  description: string | null
  eventDate: string | null
  location: string | null
}

interface EventContextType {
  selectedEventId: string
  setSelectedEventId: (eventId: string) => void
  events: Event[]
  setEvents: (events: Event[]) => void
}

const EventContext = createContext<EventContextType | null>(null)

export function EventProvider({ children }: { children: ReactNode }) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [events, setEvents] = useState<Event[]>([])

  return (
    <EventContext.Provider
      value={{
        selectedEventId,
        setSelectedEventId,
        events,
        setEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useEvent must be used within EventProvider')
  }
  return context
}

