'use client'

import { UsersIcon, CurrencyCircleDollarIcon, TicketIcon, TrendUpIcon, InfoIcon } from '@phosphor-icons/react'

interface StatisticsProps {
  uniqueCustomers: number
  totalRevenue: number
  totalTicketsSold: number
  averageTicketPrice: number
  customersChange?: number
  revenueChange?: number
  ticketsChange?: number
}

export default function Statistics({
  uniqueCustomers,
  totalRevenue,
  totalTicketsSold,
  averageTicketPrice,
  customersChange = 0,
  revenueChange = 0,
  ticketsChange = 0,
}: StatisticsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const stats = [
    {
      label: 'Total People Signed Up',
      value: uniqueCustomers,
      change: customersChange,
      changeLabel: customersChange >= 0 ? `+${customersChange} people` : `${customersChange} people`,
      icon: UsersIcon,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Real-time Revenue',
      value: formatCurrency(totalRevenue),
      change: revenueChange,
      changeLabel: revenueChange >= 0 ? `+${revenueChange.toFixed(1)}%` : `${revenueChange.toFixed(1)}%`,
      icon: CurrencyCircleDollarIcon,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total Tickets Sold',
      value: totalTicketsSold,
      change: ticketsChange,
      changeLabel: ticketsChange >= 0 ? `+${ticketsChange} tickets` : `${ticketsChange} tickets`,
      icon: TicketIcon,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Average Ticket Price',
      value: formatCurrency(averageTicketPrice),
      change: 0,
      changeLabel: 'N/A',
      icon: TrendUpIcon,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 border shadow-xs rounded-lg bg-white border-gray-200 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.change >= 0
        return (
          <div
            key={index}
            className="p-6 border-r border-gray-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm">{stat.label}</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <InfoIcon size={20} className='text-gray-400' />
                </button>
              </div>
            </div>
            <div>
              <p className="text-3xl font-medium text-gray-900 mb-1">{stat.value}</p>
              <p className='text-sm text-gray-500' >
                vs yesterday <span className={`bg-green-50 p-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>{stat.changeLabel}</span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
