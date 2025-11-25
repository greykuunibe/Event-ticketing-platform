'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { SpinnerIcon, TicketIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

function VerifyPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const email = searchParams.get('email')

  useEffect(() => {
    if (!email) {
      router.push('/auth/signin')
      return
    }
    setUserEmail(email)
  }, [email, router])

  // Redirect after password verification when session updates
  useEffect(() => {
    if (isRedirecting && status === 'authenticated' && session?.user?.id) {
      // Session has updated after password verification, redirect to callback
      router.replace(`/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      setIsRedirecting(false)
      setLoading(false)
    }
  }, [status, session, router, callbackUrl, isRedirecting])
  
  // Fallback timeout in case session doesn't update
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (isRedirecting) {
      timeoutRef.current = setTimeout(() => {
        // If still redirecting after 3 seconds, redirect anyway
        router.replace(`/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`)
        setIsRedirecting(false)
        setLoading(false)
      }, 3000)
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isRedirecting, router, callbackUrl])

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !userEmail) return

    setLoading(true)
    setError(null)

    try {
      // Verify password and sign in with credentials
      // This will create a proper NextAuth session
      const result = await signIn('credentials', {
        email: userEmail,
        password,
        callbackUrl: `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid password')
        setLoading(false)
        return
      }

      if (result?.ok) {
        // Password verified - set flag to wait for session update, then redirect
        setIsRedirecting(true)
        // Session will update via useSession hook, useEffect will handle redirect
        // Fallback timeout is handled in separate useEffect
        return
      } else {
        // Unexpected result
        setError('An error occurred. Please try again.')
        setLoading(false)
      }
    } catch (error: any) {
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
                placeholder="Enter your password"
                required
                autoFocus
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

export default function VerifyPasswordPage() {
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
      <VerifyPasswordContent />
    </Suspense>
  )
}
