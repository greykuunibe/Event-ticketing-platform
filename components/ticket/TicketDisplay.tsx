'use client'

import { TicketIcon, DownloadIcon } from '@phosphor-icons/react'
import { downloadTicketAsPNG } from '@/lib/ticket-generator'

interface TicketItem {
  dish: string
  drink: string
}

interface TicketDisplayProps {
  ticket: {
    id: string
    fullName: string
    phoneNumber: string
    email: string | null
    ticketType: string
    totalAmount: number
    paymentReference: string | null
    items: TicketItem[]
    createdAt: string
  }
}

export default function TicketDisplay({ ticket }: TicketDisplayProps) {
  const handleDownload = () => {
    downloadTicketAsPNG('ticket-content', `ticket-${ticket.paymentReference || ticket.id}.png`)
  }

  return (
    <div className="max-w-md mx-auto ">
      {/* Ticket card with orange linear background */}
      <div
        id="ticket-content"
        className="bg-orange-500 rounded-3xl shadow-xl"
      >
        {/* Header */}
        <div className="text-center bg-orange-500 rounded-t-3xl py-12 text-white">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3">
            <TicketIcon size={28} weight="fill" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">My Ticket</h1>
          <p className="text-sm text-orange-50">Your reservation confirmation</p>
        </div>

        {/* White ticket body */}
        <div className="bg-white rounded-2xl p-6 space-y-5">
          {/* Ticket Details */}
          <div className='mb-12'>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Ticket Information</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold text-gray-900">{ticket.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-semibold text-gray-900">{ticket.phoneNumber}</span>
              </div>
              {ticket.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-900">{ticket.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Ticket Type</span>
                <span className="font-semibold text-gray-900">{ticket.ticketType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-orange-600">
                  GHS {ticket.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Selections</h2>
            <div className="space-y-3">
              {ticket.items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl p-3 bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">
                      Ticket {index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Dish</span>
                      <p className="font-medium text-gray-900">{item.dish}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Drink</span>
                      <p className="font-medium text-gray-900">{item.drink}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom info area (replacing QR/barcode) */}
          <div className="pt-4 border-t border-dashed border-gray-200 text-xs text-gray-700">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Ticket ID</span>
              <span className="font-mono">{ticket.id}</span>
            </div>
            {ticket.paymentReference && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Payment Ref</span>
                <span className="font-mono">{ticket.paymentReference}</span>
              </div>
            )}
            <p className="mt-6 text-[11px] text-gray-500 text-center">
              Please present this ticket at the event. Keep this information safe as it may
              be required for verification on entry.
            </p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 text-white px-4 py-2 rounded-xl active:opacity-80 mx-auto"
        >
          <DownloadIcon size={20} />
          Download as PNG
        </button>
      </div>
    </div>
  )
}