'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname))
    } else if (status === 'authenticated' && !session?.user?.id) {
      // User was deleted - sign out and redirect
      signOut({ redirect: false })
      router.replace('/auth/signin')
    }
  }, [status, session, router])

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

