'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useRef } from 'react'
import { SpinnerIcon } from '@phosphor-icons/react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const hasRedirectedRef = useRef(false)
  
  // Get callbackUrl from query params (passed from signin) or default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  
  // Check if this is a logout scenario
  // During logout: callbackUrl is home page and status will be unauthenticated
  // We check the callbackUrl first since status might be loading initially
  const isLogout = callbackUrl === '/'

  useEffect(() => {
    // Wait for session to be loaded
    if (status === 'loading' || hasRedirectedRef.current) {
      return
    }
    
    const currentPath = window.location.pathname
    console.log('Callback page - status:', status, 'hasId:', !!session?.user?.id, 'currentPath:', currentPath, 'callbackUrl:', callbackUrl)

    if (status === 'authenticated' && session) {
      // Check if user has an ID (exists in database)
      if (session.user?.id) {
        // Check if this is from Google OAuth (need to verify password)
        // or from credentials (password already verified)
        const isGoogleAuth = (session as any).googleId && !(session as any).passwordVerified
        
        if (isGoogleAuth) {
          // User authenticated via Google and exists in DB - redirect to password verification
          if (!currentPath.includes('/auth/verify-password')) {
            console.log('Redirecting to verify-password')
            hasRedirectedRef.current = true
            router.replace(
              `/auth/verify-password?email=${encodeURIComponent(session.user.email!)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
            )
          }
        } else {
          // User authenticated via credentials - password already verified, redirect to callback URL
          // Or user authenticated via Google and password was verified
          // Always redirect from callback page to the target URL (unless already there)
          if (!currentPath.startsWith(callbackUrl)) {
            console.log('Redirecting to callbackUrl:', callbackUrl)
            hasRedirectedRef.current = true
            router.replace(callbackUrl)
          } else {
            console.log('Already on target page, no redirect needed')
          }
        }
      } else if (session.user?.email) {
        // User authenticated but doesn't have ID - verify if they actually exist in DB
        // This handles cases where JWT callback might have failed to set the ID
        const checkUserExists = async () => {
          const userEmail = session.user?.email
          if (!userEmail) {
            router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&error=missing_email`)
            return
          }
          
          try {
            console.log('Checking if user exists:', userEmail)
            const checkResponse = await fetch(`/api/auth/check-user?email=${encodeURIComponent(userEmail)}`)
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json()
              console.log('User check result:', checkData)
              
              if (checkData.exists && checkData.userId) {
                // User actually exists - they need to sign in with password
                // This means they registered before but are trying to use Google OAuth
                // Redirect to signin with a clear message (only if not already on signin)
                if (!currentPath.includes('/auth/signin') && !hasRedirectedRef.current) {
                  hasRedirectedRef.current = true
                  console.log('User exists, redirecting to signin')
                  router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&error=${encodeURIComponent('An account with this email already exists. Please sign in with your password instead.')}`)
                }
                return
              } else if (checkData.error) {
                // Error checking user - might be a database issue
                console.error('Error from check-user API:', checkData.error)
                // Still redirect to signup, but user might get an error
              }
            } else {
              // API call failed
              const errorData = await checkResponse.json().catch(() => ({}))
              console.error('Failed to check user existence:', checkResponse.status, errorData)
            }
          } catch (checkError) {
            console.error('Error checking user existence:', checkError)
            // Continue to signup redirect if check fails
          }
          
          // User authenticated via Google but doesn't exist in DB - redirect to signup
          // Only redirect if we confirmed they don't exist AND we're not already on signup
          if (!currentPath.includes('/auth/signup') && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true
            const googleId = (session as any).googleId || ''
            console.log('User does not exist, redirecting to signup')
            router.replace(
              `/auth/signup?email=${encodeURIComponent(userEmail)}&callbackUrl=${encodeURIComponent(callbackUrl)}&message=${encodeURIComponent('Your account is not registered. Please complete your sign up.')}${googleId ? `&id=${encodeURIComponent(googleId)}` : ''}`
            )
          }
        }
        
        checkUserExists()
      } else {
        // No email - something went wrong, redirect to signin
        if (!hasRedirectedRef.current && !currentPath.includes('/auth/signin')) {
          hasRedirectedRef.current = true
          router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&error=missing_email`)
        }
      }
    } else if (status === 'unauthenticated') {
      // Not authenticated - if callbackUrl is '/', this is a logout, redirect to home
      // Otherwise redirect to signin
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        if (callbackUrl === '/') {
          router.replace('/')
        } else if (!currentPath.includes('/auth/signin')) {
          router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
        }
      }
    }
  }, [status, session, router, callbackUrl])

  // Fallback timeout - if we're stuck on callback page for more than 5 seconds, force redirect
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !hasRedirectedRef.current) {
      const timeout = setTimeout(() => {
        if (!hasRedirectedRef.current) {
          console.log('Fallback timeout: forcing redirect to', callbackUrl)
          hasRedirectedRef.current = true
          router.replace(callbackUrl)
        }
      }, 5000)
      
      return () => clearTimeout(timeout)
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