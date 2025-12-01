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
  
  console.log('[SUCCESS PAGE] Component render:', {
    pathReference,
    queryReference,
    ticketId,
    hasParams: !!params,
    hasSearchParams: !!searchParams
  })
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const fetchTicket = async () => {
      console.log('[SUCCESS PAGE] ===== TICKET FETCH STARTED =====')
      console.log('[SUCCESS PAGE] Step 1: Extracted identifiers:', {
        pathReference,
        queryReference,
        ticketId,
        retryCount
      })

      if (!ticketId) {
        console.error('[SUCCESS PAGE] ERROR: No ticket ID/reference found')
        setLoading(false)
        return
      }

      try {
        console.log('[SUCCESS PAGE] Step 2: Searching for ticket with:', ticketId)
        
        // Strategy 1: Search by payment reference or ID
        let searchResponse = await fetch(`/api/tickets?search=${encodeURIComponent(ticketId)}`)
        
        console.log('[SUCCESS PAGE] Step 3: Search response status:', searchResponse.status, searchResponse.ok)
        
        if (searchResponse.ok) {
          const tickets = await searchResponse.json()
          console.log('[SUCCESS PAGE] Step 4: Found tickets:', tickets.length)
          console.log('[SUCCESS PAGE] Step 5: Ticket details:', tickets.map((t: any) => ({
            id: t.id,
            paymentReference: t.paymentReference,
            paymentStatus: t.paymentStatus,
            fullName: t.fullName
          })))
          
          // Try multiple matching strategies
          let foundTicket = tickets.find(
            (t: any) => t.paymentReference === ticketId || 
                       t.paymentReference?.toUpperCase() === ticketId.toUpperCase() ||
                       t.id === ticketId
          )
          
          // Strategy 2: If not found, try case-insensitive match on all fields
          if (!foundTicket) {
            foundTicket = tickets.find(
              (t: any) => t.paymentReference?.toUpperCase() === ticketId.toUpperCase() ||
                         t.id?.toUpperCase() === ticketId.toUpperCase()
            )
          }
          
          // Strategy 3: If still not found, try partial match on payment reference
          if (!foundTicket && ticketId.length > 5) {
            foundTicket = tickets.find(
              (t: any) => t.paymentReference?.includes(ticketId) || 
                         ticketId.includes(t.paymentReference || '')
            )
          }
          
          // Strategy 4: If still not found, get the most recent ticket (fallback)
          if (!foundTicket && tickets.length > 0) {
            console.log('[SUCCESS PAGE] WARNING: No exact match found, using most recent ticket as fallback')
            foundTicket = tickets[0]
          }
          
          console.log('[SUCCESS PAGE] Step 6: Matching ticket found?', !!foundTicket)
          
          if (foundTicket) {
            console.log('[SUCCESS PAGE] Step 7: Found ticket:', {
              id: foundTicket.id,
              paymentReference: foundTicket.paymentReference,
              paymentStatus: foundTicket.paymentStatus,
              hasItems: !!(foundTicket.ticket_items || foundTicket.items)
            })
            
            // Show ticket as paid since we're on success page
            // Webhook will update the database in the background
            const ticketData = {
              ...foundTicket,
              paymentStatus: 'paid',
              items: foundTicket.ticket_items?.map((item: any) => ({
                dish: item.dish,
                drink: item.drink,
              })) || foundTicket.items || [],
            }
            
            console.log('[SUCCESS PAGE] Step 8: Setting ticket data:', {
              id: ticketData.id,
              paymentStatus: ticketData.paymentStatus,
              itemsCount: ticketData.items.length
            })
            
            setTicket(ticketData)
            setLoading(false)
            console.log('[SUCCESS PAGE] ===== TICKET FETCH COMPLETE =====')
            return
          } else {
            console.error('[SUCCESS PAGE] ERROR: No matching ticket found')
            console.error('[SUCCESS PAGE] Searched with:', ticketId)
            console.error('[SUCCESS PAGE] Available tickets:', tickets.map((t: any) => ({
              id: t.id,
              paymentReference: t.paymentReference
            })))
            
            // Retry after a delay if we haven't retried too many times
            if (retryCount < 3) {
              console.log('[SUCCESS PAGE] Retrying in 2 seconds... (attempt', retryCount + 1, 'of 3)')
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
              }, 2000)
              return
            }
          }
        } else {
          console.error('[SUCCESS PAGE] ERROR: Search request failed:', searchResponse.status)
          
          // Retry after a delay if we haven't retried too many times
          if (retryCount < 3) {
            console.log('[SUCCESS PAGE] Retrying in 2 seconds... (attempt', retryCount + 1, 'of 3)')
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
            }, 2000)
            return
          }
        }
        
        setLoading(false)
      } catch (err) {
        console.error('[SUCCESS PAGE] EXCEPTION: Error fetching ticket:', err)
        
        // Retry after a delay if we haven't retried too many times
        if (retryCount < 3) {
          console.log('[SUCCESS PAGE] Retrying after exception in 2 seconds... (attempt', retryCount + 1, 'of 3)')
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, 2000)
          return
        }
        
        setLoading(false)
      }
    }

    if (ticketId) {
      fetchTicket()
    } else {
      console.error('[SUCCESS PAGE] ERROR: No ticketId available')
      setLoading(false)
    }
  }, [ticketId, pathReference, queryReference, retryCount])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BeerBottleIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your ticket...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">Retrying... (attempt {retryCount + 1})</p>
          )}
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
            If this takes too long, please refresh the page or contact support with your payment reference.
          </p>
          {ticketId && (
            <p className="text-xs text-gray-400 font-mono mt-4">
              Reference: {ticketId}
            </p>
          )}
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
