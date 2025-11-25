'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SpinnerIcon, TicketIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  
  // Check for error in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Authentication failed. Please check your database connection and try again.')
      console.error('Auth error:', errorParam)
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl)
    }
  }, [status, session, router, callbackUrl])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signIn('google', { 
        callbackUrl,
        redirect: true 
      })
    } catch (error) {
      console.error('Sign in error:', error)
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
          <h1 className="text-3xl font-medium text-gray-500 mb-2">Welcome <span className='text-zinc-900'>back</span></h1>
          <p className="text-gray-600 text-sm">Sign in to manage your events</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              Common causes: Database connection issue, missing tables, or incorrect Supabase credentials.
            </p>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-center text-white px-4 py-2 rounded-xl active:opacity-80 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <SpinnerIcon className="animate-spin" size={20} />
              Signing in...
            </>
          ) : (
            <>
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
            </>
          )}
        </motion.button>
        {/* <p className="sm">By clicking &apos;Continue with Google&apos;, you acknowlegde that you have read and understood</p> */}

        <p className="mt-6 text-sm text-gray-500 text-center">
          <Link href="/" className="">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}

