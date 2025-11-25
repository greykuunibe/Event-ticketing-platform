'use client'

import { SessionProvider } from 'next-auth/react'
import { NotificationProvider } from '@/hooks/useNotification'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={10 * 60} // Refetch session every 10 minutes
      refetchOnWindowFocus={false} // Disable refetch on window focus to prevent refresh
    >
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  )
}