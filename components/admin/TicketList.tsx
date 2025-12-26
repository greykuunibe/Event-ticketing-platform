'use client'

import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, ArrowsDownUpIcon, CopyIcon, ArrowSquareOutIcon, XIcon, TicketIcon as TicketIconPhosphor, TagIcon, SortAscendingIcon, TicketIcon, DownloadIcon, EyeIcon, ForkKnifeIcon, WineIcon, InfoIcon, CalendarIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import Dropdown from './Dropdown'
import Image from 'next/image'
import TicketDisplay from '@/components/ticket/TicketDisplay'

// Paystack transaction fee: 1.95%
const PAYSTACK_FEE_RATE = 0.0195
const NET_REVENUE_MULTIPLIER = 1 - PAYSTACK_FEE_RATE // 0.9805

// Calculate net revenue after Paystack fee (only for paid tickets)
// If isDirectPayment is true, no fee is applied
const calculateNetRevenue = (amount: number, paymentStatus: string, isDirectPayment: boolean = false): number => {
  if (paymentStatus === 'paid') {
    // If direct payment, return full amount; otherwise apply Paystack fee
    return isDirectPayment ? amount : amount * NET_REVENUE_MULTIPLIER
  }
  return amount // Return gross amount for pending/failed tickets
}

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
  isDirectPayment: boolean
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
  const [dateFilter, setDateFilter] = useState<'today' | 'all' | 'custom'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTicketDisplay, setShowTicketDisplay] = useState(false)
  const [ticketForDisplay, setTicketForDisplay] = useState<Ticket | null>(null)
  const [reportViewType, setReportViewType] = useState<'meals' | 'drinks' | 'ticket-types'>('meals')
  const [viewModeType, setViewModeType] = useState<'tickets' | 'report'>('tickets')
  const [selectedReportItem, setSelectedReportItem] = useState<{ type: 'meal' | 'drink' | 'ticket-type', name: string } | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [menuItems, setMenuItems] = useState<{ dishes: MenuItem[], drinks: MenuItem[] }>({ dishes: [], drinks: [] })
  const [ticketTypesData, setTicketTypesData] = useState<any[]>([])

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

  // Fetch ticket types when report view is opened or on mount for total calculation
  useEffect(() => {
    if (viewModeType === 'report' || ticketTypesData.length === 0) {
      fetchTicketTypes()
    }
  }, [viewModeType])

  const fetchTicketTypes = async () => {
    try {
      const response = await fetch('/api/admin/ticket-types')
      if (!response.ok) throw new Error('Failed to fetch ticket types')
      const data = await response.json()
      setTicketTypesData(data || [])
    } catch (error) {
      console.error('Error fetching ticket types:', error)
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

      const matchesTicketType = ticketTypeFilter === 'all' || ticket.ticketType === ticketTypeFilter

      // Date filtering
      let matchesDate = true
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const ticketDate = new Date(ticket.createdAt)
        ticketDate.setHours(0, 0, 0, 0)
        matchesDate = ticketDate.getTime() === today.getTime()
      } else if (dateFilter === 'custom' && (startDate || endDate)) {
        const ticketDate = new Date(ticket.createdAt).getTime()
        if (startDate) {
          const start = new Date(startDate).setHours(0, 0, 0, 0)
          if (ticketDate < start) matchesDate = false
        }
        if (endDate) {
          const end = new Date(endDate).setHours(23, 59, 59, 999)
          if (ticketDate > end) matchesDate = false
        }
      }

      return matchesSearch && matchesTicketType && matchesDate
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

  // Calculate total tickets sold (people count) for filtered tickets
  const ticketTypeMap = new Map(
    ticketTypesData.map(tt => [tt.name, Number(tt.peoplePerTicket) || 1])
  )
  const totalTicketsSold = filteredTickets.reduce((sum, ticket) => {
    const peoplePerTicket = ticketTypeMap.get(ticket.ticketType) || 1
    return sum + (ticket.quantity || 1) * peoplePerTicket
  }, 0)

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

  // Generate report data grouped by meal, drink, and ticket type
  const generateReport = () => {
    // Group tickets by ticket type
    const ticketsByType = new Map<string, Ticket[]>()
    
    tickets.forEach(ticket => {
      if (!ticketsByType.has(ticket.ticketType)) {
        ticketsByType.set(ticket.ticketType, [])
      }
      ticketsByType.get(ticket.ticketType)!.push(ticket)
    })

    // Group people by dish (meal) choice
    const dishGroups = new Map<string, Array<{ name: string; phone: string; email: string | null; ticketType: string }>>()
    
    // Group people by drink choice
    const drinkGroups = new Map<string, Array<{ name: string; phone: string; email: string | null; ticketType: string }>>()

    tickets.forEach(ticket => {
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach(item => {
          // Add to dish groups
          if (item.dish) {
            if (!dishGroups.has(item.dish)) {
              dishGroups.set(item.dish, [])
            }
            dishGroups.get(item.dish)!.push({
              name: ticket.fullName,
              phone: ticket.phoneNumber,
              email: ticket.email,
              ticketType: ticket.ticketType,
            })
          }

          // Add to drink groups
          if (item.drink) {
            if (!drinkGroups.has(item.drink)) {
              drinkGroups.set(item.drink, [])
            }
            drinkGroups.get(item.drink)!.push({
              name: ticket.fullName,
              phone: ticket.phoneNumber,
              email: ticket.email,
              ticketType: ticket.ticketType,
            })
          }
        })
      }
    })

    return {
      ticketsByType,
      dishGroups,
      drinkGroups,
    }
  }

  // Export report as HTML document matching the platform display
  const downloadReport = () => {
    const viewData = generateReportViewData()

    // Helper to escape HTML
    const escapeHtml = (text: string | null | undefined): string => {
      if (!text) return ''
      const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }
      return String(text).replace(/[&<>"']/g, (m) => map[m])
    }

    // Helper to get ticket details
    const getTicketDetails = (ticketId: string) => {
      return tickets.find(t => t.id === ticketId)
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: #111827;
      background: #ffffff;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    .header p {
      color: #6b7280;
      font-size: 14px;
    }
    .section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: white;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    thead {
      background: #f9fafb;
    }
    th {
      padding: 12px 24px;
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #111827;
    }
    tbody tr:hover {
      background: #f9fafb;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-orange {
      background: #fed7aa;
      color: #9a3412;
    }
    .badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-purple {
      background: #e9d5ff;
      color: #6b21a8;
    }
    .badge-green {
      background: #bbf7d0;
      color: #14532d;
    }
    .badge-red {
      background: #fecaca;
      color: #991b1b;
    }
    .badge-gray {
      background: #f3f4f6;
      color: #374151;
    }
    .font-semibold {
      font-weight: 600;
    }
    .font-medium {
      font-weight: 500;
    }
    .text-gray-600 {
      color: #4b5563;
    }
    .text-gray-500 {
      color: #6b7280;
    }
    .text-gray-900 {
      color: #111827;
    }
    .details-section {
      margin-top: 30px;
    }
    .details-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #111827;
    }
    .details-table {
      margin-top: 10px;
    }
    .details-table th {
      background: #f3f4f6;
      font-size: 11px;
    }
    .details-table td {
      padding: 10px 16px;
      font-size: 12px;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ticket Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>`

    // Section 1: Meals
    html += `
  <div class="section">
    <h2 class="section-title">Meals</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Number</th>
        </tr>
      </thead>
      <tbody>`

    const meals = Array.from(viewData.mealsView.keys()).sort()
    if (meals.length === 0) {
      html += `
        <tr>
          <td colspan="2" class="empty-state">No meals selected</td>
        </tr>`
    } else {
      meals.forEach(meal => {
        const mealData = viewData.mealsView.get(meal)!
        html += `
        <tr>
          <td class="font-semibold">${escapeHtml(meal)}</td>
          <td>${mealData.count} ${mealData.count === 1 ? 'person' : 'people'}</td>
        </tr>`
      })
    }

    html += `
      </tbody>
    </table>
  </div>`

    // Section 2: Drinks
    html += `
  <div class="section">
    <h2 class="section-title">Drinks</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Number</th>
        </tr>
      </thead>
      <tbody>`

    const drinks = Array.from(viewData.drinksView.keys()).sort()
    if (drinks.length === 0) {
      html += `
        <tr>
          <td colspan="2" class="empty-state">No drinks selected</td>
        </tr>`
    } else {
      drinks.forEach(drink => {
        const drinkData = viewData.drinksView.get(drink)!
        html += `
        <tr>
          <td class="font-semibold">${escapeHtml(drink)}</td>
          <td>${drinkData.count} ${drinkData.count === 1 ? 'person' : 'people'}</td>
        </tr>`
      })
    }

    html += `
      </tbody>
    </table>
  </div>`

    // Section 3: Ticket Types
    html += `
  <div class="section">
    <h2 class="section-title">Ticket Types</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Number</th>
        </tr>
      </thead>
      <tbody>`

    const ticketTypes = Array.from(viewData.ticketTypesView.keys()).sort()
    if (ticketTypes.length === 0) {
      html += `
        <tr>
          <td colspan="2" class="empty-state">No tickets found</td>
        </tr>`
    } else {
      ticketTypes.forEach(ticketType => {
        const typeData = viewData.ticketTypesView.get(ticketType)!
        html += `
        <tr>
          <td class="font-semibold">${escapeHtml(ticketType)}</td>
          <td>${typeData.count} ${typeData.count === 1 ? 'person' : 'people'}</td>
        </tr>`
      })
    }

    html += `
      </tbody>
    </table>
  </div>`

    // Section 4: Detailed Meals Data
    if (meals.length > 0) {
      html += `
  <div class="section details-section">
    <h2 class="section-title">Meal Details</h2>`

      meals.forEach(meal => {
        const mealData = viewData.mealsView.get(meal)!
        html += `
    <div style="margin-bottom: 40px;">
      <h3 class="details-title">${escapeHtml(meal)} (${mealData.count} ${mealData.count === 1 ? 'person' : 'people'})</h3>
      <table class="details-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Ticket Type</th>
            <th>Meal</th>
            <th>Drink</th>
          </tr>
        </thead>
        <tbody>`

        mealData.items.forEach(itemRef => {
          const ticket = getTicketDetails(itemRef.ticketId)
          if (ticket && ticket.items && ticket.items[itemRef.itemIndex]) {
            const item = ticket.items[itemRef.itemIndex]
            html += `
          <tr>
            <td class="font-medium">${escapeHtml(ticket.fullName)}</td>
            <td>${escapeHtml(ticket.phoneNumber)}</td>
            <td>${escapeHtml(ticket.email || '-')}</td>
            <td><span class="badge badge-gray">${escapeHtml(ticket.ticketType)}</span></td>
            <td>${escapeHtml(item.dish || '-')}</td>
            <td>${escapeHtml(item.drink || '-')}</td>
          </tr>`
          }
        })

        html += `
        </tbody>
      </table>
    </div>`
      })

      html += `
  </div>`
    }

    // Section 5: Detailed Drinks Data
    if (drinks.length > 0) {
      html += `
  <div class="section details-section">
    <h2 class="section-title">Drink Details</h2>`

      drinks.forEach(drink => {
        const drinkData = viewData.drinksView.get(drink)!
        html += `
    <div style="margin-bottom: 40px;">
      <h3 class="details-title">${escapeHtml(drink)} (${drinkData.count} ${drinkData.count === 1 ? 'person' : 'people'})</h3>
      <table class="details-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Ticket Type</th>
            <th>Meal</th>
            <th>Drink</th>
          </tr>
        </thead>
        <tbody>`

        drinkData.items.forEach(itemRef => {
          const ticket = getTicketDetails(itemRef.ticketId)
          if (ticket && ticket.items && ticket.items[itemRef.itemIndex]) {
            const item = ticket.items[itemRef.itemIndex]
            html += `
          <tr>
            <td class="font-medium">${escapeHtml(ticket.fullName)}</td>
            <td>${escapeHtml(ticket.phoneNumber)}</td>
            <td>${escapeHtml(ticket.email || '-')}</td>
            <td><span class="badge badge-gray">${escapeHtml(ticket.ticketType)}</span></td>
            <td>${escapeHtml(item.dish || '-')}</td>
            <td>${escapeHtml(item.drink || '-')}</td>
          </tr>`
          }
        })

        html += `
        </tbody>
      </table>
    </div>`
      })

      html += `
  </div>`
    }

    // Section 6: Detailed Ticket Types Data
    if (ticketTypes.length > 0) {
      html += `
  <div class="section details-section">
    <h2 class="section-title">Ticket Type Details</h2>`

      ticketTypes.forEach(ticketType => {
        const typeData = viewData.ticketTypesView.get(ticketType)!
        html += `
    <div style="margin-bottom: 40px;">
      <h3 class="details-title">${escapeHtml(ticketType)} (${typeData.count} ${typeData.count === 1 ? 'person' : 'people'})</h3>
      <table class="details-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`

        typeData.tickets.forEach(ticketRef => {
          const ticket = getTicketDetails(ticketRef.ticketId)
          if (ticket) {
            const statusClass = ticket.paymentStatus === 'paid' ? 'badge-green' : 
                               ticket.paymentStatus === 'pending' ? 'badge-orange' : 'badge-red'
            html += `
          <tr>
            <td class="font-medium">${escapeHtml(ticket.fullName)}</td>
            <td>${escapeHtml(ticket.phoneNumber)}</td>
            <td>${escapeHtml(ticket.email || '-')}</td>
            <td>${ticket.quantity || 1}</td>
            <td>${formatCurrency(ticket.totalAmount)}</td>
            <td><span class="badge ${statusClass}">${escapeHtml(ticket.paymentStatus)}</span></td>
          </tr>`
          }
        })

        html += `
        </tbody>
      </table>
    </div>`
      })

      html += `
  </div>`
    }

    html += `
</body>
</html>`

    // Create and download HTML
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `ticket-report-${new Date().toISOString().split('T')[0]}.html`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Also open in new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  // Generate report view data with people counts (quantity * peoplePerTicket) and people details
  const generateReportViewData = () => {
    const report = generateReport()
    
    // Create ticket type map
    const ticketTypeMap = new Map(
      ticketTypesData.map(tt => [tt.name, tt.peoplePerTicket || 1])
    )

    // Meals view: Group by meal, show people count and ticket details
    // Each item in ticket.items represents one person's meal selection
    const mealsView = new Map<string, { count: number, items: Array<{ ticketId: string; itemIndex: number }> }>()
    
    tickets.forEach(ticket => {
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach((item, itemIndex) => {
          if (item.dish) {
            if (!mealsView.has(item.dish)) {
              mealsView.set(item.dish, { count: 0, items: [] })
            }
            const mealData = mealsView.get(item.dish)!
            // Add each item separately (one person per item)
            mealData.items.push({
              ticketId: ticket.id,
              itemIndex: itemIndex,
            })
            mealData.count += 1 // Each item = 1 person
          }
        })
      }
    })

    // Drinks view: Group by drink, show people count and ticket details
    // Each item in ticket.items represents one person's drink selection
    const drinksView = new Map<string, { count: number, items: Array<{ ticketId: string; itemIndex: number }> }>()
    
    tickets.forEach(ticket => {
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach((item, itemIndex) => {
          if (item.drink) {
            if (!drinksView.has(item.drink)) {
              drinksView.set(item.drink, { count: 0, items: [] })
            }
            const drinkData = drinksView.get(item.drink)!
            // Add each item separately (one person per item)
            drinkData.items.push({
              ticketId: ticket.id,
              itemIndex: itemIndex,
            })
            drinkData.count += 1 // Each item = 1 person
          }
        })
      }
    })

    // Ticket types view: Show people count and ticket details per ticket type
    // For ticket types, we use quantity * peoplePerTicket (total people who bought this ticket type)
    const ticketTypesView = new Map<string, { count: number, tickets: Array<{ ticketId: string; peopleCount: number }> }>()
    
    tickets.forEach(ticket => {
      const peoplePerTicket = ticketTypeMap.get(ticket.ticketType) || 1
      const totalPeople = peoplePerTicket * (ticket.quantity || 1)
      
      if (!ticketTypesView.has(ticket.ticketType)) {
        ticketTypesView.set(ticket.ticketType, { count: 0, tickets: [] })
      }
      const typeData = ticketTypesView.get(ticket.ticketType)!
      typeData.tickets.push({
        ticketId: ticket.id,
        peopleCount: totalPeople,
      })
      typeData.count += totalPeople
    })

    return {
      mealsView,
      drinksView,
      ticketTypesView,
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex py-6 flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Date Filter */}
          <Dropdown
            options={[
              { value: 'all', label: 'All Time', icon: CalendarIcon },
              { value: 'today', label: 'Today', icon: CalendarIcon },
              { value: 'custom', label: 'Custom', icon: CalendarIcon },
            ]}
            value={dateFilter}
            onChange={(value) => setDateFilter(value as 'today' | 'all' | 'custom')}
          />

          {/* Custom Date Range - Show when custom is selected */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="End Date"
              />
            </div>
          )}

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

        {/* Right Side - Report Buttons */}
        <div className="flex gap-3 items-center">
          {/* Download Report */}
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-br from-zinc-900 to-zinc-700 text-white rounded-lg text-sm hover:from-zinc-800 hover:to-zinc-600 shadow-sm active:scale-[0.95] transition-transform"
            title="Download Report"
          >
            <DownloadIcon size={16} />
            <span className="active:scale-[0.95] transition-transform">Download Report</span>
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

      {/* View Type Selector - Show when in report mode */}
      {viewModeType === 'report' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setReportViewType('meals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all active:scale-[0.95] ${
              reportViewType === 'meals'
                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <ForkKnifeIcon size={16} />
            <span>Meals</span>
          </button>
          <button
            onClick={() => setReportViewType('drinks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all active:scale-[0.95] ${
              reportViewType === 'drinks'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <WineIcon size={16} />
            <span>Drinks</span>
          </button>
          <button
            onClick={() => setReportViewType('ticket-types')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all active:scale-[0.95] ${
              reportViewType === 'ticket-types'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <TagIcon size={16} />
            <span>Ticket Types</span>
          </button>
        </div>
      )}

      {/* Total Tickets Sold - Show above table */}
      {viewModeType === 'tickets' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tickets Sold (Filtered)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalTicketsSold.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredTickets.length.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Table / Report Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          {viewModeType === 'tickets' ? (
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
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                          {formatCurrency(calculateNetRevenue(ticket.totalAmount, ticket.paymentStatus, ticket.isDirectPayment))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(ticket.paymentStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {ticket.isDirectPayment ? 'Direct Deposit' : 'Paystack'}
                          </span>
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
          ) : (
            (() => {
              const viewData = generateReportViewData()
              
              if (reportViewType === 'meals') {
                const meals = Array.from(viewData.mealsView.keys()).sort()
                return (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {meals.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-sm">No meals selected</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        meals.map((meal: string) => {
                          const mealData = viewData.mealsView.get(meal)!
                          return (
                            <tr key={meal} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{meal}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {mealData.count} {mealData.count === 1 ? 'person' : 'people'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => setSelectedReportItem({ type: 'meal', name: meal })}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                                >
                                  <InfoIcon size={16} />
                                  View Details
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )
              } else if (reportViewType === 'drinks') {
                const drinks = Array.from(viewData.drinksView.keys()).sort()
                return (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drinks.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-sm">No drinks selected</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        drinks.map((drink: string) => {
                          const drinkData = viewData.drinksView.get(drink)!
                          return (
                            <tr key={drink} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{drink}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {drinkData.count} {drinkData.count === 1 ? 'person' : 'people'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => setSelectedReportItem({ type: 'drink', name: drink })}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <InfoIcon size={16} />
                                  View Details
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )
              } else {
                // Ticket Types view
                const ticketTypes = Array.from(viewData.ticketTypesView.keys()).sort()
                return (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Number
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ticketTypes.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-sm">No tickets found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        ticketTypes.map((ticketType: string) => {
                          const typeData = viewData.ticketTypesView.get(ticketType)!
                          return (
                            <tr key={ticketType} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">{ticketType}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {typeData.count} {typeData.count === 1 ? 'person' : 'people'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => setSelectedReportItem({ type: 'ticket-type', name: ticketType })}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                >
                                  <InfoIcon size={16} />
                                  View Details
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )
              }
            })()
          )}
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
                      {formatCurrency(calculateNetRevenue(selectedTicket.totalAmount, selectedTicket.paymentStatus, selectedTicket.isDirectPayment))}
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
                                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                        <Image
                                          src={dishItem.imageUrl}
                                          alt={item.dish}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
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
                                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                        <Image
                                          src={drinkItem.imageUrl}
                                          alt={item.drink}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
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
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedTicket.createdAt)}</p>
                      </div>
                    </div>
                    {/* Payment Status */}
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
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
                            ? `Payment of ${formatCurrency(selectedTicket.totalAmount)} received. Net revenue: ${formatCurrency(calculateNetRevenue(selectedTicket.totalAmount, selectedTicket.paymentStatus, selectedTicket.isDirectPayment))}`
                            : 'Waiting for payment to be completed.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Ticket Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setTicketForDisplay(selectedTicket)
                      setShowTicketDisplay(true)
                      setSelectedTicket(null) // Close details modal
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-linear-to-br from-zinc-900 to-zinc-700 text-white px-4 py-3 rounded-xl hover:from-zinc-800 hover:to-zinc-600 shadow-sm active:scale-[0.95] transition-transform"
                  >
                    <TicketIconPhosphor size={20} weight="fill" />
                    <span>Generate Ticket</span>
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Ticket Display Modal */}
      <AnimatePresence>
        {showTicketDisplay && ticketForDisplay && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-zinc-800/50 z-60"
              onClick={() => {
                setShowTicketDisplay(false)
                setTicketForDisplay(null)
              }}
            />
            {/* Ticket Display Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 overflow-y-auto p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowTicketDisplay(false)
                  setTicketForDisplay(null)
                }
              }}
            >
              <div className="min-h-full flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
                  {/* Close Button */}
                  <button
                    onClick={() => {
                      setShowTicketDisplay(false)
                      setTicketForDisplay(null)
                    }}
                    className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-all active:scale-[0.95] bg-white rounded-full p-2 shadow-md"
                  >
                    <XIcon size={24} />
                  </button>
                  
                  {/* Ticket Display Content */}
                  <div className="p-6">
                    <TicketDisplay ticket={{
                      id: ticketForDisplay.id,
                      fullName: ticketForDisplay.fullName,
                      phoneNumber: ticketForDisplay.phoneNumber,
                      email: ticketForDisplay.email,
                      ticketType: ticketForDisplay.ticketType,
                      totalAmount: ticketForDisplay.totalAmount,
                      paymentReference: ticketForDisplay.paymentReference,
                      items: ticketForDisplay.items || [],
                      createdAt: ticketForDisplay.createdAt,
                    }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Report Details Modal */}
      <AnimatePresence>
        {selectedReportItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-zinc-800/50 z-70"
              onClick={() => setSelectedReportItem(null)}
            />
            {/* Report Details Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-xl z-70"
            >
              <div className="h-full overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedReportItem.type === 'meal' && 'Meal Details'}
                        {selectedReportItem.type === 'drink' && 'Drink Details'}
                        {selectedReportItem.type === 'ticket-type' && 'Ticket Type Details'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedReportItem.name}</p>
                    </div>
                    <button
                      onClick={() => setSelectedReportItem(null)}
                      className="text-gray-400 hover:text-gray-600 transition-all active:scale-[0.95]"
                    >
                      <XIcon size={24} />
                    </button>
                  </div>

                  {/* People List */}
                  <div>
                    {(() => {
                      const viewData = generateReportViewData()
                      let itemRefs: Array<{ ticketId: string; itemIndex?: number; peopleCount?: number }> = []
                      let totalPeople = 0
                      
                      if (selectedReportItem.type === 'meal') {
                        const mealData = viewData.mealsView.get(selectedReportItem.name)
                        itemRefs = mealData?.items || []
                        totalPeople = mealData?.count || 0
                      } else if (selectedReportItem.type === 'drink') {
                        const drinkData = viewData.drinksView.get(selectedReportItem.name)
                        itemRefs = drinkData?.items || []
                        totalPeople = drinkData?.count || 0
                      } else {
                        const typeData = viewData.ticketTypesView.get(selectedReportItem.name)
                        itemRefs = typeData?.tickets || []
                        totalPeople = typeData?.count || 0
                      }

                      // Create tickets map for quick lookup
                      const ticketsMap = new Map<string, Ticket>()
                      tickets.forEach(ticket => {
                        ticketsMap.set(ticket.id, ticket)
                      })

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">
                              Total: {totalPeople} {totalPeople === 1 ? 'person' : 'people'}
                            </p>
                          </div>

                          {itemRefs.map((itemRef, index) => {
                            const ticket = ticketsMap.get(itemRef.ticketId)
                            
                            if (!ticket) return null
                            
                            // For meals/drinks, get the specific item; for ticket types, show full ticket
                            const item = itemRef.itemIndex !== undefined && ticket.items 
                              ? ticket.items[itemRef.itemIndex] 
                              : null
                            
                            return (
                              <div key={`${itemRef.ticketId}-${itemRef.itemIndex ?? index}`} className="border border-gray-200 rounded-lg p-4">
                                <div className="mb-3 pb-3 border-b border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{ticket.fullName}</p>
                                      <p className="text-xs text-gray-500">{ticket.phoneNumber}</p>
                                      {ticket.email && (
                                        <p className="text-xs text-gray-500">{ticket.email}</p>
                                      )}
                                      {item && (
                                        <div className="mt-2 space-y-1">
                                          {item.dish && (
                                            <p className="text-xs text-gray-600">
                                              <span className="font-medium">Meal:</span> {item.dish}
                                            </p>
                                          )}
                                          {item.drink && (
                                            <p className="text-xs text-gray-600">
                                              <span className="font-medium">Drink:</span> {item.drink}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getTicketTypeColor(ticket.ticketType).badge}`}>
                                        {ticket.ticketType}
                                      </span>
                                      {itemRef.peopleCount && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {itemRef.peopleCount} {itemRef.peopleCount === 1 ? 'person' : 'people'}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Ticket ID:</span>
                                    <span className="text-gray-900 font-mono">{ticket.id}</span>
                                  </div>
                                  {ticket.paymentReference && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Payment Ref:</span>
                                      <span className="text-gray-900 font-mono">{ticket.paymentReference}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Quantity:</span>
                                    <span className="text-gray-900">{ticket.quantity || 1}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="text-gray-900">{formatCurrency(ticket.totalAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    {getStatusBadge(ticket.paymentStatus)}
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Created:</span>
                                    <span className="text-gray-900">{formatDate(ticket.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
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
