'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, ArrowsDownUpIcon, CopyIcon, ArrowSquareOutIcon, XIcon, TicketIcon as TicketIconPhosphor, TagIcon, SortAscendingIcon, TicketIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import Dropdown from './Dropdown'
import Image from 'next/image'

interface TicketItem {
  dish: string
  drink: string
}

interface Event {
  id: string
  name: string
  description: string | null
  eventDate: string | null
  location: string | null
}

interface MenuItem {
  id: string
  name: string
  imageUrl?: string | null
}

interface Ticket {
  id: string
  fullName: string
  phoneNumber: string
  email: string | null
  ticketType: string
  quantity: number
  totalAmount: number
  paymentStatus: string
  paymentReference: string | null
  items: TicketItem[]
  createdAt: string
  events?: Event
}

interface TicketType {
  id: string
  name: string
  price: number
  peoplePerTicket: number
  createdAt: string
}

interface TicketListProps {
  tickets: Ticket[]
  onRefresh: () => void
  ticketTypes?: TicketType[]
  viewMode?: 'tickets' | 'ticket-types'
  onViewModeChange?: (mode: 'tickets' | 'ticket-types') => void
}

export default function TicketList({ tickets, onRefresh, ticketTypes = [], viewMode, onViewModeChange }: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [menuItems, setMenuItems] = useState<{ dishes: MenuItem[], drinks: MenuItem[] }>({ dishes: [], drinks: [] })

  // Fetch menu items when ticket details are opened
  useEffect(() => {
    if (selectedTicket) {
      fetchMenuItems()
    }
  }, [selectedTicket])

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu')
      if (!response.ok) throw new Error('Failed to fetch menu items')
      const data = await response.json()
      setMenuItems({ dishes: data.dishes || [], drinks: data.drinks || [] })
    } catch (error) {
      console.error('Error fetching menu items:', error)
    }
  }

  // Get menu item by name
  const getMenuItem = (name: string, type: 'dish' | 'drink'): MenuItem | undefined => {
    const items = type === 'dish' ? menuItems.dishes : menuItems.drinks
    return items.find(item => item.name === name)
  }

  // Get unique ticket types from tickets if not provided
  const availableTicketTypes = ticketTypes.length > 0 
    ? ticketTypes 
    : Array.from(new Set(tickets.map(t => t.ticketType))).map(name => ({ name } as TicketType))

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch =
        ticket.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.phoneNumber.includes(searchTerm) ||
        ticket.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticketType.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || ticket.paymentStatus === statusFilter
      const matchesTicketType = ticketTypeFilter === 'all' || ticket.ticketType === ticketTypeFilter

      return matchesSearch && matchesStatus && matchesTicketType
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortBy === 'amount') {
        comparison = a.totalAmount - b.totalAmount
      } else if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Paid' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getTicketTypeColor = (ticketType: string) => {
    const typeColors = {
      'Regular Single': {
        border: 'border-l-4 border-l-orange-500',
        bg: 'bg-orange-50/30',
        hover: 'hover:bg-orange-50/50',
        badge: 'bg-orange-100 text-orange-800',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      'Regular Couple': {
        border: 'border-l-4 border-l-green-500',
        bg: 'bg-green-50/30',
        hover: 'hover:bg-green-50/50',
        badge: 'bg-green-100 text-green-800',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      'VIP Couple': {
        border: 'border-l-4 border-l-purple-500',
        bg: 'bg-purple-50/30',
        hover: 'hover:bg-purple-50/50',
        badge: 'bg-purple-100 text-purple-800',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    }
    return typeColors[ticketType as keyof typeof typeColors] || {
      border: 'border-l-4 border-l-gray-500',
      bg: 'bg-gray-50/30',
      hover: 'hover:bg-gray-50/50',
      badge: 'bg-gray-100 text-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex py-6 flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Status Filter */}
          <Dropdown
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
          />

          {/* Ticket Type Filter */}
          <Dropdown
            options={[
              { value: 'all', label: 'All Ticket Types', icon: TagIcon },
              ...availableTicketTypes.map((type) => ({
                value: type.name || type.name,
                label: type.name || type.name,
                icon: TagIcon,
              })),
            ]}
            value={ticketTypeFilter}
            onChange={(value) => setTicketTypeFilter(value)}
          />

          {/* Sort By */}
          <Dropdown
            options={[
              { value: 'date', label: 'Sort by Date', icon: SortAscendingIcon },
              { value: 'amount', label: 'Sort by Amount', icon: SortAscendingIcon },
              { value: 'name', label: 'Sort by Name', icon: SortAscendingIcon },
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value as 'date' | 'amount' | 'name')}
          />

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 shadow-sm active:scale-[0.95] transition-transform"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowsDownUpIcon size={16} />
            <span className="active:scale-[0.95] transition-transform">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>
        </div>

        {/* View Toggle - Far Right */}
        {viewMode !== undefined && onViewModeChange && (
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg shadow-sm">
            <button
              onClick={() => onViewModeChange('tickets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm active:scale-[0.95] ${
                viewMode === 'tickets'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TicketIcon size={16} />
              <span className="active:scale-[0.95] transition-transform">Tickets</span>
            </button>
            <button
              onClick={() => onViewModeChange('ticket-types')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm active:scale-[0.95] ${
                viewMode === 'ticket-types'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TagIcon size={16} />
              <span className="active:scale-[0.95] transition-transform">Ticket Types</span>
            </button>
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No tickets found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const typeColor = getTicketTypeColor(ticket.ticketType)
                  return (
                  <tr
                    key={ticket.id}
                    className={`${typeColor.border} ${typeColor.bg} ${typeColor.hover} transition-colors cursor-pointer`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ticket.fullName}</div>
                      <div className="text-sm text-gray-500">{ticket.phoneNumber}</div>
                      {ticket.email && (
                        <div className="text-xs text-gray-400">{ticket.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getTicketTypeColor(ticket.ticketType).badge}`}>
                        {ticket.ticketType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(ticket.totalAmount / (ticket.quantity || 1))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.quantity || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(ticket.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ticket.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="fixed h-screen inset-0 bg-zinc-800/50 z-50"
              onClick={() => setSelectedTicket(null)}
            />
            {/* Modal Panel - Slides in from right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-xl z-50"
            >
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">Ticket Details</h2>
                    {selectedTicket.events?.name && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm font-medium text-gray-600">{selectedTicket.events.name}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:cursor-pointer hover:text-gray-600 transition-all active:scale-[0.95]"
                  >
                    <XIcon size={24} />
                  </button>
                </div>

                {/* Amount Section */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${getTicketTypeColor(selectedTicket.ticketType).iconBg} rounded-full flex items-center justify-center`}>
                    <TicketIconPhosphor size={24} className={getTicketTypeColor(selectedTicket.ticketType).iconColor} weight="fill" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-gray-900">
                      {formatCurrency(selectedTicket.totalAmount)}
                    </p>
                    <p className="text-sm text-gray-500">{selectedTicket.ticketType}</p>
                  </div>
                </div>

                {/* Ticket Reference */}
                {selectedTicket.paymentReference && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Payment Reference</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-mono text-gray-700">
                        {selectedTicket.paymentReference}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTicket.paymentReference || '')
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all active:scale-[0.95]"
                        title="Copy reference"
                      >
                        <CopyIcon size={18} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-12">
                {/* Ticket Information */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Ticket Information</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Status</span>
                        {getStatusBadge(selectedTicket.paymentStatus)}
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Created on</span>
                        <span className="text-sm text-gray-900">{formatDate(selectedTicket.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Quantity</span>
                        <span className="text-sm text-gray-900">{selectedTicket.quantity || 1}</span>
                      </div>
                      {selectedTicket.paymentReference && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Reference</span>
                          <span className="text-sm text-gray-900 font-mono">{selectedTicket.paymentReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Customer Information</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Name</span>
                        <span className="text-sm text-gray-900">{selectedTicket.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="text-sm text-gray-900">{selectedTicket.phoneNumber}</span>
                      </div>
                      {selectedTicket.email && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Email</span>
                          <span className="text-sm text-gray-900">{selectedTicket.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Menu Selections */}
                  {selectedTicket.items && selectedTicket.items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Menu Selections</p>
                      <div className="space-y-3">
                        {selectedTicket.items.map((item, index) => {
                          const dishItem = getMenuItem(item.dish, 'dish')
                          const drinkItem = getMenuItem(item.drink, 'drink')
                          
                          return (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-3">Ticket {index + 1}</p>
                              <div className="space-y-3">
                                {/* Dish */}
                                {item.dish && (
                                  <div className="flex items-center gap-3">
                                    {dishItem?.imageUrl ? (
                                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                          src={dishItem.imageUrl}
                                          alt={item.dish}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs text-gray-400">No img</span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-500 mb-0.5">Dish</p>
                                      <p className="text-sm font-medium text-gray-900">{item.dish}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Drink */}
                                {item.drink && (
                                  <div className="flex items-center gap-3">
                                    {drinkItem?.imageUrl ? (
                                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                          src={drinkItem.imageUrl}
                                          alt={item.drink}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs text-gray-400">No img</span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-500 mb-0.5">Drink</p>
                                      <p className="text-sm font-medium text-gray-900">{item.drink}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline Section */}
                <div className="space-y-4 pt-4">
                  <p className="text-sm font-medium text-gray-700">Timeline</p>
                  <div className="space-y-4">
                    {/* Created */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedTicket.createdAt)}</p>
                      </div>
                    </div>
                    {/* Payment Status */}
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedTicket.paymentStatus === 'paid' 
                          ? 'bg-orange-600' 
                          : selectedTicket.paymentStatus === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}>
                        {selectedTicket.paymentStatus === 'paid' ? (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTicket.paymentStatus === 'paid' 
                            ? 'Payment Complete' 
                            : selectedTicket.paymentStatus === 'pending'
                            ? 'Awaiting Payment'
                            : 'Payment Failed'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedTicket.paymentStatus === 'paid' 
                            ? `Payment of ${formatCurrency(selectedTicket.totalAmount)} received.`
                            : 'Waiting for payment to be completed.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
