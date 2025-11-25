'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SpinnerIcon, TicketIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export default function VerifyPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const email = searchParams.get('email')

  useEffect(() => {
    if (!email) {
      router.push('/auth/signin')
      return
    }
    setUserEmail(email)
  }, [email, router])

  // Don't auto-redirect if session exists - user needs to verify password first
  // The redirect will happen after successful password verification via handleVerifyPassword

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !userEmail) return

    setLoading(true)
    setError(null)

    try {
      // Verify password
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid password')
        setLoading(false)
        return
      }

      // Password verified - store flag in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('passwordVerified', 'true')
        sessionStorage.setItem('verifiedEmail', userEmail)
      }
      
      // Redirect directly to the callback URL
      // The callback page will check the sessionStorage flag and allow access
      router.replace(callbackUrl)
    } catch (error) {
      console.error('Error verifying password:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
        <div className="text-center">
          <SpinnerIcon className="animate-spin text-orange-600" size={48} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full">
        {/* Icon */}
        <div className="w-full flex items-center justify-center p-2 bg-zinc-100 gap-4 mb-8 rounded-full">
          <TicketIcon size={40} weight="duotone" rotate={180} className="animate-pulse text-zinc-900" />
          <TicketIcon size={40} weight="fill" className="text-zinc-900" />
          <TicketIcon size={40} weight="duotone" rotate={180} className="text-zinc-900" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-500 mb-2">
            Enter your <span className="text-zinc-900">password</span>
          </h1>
          <p className="text-gray-600 text-sm">
            {userEmail}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleVerifyPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
              placeholder="Enter your password"
              required
              autoFocus
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            disabled={loading || !password}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-center text-white px-4 py-2 rounded-xl active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <SpinnerIcon className="animate-spin" size={20} />
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          <button
            onClick={() => router.push('/auth/signin')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to sign in
          </button>
        </p>
      </div>
    </div>
  )
}

