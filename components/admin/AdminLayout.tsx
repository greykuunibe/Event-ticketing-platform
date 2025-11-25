'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SearchProvider } from './SearchContext'
import { EventProvider } from './EventContext'
import { useSearchStore } from '@/stores/searchStore'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import SearchOverlay from './SearchOverlay'

interface AdminLayoutProps {
  children: ReactNode
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const { clearData } = useSearchStore()

  // Clear search data when route changes (pages will re-register their data)
  useEffect(() => {
    clearData()
  }, [pathname]) // Remove clearData - it's stable from zustand

  return (
    <>
        <div className="min-h-screen text-zinc-800 py-4 pr-2 flex bg-stone-100">
          <AdminSidebar />
          <div className="bg-white w-full rounded-xl overflow-y-auto border-2 border-gray-200 py-4 h-[calc(100vh-32px)]">
            <AdminHeader />
            <main className="px-6 ">
              {children}
            </main>
          </div>
        </div>
      <SearchOverlay />
    </>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SearchProvider>
      <EventProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </EventProvider>
    </SearchProvider>
  )
}

