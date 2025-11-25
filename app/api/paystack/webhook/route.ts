import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/paystack'
import { supabase } from '@/lib/supabase'
import { sendTicketEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data } = body

    // Verify the event is from Paystack
    if (event === 'charge.success') {
      const reference = data.reference

      // Verify payment with Paystack
      const verification = await verifyPayment(reference)

      if (verification.status && verification.data.status === 'success') {
        // Find ticket by payment reference
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            ticket_items (*)
          `)
          .eq('paymentReference', reference)
          .single()

        if (ticket && ticket.paymentStatus !== 'paid') {
          // Update ticket status
          const { error: updateError } = await supabase
            .from('tickets')
            .update({ paymentStatus: 'paid' })
            .eq('id', ticket.id)

          if (updateError) {
            throw new Error(updateError.message)
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
                paymentReference: ticket.paymentReference || '',
                totalAmount: ticket.totalAmount,
              })
            } catch (emailError) {
              console.error('Error sending email:', emailError)
              // Don't fail the webhook if email fails
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

