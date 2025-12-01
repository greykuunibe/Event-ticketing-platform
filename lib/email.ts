import { Resend } from 'resend'
import { getOptionalServerEnv, getServerEnv } from './env'

const resend = new Resend(getServerEnv('RESEND_API_KEY'))
const PUBLIC_BASE_URL = getOptionalServerEnv(
  'NEXT_PUBLIC_BASE_URL',
  'https://event-ticketing-platform.netlify.app'
) ?? 'https://event-ticketing-platform.netlify.app'

export const sendTicketEmail = async (
  email: string,
  ticketData: {
    fullName: string
    ticketType: string
    items: Array<{ dish: string; drink: string }>
    paymentReference: string
    totalAmount: number
  }
) => {
  try {
    const itemsHtml = ticketData.items
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.dish}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.drink}</td>
      </tr>
    `
      )
      .join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Event Ticket</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4a5568;">Your Event Ticket</h1>
            <p>Dear ${ticketData.fullName},</p>
            <p>Thank you for your reservation! Your ticket details are below:</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Ticket Information</h2>
              <p><strong>Ticket Type:</strong> ${ticketData.ticketType}</p>
              <p><strong>Payment Reference:</strong> ${ticketData.paymentReference}</p>
              <p><strong>Total Amount:</strong> GHS ${ticketData.totalAmount.toFixed(2)}</p>
              
              <h3 style="margin-top: 20px;">Your Selections:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #e2e8f0;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Dish</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Drink</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            
            <p>You can also view and download your ticket at: <a href="${PUBLIC_BASE_URL}/tickets/success/${ticketData.paymentReference}">View Ticket</a></p>
            
            <p style="margin-top: 30px;">We look forward to seeing you at the event!</p>
            <p>Best regards,<br>The Event Team</p>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: 'Event Tickets <onboarding@resend.dev>',
      to: email,
      subject: 'Your Event Ticket Confirmation',
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}

export const sendAdmissionEmail = async (
  email: string,
  ticketData: {
    fullName: string
    ticketType: string
    items: Array<{ dish: string; drink: string }>
    paymentReference: string
    totalAmount: number
    eventName: string
    admittedAt: string
  }
) => {
  try {
    const itemsHtml = ticketData.items
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.dish}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.drink}</td>
      </tr>
    `
      )
      .join('')

    const admittedDate = new Date(ticketData.admittedAt).toLocaleString()

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Admission Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #059669;">✓ Admission Confirmed</h1>
            <p>Dear ${ticketData.fullName},</p>
            <p>Great news! You have been successfully admitted to <strong>${ticketData.eventName}</strong>.</p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #059669;">Admission Time: ${admittedDate}</p>
            </div>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Ticket Information</h2>
              <p><strong>Ticket Type:</strong> ${ticketData.ticketType}</p>
              <p><strong>Payment Reference:</strong> ${ticketData.paymentReference}</p>
              <p><strong>Total Amount:</strong> GHS ${ticketData.totalAmount.toFixed(2)}</p>
              
              <h3 style="margin-top: 20px;">Your Selections:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #e2e8f0;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Dish</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Drink</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            
            <p style="margin-top: 30px;">We hope you enjoy the event!</p>
            <p>Best regards,<br>The Event Team</p>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: 'Event Tickets <onboarding@resend.dev>',
      to: email,
      subject: `Admission Confirmed - ${ticketData.eventName}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}

