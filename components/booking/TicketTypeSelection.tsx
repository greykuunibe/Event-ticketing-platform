'use client'

import { useState, useEffect } from 'react'
import { TicketIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface TicketType {
  id: string
  name: string
  price: number
  peoplePerTicket: number
  color?: string | null
}

interface TicketTypeSelectionProps {
  selectedType: string | null
  onSelect: (type: string, price: number) => void
  eventId?: string | null
}

export default function TicketTypeSelection({
  selectedType,
  onSelect,
  eventId,
}: TicketTypeSelectionProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (eventId) {
      fetchTicketTypes()
    } else {
      // Reset state if eventId is not available
      setTicketTypes([])
      setLoading(false)
    }
  }, [eventId])

  const fetchTicketTypes = async () => {
    if (!eventId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const url = `/api/ticket-types?eventId=${encodeURIComponent(eventId)}`
      const response = await fetch(url, {
        cache: 'no-store', // Prevent caching issues in production
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch ticket types: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle both array and error response
      if (Array.isArray(data)) {
        setTicketTypes(data)
      } else if (data.error) {
        console.error('API Error:', data.error)
        setTicketTypes([])
      } else {
        setTicketTypes([])
      }
    } catch (error) {
      console.error('Error fetching ticket types:', error)
      setTicketTypes([])
    } finally {
      setLoading(false)
    }
  }

  const getGradientStyle = (color: string | null | undefined) => {
    const baseColor = color || '#4c6afe'
    // Create a darker shade for the gradient
    const rgb = hexToRgb(baseColor)
    if (!rgb) return `linear-gradient(135deg, ${baseColor}, ${baseColor})`
    
    const darkenAmount = 40
    const darkerRgb = {
      r: Math.max(0, rgb.r - darkenAmount),
      g: Math.max(0, rgb.g - darkenAmount),
      b: Math.max(0, rgb.b - darkenAmount),
    }
    const darkerColor = `rgb(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b})`
    
    return `linear-gradient(135deg, ${baseColor}, ${darkerColor})`
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  if (!eventId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading event information...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading ticket types...</p>
        </div>
      </div>
    )
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No ticket types available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1">
        {ticketTypes.map((type, index) => {
          const isSelected = selectedType === type.id
          const gradientStyle = getGradientStyle(type.color)
          const baseColor = type.color || '#f97316'
          
          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id, type.price)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!isSelected ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
              className={`relative p-6 border-2 rounded-xl text-left transition-all overflow-hidden ${
                isSelected
                  ? 'border-zinc-800 shadow-lg'
                  : 'border-gray-200 bg-stone-100 opacity-60'
              }`}
              style={
                isSelected
                  ? {
                      background: gradientStyle,
                      color: 'white',
                    }
                  : {}
              }
            >
              {/* Ticket-style design */}
              <div className="relative">
                {/* Perforated edge */}
                <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-center gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-white/30' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Ticket content */}
                <div className="pr-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TicketIcon
                      size={28}
                      weight={isSelected ? 'fill' : 'duotone'}
                      className={isSelected ? 'text-white' : 'text-gray-500'}
                    />
                    {isSelected && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-gray-800 font-semibold text-sm"
                      >
                        Selected
                      </motion.span>
                    )}
                  </div>
                  <h4 className={`font-bold mb-2 text-lg ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                    {type.name}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>GHS</span>
                    <p className={`text-3xl font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {type.price}
                    </p>
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
