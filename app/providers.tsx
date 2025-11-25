'use client'

import { SessionProvider } from 'next-auth/react'
import { NotificationProvider } from '@/hooks/useNotification'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window gains focus
    >
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  )
}

