'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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

function TicketSuccessPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const pathReference = params?.id as string | undefined
  const queryReference = searchParams.get('reference') || searchParams.get('trxref')
  const ticketId = pathReference || queryReference || ''
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        // If no reference, just get the most recent ticket
        try {
          const response = await fetch('/api/tickets')
          if (response.ok) {
            const tickets = await response.json()
            if (tickets && tickets.length > 0) {
              const latestTicket = tickets[0]
              
              // Update payment status in database
              try {
                await fetch(`/api/tickets/${latestTicket.id}/update-payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentReference: ticketId }),
                })
              } catch (updateErr) {
                console.error('Error updating payment status:', updateErr)
                // Continue anyway - webhook will update it
              }

              setTicket({
                ...latestTicket,
                paymentStatus: 'paid',
                items: latestTicket.ticket_items?.map((item: any) => ({
                  dish: item.dish,
                  drink: item.drink,
                })) || latestTicket.items || [],
              })
            }
          }
        } catch (err) {
          console.error('Error fetching tickets:', err)
        }
        setLoading(false)
        return
      }

      try {
        // Simple search - no checks, just get tickets
        const searchResponse = await fetch(`/api/tickets?search=${encodeURIComponent(ticketId)}`)
        
        if (searchResponse.ok) {
          const tickets = await searchResponse.json()
          
          // Just get the first ticket found - no matching logic
          const foundTicket = tickets && tickets.length > 0 ? tickets[0] : null
          
          if (foundTicket) {
            // Update payment status in database
            try {
              await fetch(`/api/tickets/${foundTicket.id}/update-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentReference: ticketId }),
              })
            } catch (updateErr) {
              console.error('Error updating payment status:', updateErr)
              // Continue anyway - webhook will update it
            }

            setTicket({
              ...foundTicket,
              paymentStatus: 'paid',
              items: foundTicket.ticket_items?.map((item: any) => ({
                dish: item.dish,
                drink: item.drink,
              })) || foundTicket.items || [],
            })
          } else {
            // If no ticket found, get the most recent ticket
            const allTicketsResponse = await fetch('/api/tickets')
            if (allTicketsResponse.ok) {
              const allTickets = await allTicketsResponse.json()
              if (allTickets && allTickets.length > 0) {
                const latestTicket = allTickets[0]
                
                // Update payment status in database
                try {
                  await fetch(`/api/tickets/${latestTicket.id}/update-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentReference: ticketId }),
                  })
                } catch (updateErr) {
                  console.error('Error updating payment status:', updateErr)
                  // Continue anyway - webhook will update it
                }

                setTicket({
                  ...latestTicket,
                  paymentStatus: 'paid',
                  items: latestTicket.ticket_items?.map((item: any) => ({
                    dish: item.dish,
                    drink: item.drink,
                  })) || latestTicket.items || [],
                })
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching ticket:', err)
        // On error, try to get most recent ticket
        try {
          const response = await fetch('/api/tickets')
          if (response.ok) {
            const tickets = await response.json()
            if (tickets && tickets.length > 0) {
              const latestTicket = tickets[0]
              setTicket({
                ...latestTicket,
                paymentStatus: 'paid',
                items: latestTicket.ticket_items?.map((item: any) => ({
                  dish: item.dish,
                  drink: item.drink,
                })) || latestTicket.items || [],
              })
            }
          }
        } catch (e) {
          console.error('Error fetching fallback ticket:', e)
        }
      }
      
      setLoading(false)
    }

    fetchTicket()
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

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <BeerBottleIcon size={48} className="text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preparing your ticket...</h2>
          <p className="text-gray-600 mb-4">
            Your payment was successful! We're preparing your ticket.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Please refresh the page in a moment.
          </p>
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

export default function TicketSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <BeerBottleIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <TicketSuccessPageContent />
    </Suspense>
  )
}
