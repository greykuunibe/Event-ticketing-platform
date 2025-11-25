// app/tickets/success/preview/page.tsx
'use client'

import TicketDisplay from '@/components/ticket/TicketDisplay'

const mockTicket = {
  id: 'mock-id-123',
  fullName: 'John Doe',
  phoneNumber: '+233 55 123 4567',
  email: 'john.doe@example.com',
  ticketType: 'VIP',
  totalAmount: 500,
  paymentReference: 'MOCK-REF-123456',
  items: [
    { dish: 'Jollof Rice', drink: 'Coke' },
    { dish: 'Fried Rice', drink: 'Sprite' },
  ],
  createdAt: new Date().toISOString(),
}

export default function TicketSuccessPreviewPage() {
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
          <p className=" text-red-500 text-sm">*Keep this information safe as it may be required for verification on entry.</p>
        </div>
        <TicketDisplay ticket={mockTicket} />
      </div>
    </div>
  )
}