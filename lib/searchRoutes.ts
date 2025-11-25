import { 
  HouseIcon, 
  CalendarDotsIcon, 
  TicketIcon, 
  ForkKnifeIcon, 
  CheckCircleIcon,
} from '@phosphor-icons/react'

export interface SearchableRoute {
  name: string
  href: string
  description: string
  keywords: string[]
  icon: any
  category: 'navigation' | 'feature'
}

export const searchableRoutes: SearchableRoute[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    description: 'Overview of ticket sales, revenue, and customer statistics',
    keywords: ['dashboard', 'overview', 'stats', 'statistics', 'revenue', 'sales', 'analytics'],
    icon: HouseIcon,
    category: 'navigation',
  },
  {
    name: 'Events',
    href: '/admin/events',
    description: 'Create and manage your events, view statistics and QR codes',
    keywords: ['events', 'event', 'create', 'manage', 'qr', 'qrcode'],
    icon: CalendarDotsIcon,
    category: 'navigation',
  },
  {
    name: 'Tickets',
    href: '/admin/tickets',
    description: 'View and manage all ticket purchases',
    keywords: ['tickets', 'ticket', 'purchases', 'bookings', 'reservations'],
    icon: TicketIcon,
    category: 'navigation',
  },
  {
    name: 'Admission',
    href: '/admin/admission',
    description: 'Admit participants and track entry on event day',
    keywords: ['admission', 'admit', 'entry', 'participants', 'check-in', 'track'],
    icon: CheckCircleIcon,
    category: 'navigation',
  },
  {
    name: 'Menu Items',
    href: '/admin/menu',
    description: 'Manage dishes and drinks available for tickets',
    keywords: ['menu', 'dishes', 'drinks', 'food', 'items', 'manage'],
    icon: ForkKnifeIcon,
    category: 'navigation',
  },
]

export function searchRoutes(query: string): SearchableRoute[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase().trim()
  
  return searchableRoutes
    .map((route) => {
      let score = 0
      
      // Exact name match (highest priority)
      if (route.name.toLowerCase() === lowerQuery) {
        score += 100
      } else if (route.name.toLowerCase().startsWith(lowerQuery)) {
        score += 50
      } else if (route.name.toLowerCase().includes(lowerQuery)) {
        score += 30
      }
      
      // Description match
      if (route.description.toLowerCase().includes(lowerQuery)) {
        score += 20
      }
      
      // Keywords match
      const keywordMatches = route.keywords.filter((keyword) =>
        keyword.toLowerCase().includes(lowerQuery)
      ).length
      score += keywordMatches * 10
      
      // Href match
      if (route.href.toLowerCase().includes(lowerQuery)) {
        score += 15
      }
      
      return { route, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ route }) => route)
}

