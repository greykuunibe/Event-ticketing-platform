'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return

    if (status === 'unauthenticated') {
      hasRedirected.current = true
      router.replace('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname))
    } else if (status === 'authenticated' && !session?.user?.id) {
      // User was deleted - sign out and redirect
      hasRedirected.current = true
      signOut({ redirect: false })
      router.replace('/auth/signin')
    }
  }, [status, session?.user?.id, router]) // Use session?.user?.id instead of session

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-stone-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session?.user?.id) {
    return null
  }

  return <AdminLayout>{children}</AdminLayout>
}