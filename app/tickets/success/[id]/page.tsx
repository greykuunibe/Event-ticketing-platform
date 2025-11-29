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
  // Get reference from path param OR query params (Paystack sends query params)
  const pathReference = params?.id as string | undefined
  const queryReference = searchParams.get('reference') || searchParams.get('trxref')
  const ticketId = pathReference || queryReference || ''
  
  console.log('TicketSuccessPage - pathReference:', pathReference, 'queryReference:', queryReference, 'ticketId:', ticketId)
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setError('Payment reference is required')
        setLoading(false)
        return
      }

      try {
        console.log('Fetching ticket with reference:', ticketId)
        
        // First try to find by payment reference
        const response = await fetch(`/api/tickets?search=${encodeURIComponent(ticketId)}`)
        if (!response.ok) {
          console.error('Search API failed:', response.status, response.statusText)
          throw new Error('Failed to fetch ticket')
        }

        const tickets = await response.json()
        console.log('Found tickets:', tickets.length)
        
        const foundTicket: any = tickets.find(
          (t: any) => t.paymentReference === ticketId || t.id === ticketId
        )
        
        console.log('Found ticket:', foundTicket ? 'Yes' : 'No')

        if (foundTicket) {
          // Only show ticket if payment is confirmed
          if (foundTicket.paymentStatus !== 'paid') {
            setError('Payment not confirmed. Please wait for payment confirmation or contact support.')
            setLoading(false)
            return
          }

          // Transform ticket_items to items format
          const transformedTicket: Ticket = {
            ...foundTicket,
            items: foundTicket.ticket_items?.map((item: any) => ({
              dish: item.dish,
              drink: item.drink,
            })) || foundTicket.items || [],
          }
          setTicket(transformedTicket)
        } else {
          // Try direct ID lookup
          const directResponse = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`)
          if (directResponse.ok) {
            const directTicket: any = await directResponse.json()
            
            // Only show ticket if payment is confirmed
            if (directTicket.paymentStatus !== 'paid') {
              setError('Payment not confirmed. Please wait for payment confirmation or contact support.')
              setLoading(false)
              return
            }

            // Transform ticket_items to items format
            const transformedTicket: Ticket = {
              ...directTicket,
              items: directTicket.ticket_items?.map((item: any) => ({
                dish: item.dish,
                drink: item.drink,
              })) || directTicket.items || [],
            }
            setTicket(transformedTicket)
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
