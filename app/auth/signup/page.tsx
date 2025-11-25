'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { SpinnerIcon, TicketIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [googleId, setGoogleId] = useState<string | null>(null)
  const [isGoogleSignup, setIsGoogleSignup] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const email = searchParams.get('email')
  const id = searchParams.get('id')
  const message = searchParams.get('message')

  useEffect(() => {
    // Set email from URL params
    if (email) {
      setUserEmail(email)
      if (id) {
        setGoogleId(id)
        setIsGoogleSignup(true) // Email comes from Google OAuth
        // Pre-fill name from email if available
        if (!formData.name) {
          setFormData(prev => ({ ...prev, name: email.split('@')[0] }))
        }
      }
    }
    if (message) {
      setError(message)
    }
    // Mark initialization as complete
    setIsInitializing(false)
  }, [email, id, formData.name, message])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    // For Google signup, only password is required (name and email are from Google)
    // For regular signup, all fields are required
    if (isGoogleSignup) {
      if (!formData.password || !userEmail) {
        setError('Password is required')
        return
      }
    } else {
      if (!formData.name || !userEmail || !formData.password) {
        setError('All fields are required')
        return
      }
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create user account
      // For Google signup, name is optional (will default to email prefix)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: isGoogleSignup ? (formData.name || undefined) : formData.name,
          password: formData.password,
          googleId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If user already exists, redirect to signin
        if (data.error && (data.error.includes('already exists') || data.error.includes('User already exists'))) {
          router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&error=${encodeURIComponent(data.error)}`)
          return
        }
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Account created - sign in with credentials
      // For Google signup, use the name from form or email prefix
      const userName = formData.name || userEmail?.split('@')[0] || 'User'
      await signIn('credentials', {
        email: userEmail,
        password: formData.password,
        callbackUrl: `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        redirect: true,
      })
    } catch (error) {
      console.error('Error signing up:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <SpinnerIcon className="animate-spin text-orange-600" size={48} />
        </div>
      </div>
    )
  }

  // If no email after initialization, redirect to signin
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
              Full Name {isGoogleSignup && <span className="text-gray-400 text-xs">(optional)</span>}
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
              placeholder={isGoogleSignup ? "Enter your full name (optional)" : "Enter your full name"}
              required={!isGoogleSignup}
              autoFocus={!isGoogleSignup}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 pr-10 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
                placeholder="Enter your password (min. 6 characters)"
                required
                minLength={6}
                autoFocus={isGoogleSignup}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon size={20} weight="regular" />
                ) : (
                  <EyeIcon size={20} weight="regular" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 pr-10 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
                placeholder="Confirm your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon size={20} weight="regular" />
                ) : (
                  <EyeIcon size={20} weight="regular" />
                )}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            disabled={loading || (!isGoogleSignup && !formData.name) || !formData.password || !formData.confirmPassword}
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

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center">
          <div className="text-center">
            <SpinnerIcon className="animate-spin text-orange-600" size={48} />
          </div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}