'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { SpinnerIcon } from '@phosphor-icons/react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  
  // Get callbackUrl from query params (passed from signin) or default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  
  // Check if this is a logout scenario
  // During logout: callbackUrl is home page and status will be unauthenticated
  // We check the callbackUrl first since status might be loading initially
  const isLogout = callbackUrl === '/'

  useEffect(() => {
    // Wait for session to be loaded
    if (status === 'loading') {
      return
    }

    if (status === 'authenticated' && session) {
      // Check if user has an ID (exists in database)
      if (session.user?.id) {
        // Check if this is from Google OAuth (need to verify password)
        // or from credentials (password already verified)
        const isGoogleAuth = (session as any).googleId && !(session as any).passwordVerified
        
        if (isGoogleAuth) {
          // User authenticated via Google and exists in DB - redirect to password verification
          router.replace(
            `/auth/verify-password?email=${encodeURIComponent(session.user.email!)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
          )
        } else {
          // User authenticated via credentials - password already verified, redirect to callback URL
          // Or user authenticated via Google and password was verified
          router.replace(callbackUrl)
        }
      } else if (session.user?.email) {
        // User authenticated via Google but doesn't exist in DB - redirect to signup
        const googleId = (session as any).googleId || ''
        router.replace(
          `/auth/signup?email=${encodeURIComponent(session.user.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}&message=${encodeURIComponent('Your account is not registered. Please complete your sign up.')}${googleId ? `&id=${encodeURIComponent(googleId)}` : ''}`
        )
      } else {
        // No email - something went wrong, redirect to signin
        router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&error=missing_email`)
      }
    } else if (status === 'unauthenticated') {
      // Not authenticated - if callbackUrl is '/', this is a logout, redirect to home
      // Otherwise redirect to signin
      if (callbackUrl === '/') {
        router.replace('/')
      } else {
        router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      }
    }
  }, [status, session, router, callbackUrl])

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="text-center">
        <SpinnerIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
        <p className="text-gray-600">
          {isLogout ? 'Signing out...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center">
          <div className="text-center">
            <SpinnerIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}