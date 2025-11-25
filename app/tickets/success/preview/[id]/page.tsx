'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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

export default function TicketSuccessPreviewPage() {
  const params = useParams()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        // Try direct ID lookup
        const directResponse = await fetch(`/api/tickets/${ticketId}`)
        if (directResponse.ok) {
          const directTicket: any = await directResponse.json()
          // Transform ticket_items to items format
          const transformedTicket: Ticket = {
            ...directTicket,
            items: directTicket.ticket_items?.map((item: any) => ({
              dish: item.dish,
              drink: item.drink,
            })) || [],
          }
          setTicket(transformedTicket)
        } else {
          // Try searching by payment reference
          const searchResponse = await fetch(`/api/tickets?search=${ticketId}`)
          if (searchResponse.ok) {
            const tickets: any[] = await searchResponse.json()
            const foundTicket = tickets.find(
              (t: any) => t.paymentReference === ticketId || t.id === ticketId
            )
            if (foundTicket) {
              // Transform ticket_items to items format if needed
              const transformedTicket: Ticket = {
                ...foundTicket,
                items: foundTicket.ticket_items?.map((item: any) => ({
                  dish: item.dish,
                  drink: item.drink,
                })) || foundTicket.items || [],
              }
              setTicket(transformedTicket)
            } else {
              setError('Ticket not found')
            }
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Ticket not found'}</p>
          <p className="text-gray-600">Please check your ticket ID and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="mb-6">
            Download ticket as PNG.
          </p>
          <p className="text-red-500 text-sm">*Keep this information safe as it may be required for verification on entry.</p>
        </div>
        <TicketDisplay ticket={ticket} />
      </div>
    </div>
  )
}

