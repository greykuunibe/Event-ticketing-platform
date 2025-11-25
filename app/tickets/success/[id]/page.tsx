'use client'

import { useEffect, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import TicketDisplay from '@/components/ticket/TicketDisplay'
import { BeerBottleIcon } from '@phosphor-icons/react'

interface Ticket {
  id: string
  fullName: string
  phoneNumber: string
  email: string | null
  ticketType: string
  totalAmount: number
  paymentStatus: string
  paymentReference: string | null
  items: Array<{ dish: string; drink: string }>
  createdAt: string
}

export default function TicketSuccessPage() {
  const params = useParams()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        // First try to find by payment reference
        const response = await fetch(`/api/tickets?search=${ticketId}`)
        if (!response.ok) throw new Error('Failed to fetch ticket')

        const tickets = await response.json()
        const foundTicket = tickets.find(
          (t: Ticket) => t.paymentReference === ticketId || t.id === ticketId
        )

        if (foundTicket) {
          setTicket(foundTicket)
        } else {
          // Try direct ID lookup
          const directResponse = await fetch(`/api/tickets/${ticketId}`)
          if (directResponse.ok) {
            const directTicket = await directResponse.json()
            setTicket(directTicket)
          } else {
            setError('Ticket not found')
          }
        }
      } catch (err) {
        console.error('Error fetching ticket:', err)
        setError('Failed to load ticket')
      } finally {
        setLoading(false)
      }
    }

    if (ticketId) {
      fetchTicket()
    }
  }, [ticketId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BeerBottleIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your ticket...</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {ticket.paymentStatus === 'paid' ? 'Payment Successful!' : 'Ticket Created'}
          </h1>
          <p className="text-gray-600">
            {ticket.paymentStatus === 'paid'
              ? 'Your payment has been confirmed. Your ticket is below.'
              : 'Your ticket has been created. Please complete payment to confirm your reservation.'}
          </p>
        </div>
        <TicketDisplay ticket={ticket} />
      </div>
    </div>
  )
}

