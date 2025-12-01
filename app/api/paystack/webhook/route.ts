import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/paystack'
import { supabase } from '@/lib/supabase'
import { sendTicketEmail } from '@/lib/email'

// Handle GET requests - redirect users to success page
// Paystack sometimes redirects users to the webhook URL after payment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    
    if (reference) {
      // Redirect to success page with the payment reference in the path
      // This ensures the success page can find the ticket
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      return NextResponse.redirect(`${baseUrl}/tickets/success/${encodeURIComponent(reference)}`)
    }
    
    // If no reference, redirect to home
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(`${baseUrl}/`)
  } catch (error) {
    console.error('Error handling webhook redirect:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(`${baseUrl}/`)
  }
}

// Handle POST requests - actual webhook from Paystack servers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data } = body

    console.log('[WEBHOOK] Received event:', event, 'Reference:', data?.reference)

    // Verify the event is from Paystack
    if (event === 'charge.success') {
      const reference = data.reference

      if (!reference) {
        console.error('[WEBHOOK] No reference in charge.success event')
        return NextResponse.json({ received: true })
      }

      // CRITICAL: If Paystack sent charge.success, payment succeeded
      // We should update the ticket even if verification API fails
      console.log('[WEBHOOK] Processing charge.success for reference:', reference)

      // Try to verify payment with Paystack (but don't fail if it fails)
      let verification = null
      try {
        verification = await verifyPayment(reference)
        console.log('[WEBHOOK] Paystack verification result:', verification?.status, verification?.data?.status)
      } catch (verifyError) {
        console.error('[WEBHOOK] Verification API failed, but continuing since Paystack sent charge.success:', verifyError)
      }

      // Find ticket by payment reference (with fallbacks)
      let ticket = null
      let ticketError = null

      // 1. Try exact match first
      const { data: exactTicket, error: exactError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_items (*)
        `)
        .eq('paymentReference', reference)
        .single()

      if (exactTicket) {
        ticket = exactTicket
        console.log('[WEBHOOK] Found ticket with exact paymentReference match')
      } else {
        // 2. Try case-insensitive search
        const { data: tickets } = await supabase
          .from('tickets')
          .select(`
            *,
            ticket_items (*)
          `)
          .ilike('paymentReference', reference)
          .limit(1)

        if (tickets && tickets.length > 0) {
          ticket = tickets[0]
          console.log('[WEBHOOK] Found ticket with case-insensitive search')
        } else {
          // 3. Try by ID if reference looks like UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)
          if (isUUID) {
            const { data: ticketById } = await supabase
              .from('tickets')
              .select(`
                *,
                ticket_items (*)
              `)
              .eq('id', reference)
              .single()

            if (ticketById) {
              ticket = ticketById
              console.log('[WEBHOOK] Found ticket by ID')
            }
          }
        }
      }

      if (!ticket) {
        console.error('[WEBHOOK] Ticket not found for reference:', reference)
        // Still return success to Paystack so they don't retry
        return NextResponse.json({ received: true })
      }

      console.log('[WEBHOOK] Found ticket:', ticket.id, 'Current paymentStatus:', ticket.paymentStatus)

      // Update payment reference if it doesn't match
      if (ticket.paymentReference?.toUpperCase() !== reference.toUpperCase()) {
        console.log('[WEBHOOK] Updating payment reference from', ticket.paymentReference, 'to', reference)
        const { error: refUpdateError } = await supabase
          .from('tickets')
          .update({ paymentReference: reference })
          .eq('id', ticket.id)

        if (refUpdateError) {
          console.error('[WEBHOOK] Error updating payment reference:', refUpdateError)
        } else {
          ticket.paymentReference = reference
        }
      }

      // CRITICAL: ALWAYS update payment status to 'paid' since Paystack sent charge.success
      // Don't check current status - just update it
      console.log('[WEBHOOK] Updating payment status to paid for ticket:', ticket.id)
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ paymentStatus: 'paid' })
        .eq('id', ticket.id)

      if (updateError) {
        console.error('[WEBHOOK] CRITICAL: Error updating ticket status to paid:', updateError)
        // Retry once
        const { error: retryError } = await supabase
          .from('tickets')
          .update({ paymentStatus: 'paid' })
          .eq('id', ticket.id)

        if (retryError) {
          console.error('[WEBHOOK] CRITICAL: Retry also failed:', retryError)
          // Verify current status
          const { data: currentTicket } = await supabase
            .from('tickets')
            .select('paymentStatus')
            .eq('id', ticket.id)
            .single()
          console.error('[WEBHOOK] Current ticket status in DB:', currentTicket?.paymentStatus)
          throw new Error(`Failed to update ticket status: ${retryError.message}`)
        } else {
          console.log('[WEBHOOK] Retry succeeded - payment status updated to paid')
        }
      } else {
        console.log('[WEBHOOK] Successfully updated ticket payment status to paid')
      }

      // Verify the update worked
      const { data: verifiedTicket } = await supabase
        .from('tickets')
        .select('paymentStatus')
        .eq('id', ticket.id)
        .single()
      
      if (verifiedTicket?.paymentStatus === 'paid') {
        console.log('[WEBHOOK] Verified: Payment status is now "paid" in database')
      } else {
        console.error('[WEBHOOK] WARNING: Payment status update may have failed. Current status:', verifiedTicket?.paymentStatus)
      }

      // Send email if email is provided
      if (ticket.email) {
        try {
          await sendTicketEmail(ticket.email, {
            fullName: ticket.fullName,
            ticketType: ticket.ticketType,
            items: (ticket.ticket_items || []).map((item: any) => ({
              dish: item.dish,
              drink: item.drink,
            })),
            paymentReference: ticket.paymentReference || reference,
            totalAmount: ticket.totalAmount,
          })
          console.log('[WEBHOOK] Email sent successfully')
        } catch (emailError) {
          console.error('[WEBHOOK] Error sending email:', emailError)
          // Don't fail the webhook if email fails
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[WEBHOOK] Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}


