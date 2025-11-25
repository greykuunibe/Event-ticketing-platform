'use client'

import Image from 'next/image'
import { CheckIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface MenuCardProps {
  id: string
  name: string
  imageUrl?: string | null
  isSelected: boolean
  onClick: () => void
  type: 'dish' | 'drink'
}

export default function MenuCard({
  id,
  name,
  imageUrl,
  isSelected,
  onClick,
  type,
}: MenuCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`relative bg-white rounded-xl shadow-sm overflow-hidden transition-all flex items-center w-full ${
        isSelected
          ? 'border-2 border-gray-800 shadow-md'
          : 'border border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Image Section - Left */}
      <div className="w-24 h-24 flex-shrink-0 bg-gray-100 relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}
      </div>

      {/* Name Section - Right */}
      <div className="flex-1 p-4 flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-900">{name}</h3>
        
        {/* Selected Tick Icon */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 ml-4"
          >
            <div className="bg-gray-800 rounded-full p-1.5">
              <CheckIcon size={18} weight="bold" className="text-white" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

