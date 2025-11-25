'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface PersonalInfoFormProps {
  onNext: (data: { fullName: string; phoneNumber: string; email: string }) => void
}

export default function PersonalInfoForm({ onNext }: PersonalInfoFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(formData)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2 text-left">
          Full Name *
        </label>
        <input
          type="text"
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className={`w-full px-4 py-2 bg-white shadow-sm border rounded-lg focus:outline-zinc-800 focus:border-gray-200  transition-colors text-left ${
            errors.fullName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
        />
        {errors.fullName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-red-600 text-left"
          >
            {errors.fullName}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2 text-left">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phoneNumber"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          className={`w-full px-4 py-2 bg-white shadow-sm border rounded-lg focus:outline-zinc-800 focus:border-gray-200  transition-colors text-left ${
            errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your phone number"
        />
        {errors.phoneNumber && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-red-600 text-left"
          >
            {errors.phoneNumber}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 text-left">
          Email (Optional)
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 bg-white shadow-sm border rounded-lg focus:outline-zinc-800 focus:border-gray-200  transition-colors text-left"
          placeholder="Enter your email (optional)"
        />
        <p className="mt-1 text-sm text-gray-500 text-left">
          We'll send your ticket to this email too if provided
        </p>
      </motion.div>

      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex mt-8 items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80"
      >
        Continue
      </motion.button>
    </motion.form>
  )
}

