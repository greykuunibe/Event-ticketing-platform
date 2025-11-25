'use client'

import { TicketIcon, CheckCircleIcon, XCircleIcon, TrendUpIcon, InfoIcon } from '@phosphor-icons/react'

interface AdmissionStatisticsProps {
  totalPaid: number
  admitted: number
  notAdmitted: number
  admissionRate: number
}

export default function AdmissionStatistics({
  totalPaid,
  admitted,
  notAdmitted,
  admissionRate,
}: AdmissionStatisticsProps) {
  const stats = [
    {
      label: 'Total Paid Tickets',
      value: totalPaid,
      change: 0,
      changeLabel: 'N/A',
      icon: TicketIcon,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Admitted',
      value: admitted,
      change: 0,
      changeLabel: 'N/A',
      icon: CheckCircleIcon,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Not Admitted',
      value: notAdmitted,
      change: 0,
      changeLabel: 'N/A',
      icon: XCircleIcon,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Admission Rate',
      value: `${admissionRate.toFixed(1)}%`,
      change: 0,
      changeLabel: 'N/A',
      icon: TrendUpIcon,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 border shadow-xs rounded-lg bg-white border-gray-200 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="p-6 border-r border-gray-200 last:border-r-0"
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
                {stat.changeLabel !== 'N/A' ? (
                  <>vs yesterday <span className={`bg-green-50 p-1 text-sm ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stat.changeLabel}</span></>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

