'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { SpinnerIcon, TicketIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [googleId, setGoogleId] = useState<string | null>(null)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const email = searchParams.get('email')
  const id = searchParams.get('id')
  const message = searchParams.get('message')

  useEffect(() => {
    if (email) {
      setUserEmail(email)
      if (id) {
        setGoogleId(id)
        // Pre-fill name from email if available
        if (!formData.name) {
          setFormData(prev => ({ ...prev, name: email.split('@')[0] }))
        }
      }
    }
    if (message) {
      setError(message)
    }
  }, [email, id, formData.name, message])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !userEmail) return

    setLoading(true)
    setError(null)

    try {
      // Create user account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: formData.name,
          googleId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Account created - redirect to sign in with Google
      await signIn('google', {
        callbackUrl,
        redirect: true,
      })
    } catch (error) {
      console.error('Error signing up:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    // Redirect to Google sign-in, then back to callback
    await signIn('google', {
      callbackUrl,
      redirect: true,
    })
  }

  // If no email, redirect to signin
  if (!userEmail) {
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    return null
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full">
        {/* Icon */}
        <div className="w-full flex items-center justify-center p-2 bg-zinc-100 gap-4 mb-8 rounded-full">
          <TicketIcon size={40} weight="duotone" rotate={180} className="animate-pulse text-zinc-900" />
          <TicketIcon size={40} weight="fill" className="text-zinc-900" />
          <TicketIcon size={40} weight="duotone" rotate={180} className="text-zinc-900" />
          <TicketIcon size={40} weight="fill" className="text-zinc-900" />
          <TicketIcon size={40} weight="duotone" rotate={180} className="animate-pulse text-zinc-900" />
        </div>
        <div className="text-center mb-16">
          <h1 className="text-3xl font-medium text-gray-500 mb-2">Start managing your events. <span className='text-zinc-900'>Your way</span></h1>
          <p className="text-gray-600 text-sm">{userEmail}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
            {message && (
              <p className="text-red-600 text-xs mt-2">
                Please complete your account setup below.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
              placeholder="Enter your full name"
              required
              autoFocus
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            disabled={loading || !formData.name}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-center text-white px-4 py-2 rounded-xl active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <SpinnerIcon className="animate-spin" size={20} />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          <Link href="/" className="">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
