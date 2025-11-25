'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  HouseIcon, 
  CalendarDotsIcon, 
  TicketIcon, 
  ForkKnifeIcon, 
  CheckCircleIcon,
  MagnifyingGlassIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { signOut } from 'next-auth/react'
import { useSearchStore } from '@/stores/searchStore'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HouseIcon },
  { name: 'Events', href: '/admin/events', icon: CalendarDotsIcon },
  { name: 'Tickets', href: '/admin/tickets', icon: TicketIcon },
  { name: 'Admission', href: '/admin/admission', icon: CheckCircleIcon },
  { name: 'Menu Items', href: '/admin/menu', icon: ForkKnifeIcon },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const openSearch = useSearchStore((state) => state.openSearch)

  const handleLogout = async () => {
    // Sign out from NextAuth (clears session, JWT token, etc.)
    // Use redirect: false and manually redirect to show proper loading state
    await signOut({ 
      callbackUrl: '/auth/callback?callbackUrl=/',
      redirect: false 
    })
    // Manually redirect to callback page which will show "Signing out..." message
    window.location.href = '/auth/callback?callbackUrl=/'
  }

  return (
    <div className="hidden md:block h-[calc(100vh-32px)] md:inset-y-0 md:z-50 md:flex md:w-1/5 md:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-stone-100 px-2">
        {/* header icon */}
        <div className="flex p-2 rounded-lg border border-gray-200 bg-white shrink-0 items-center gap-x-2">
          <div className="flex items-center justify-center rounded-md bg-orange-500 p-2">
            <TicketIcon size={20} weight="duotone" color='white' />
          </div>
          <div>
            <h1 className="text-sm font-medium">St. Cecilia PYC</h1>
            <p className="text-xs text-zinc-500">Event Admin</p>
          </div>
        </div>

        {/* Global Search Button */}
        <div className="shrink-0 mb-4">
          <button
            onClick={openSearch}
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 shadow-sm rounded-lg text-sm text-gray-600 hover:bg-white hover:border-gray-300 transition-all active:scale-[0.98] bg-stone-50"
          >
            <MagnifyingGlassIcon size={18} className="text-gray-400" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-white border border-gray-300 rounded">
              Ctrl+F
            </kbd>
          </button>
        </div>
        {/* navigation */}
        <nav className="flex w-full flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col w-full">
            <li>
              <ul role="list" className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 items-center hover:py-2.5 transition-all duration-200 rounded-md p-2 text-sm leading-6 font-medium cursor-pointer active:scale-[0.95]
                          ${isActive
                            ? 'bg-white border border-gray-200 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-800 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? '' : 'text-gray-400 group-hover:text-zinc-600'
                          }`}
                        />
                        <span className="active:scale-[0.95] transition-transform">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <button
                onClick={handleLogout}
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-600 w-full active:scale-[0.95] transition-transform"
              >
                <SignOutIcon className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-red-600" />
                <span className="active:scale-[0.95] transition-transform">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}

