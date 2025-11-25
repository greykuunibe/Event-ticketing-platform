'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { SpinnerIcon } from '@phosphor-icons/react'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // User is authenticated and exists - redirect to callback URL
      router.replace(callbackUrl)
    } else if (status === 'authenticated' && session?.user?.email && !session?.user?.id) {
      // User authenticated but doesn't exist in DB - redirect to signup with message
      const googleId = (session as any).googleId || ''
      router.replace(
        `/auth/signup?email=${encodeURIComponent(session.user.email!)}&callbackUrl=${encodeURIComponent(callbackUrl)}&message=${encodeURIComponent('Your account is not registered. Please complete your sign up.')}${googleId ? `&id=${encodeURIComponent(googleId)}` : ''}`
      )
    } else if (status === 'unauthenticated') {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }
  }, [status, session, router, callbackUrl])

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="text-center">
        <SpinnerIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

