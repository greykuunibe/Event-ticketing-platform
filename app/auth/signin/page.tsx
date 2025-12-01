'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense, useRef } from 'react'
import { SpinnerIcon, TicketIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  
  // Check for error in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      // Decode the error message if it's URL encoded
      const decodedError = decodeURIComponent(errorParam)
      
      if (errorParam === 'CredentialsSignin' || decodedError === 'CredentialsSignin') {
        setError('Invalid email or password')
      } else if (decodedError.includes('DATABASE_CONNECTION_ERROR') || 
                 decodedError.includes('Database connection') ||
                 decodedError.includes('database connection')) {
        setError('Database connection failed. Please check your connection and try again.')
      } else if (decodedError.includes('Account has been deleted')) {
        setError('This account has been deleted. Please contact support.')
      } else if (decodedError.includes('Password not set')) {
        setError(decodedError)
      } else {
        // Show the actual error message if available, otherwise show generic message
        const errorMessage = decodedError !== errorParam ? decodedError : 'Invalid email or password'
        setError(errorMessage)
      }
      console.error('Auth error:', errorParam, 'Decoded:', decodedError)
    }
  }, [searchParams])

  // Track if we've already attempted a redirect to prevent loops
  const hasRedirectedRef = useRef(false)
  
  // Redirect if already authenticated AND user exists in database
  useEffect(() => {
    // Prevent redirect loops - only redirect once
    if (status === 'loading' || hasRedirectedRef.current) {
      return
    }
    
    const currentPath = window.location.pathname
    
    // Don't redirect if we're already on an auth page (except during active sign-in)
    if (currentPath.includes('/auth/') && !isRedirecting) {
      return
    }
    
    if (isRedirecting && status === 'authenticated' && session?.user?.id) {
      // Session has updated after sign-in, redirect to callback
      hasRedirectedRef.current = true
      router.replace(`/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      setIsRedirecting(false)
      setLoading(false)
    } else if (status === 'authenticated' && session?.user?.id && !isRedirecting) {
      // Already authenticated (not from current sign-in) - redirect directly
      // Only redirect if we're not already on the target page or an auth page
      if (!currentPath.startsWith(callbackUrl) && !currentPath.includes('/auth/')) {
        hasRedirectedRef.current = true
        router.push(callbackUrl)
      }
    } else if (status === 'authenticated' && session?.user?.email && !session?.user?.id) {
      // User authenticated but doesn't exist in DB - redirect to signup
      // Only redirect if we're not already on signup page
      if (!currentPath.includes('/auth/signup')) {
        hasRedirectedRef.current = true
        router.replace(
          `/auth/signup?email=${encodeURIComponent(session.user.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}&message=${encodeURIComponent('Your account is not registered. Please complete your sign up.')}`
        )
      }
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Sign in with credentials (NextAuth will verify password)
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl: `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        redirect: false,
      })

      if (result?.error) {
        // Check if it's a database connection error
        const errorMessage = result.error
        if (errorMessage.includes('DATABASE_CONNECTION_ERROR') || 
            errorMessage.includes('Database connection') ||
            errorMessage.includes('database connection')) {
          setError('Database connection failed. Please check your connection and try again.')
        } else if (errorMessage.includes('Account has been deleted')) {
          setError('This account has been deleted. Please contact support.')
        } else if (errorMessage.includes('Password not set')) {
          setError(errorMessage)
        } else {
          setError('Invalid email or password')
        }
        setLoading(false)
        return
      }

      if (result?.ok) {
        // Success - set flag to wait for session update, then redirect
        setIsRedirecting(true)
        // Session will update via useSession hook, useEffect will handle redirect
        // Keep loading state true during redirect
        return
      } else {
        // Unexpected result
        setError('An error occurred. Please try again.')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen  bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white  border border-zinc-200 rounded-lg p-8 max-w-md w-full">
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
          <p className="text-gray-600 text-sm">Sign in to manage your events</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-left"
              placeholder="Enter your email"
              required
              autoFocus
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
                placeholder="Enter your password"
                required
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
            disabled={loading || !formData.email || !formData.password}
            className="flex items-center justify-center gap-2 w-full bg-linear-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-center text-white px-4 py-2 rounded-xl active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <SpinnerIcon className="animate-spin" size={20} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={async () => {
            setLoading(true)
            await signIn('google', {
              callbackUrl: `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              redirect: true,
            })
          }}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </motion.button>

        <p className="mt-6 text-sm text-gray-500 text-center">
          <Link href="/" className="">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  )
}
