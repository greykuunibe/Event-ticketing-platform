'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'

interface DropdownOption {
  value: string
  label: string
  icon?: any
  badge?: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && (
            <selectedOption.icon size={16} className="text-gray-500 flex-shrink-0" />
          )}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-600 text-white rounded">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <CaretDownIcon
          size={14}
          className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden"
            >
              <div className="py-1 max-h-60 overflow-y-auto">
                {options.map((option, index) => {
                  const isSelected = option.value === value
                  const Icon = option.icon
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {Icon && (
                        <Icon
                          size={18}
                          className={`flex-shrink-0 ${
                            isSelected ? 'text-gray-900' : 'text-gray-500'
                          }`}
                          weight={isSelected ? 'regular' : 'regular'}
                        />
                      )}
                      <span className="flex-1">{option.label}</span>
                      {option.badge && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-600 text-white rounded">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <CheckIcon size={16} className="text-gray-900 flex-shrink-0" weight="bold" />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

