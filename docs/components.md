# Components, Hooks, Contexts, and Stores

This document covers the exported “public” UI building blocks in:

- `components/**`
- `hooks/**`
- `stores/**`
- `app/providers.tsx` (app-level providers)

## App-level providers

### `app/providers.tsx` — `Providers`

Wraps the app in:

- `SessionProvider` (NextAuth)
- `NotificationProvider` (custom notifications)

Usage (already wired in `app/layout.tsx`):

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Hooks

### `hooks/useNotification.tsx`

#### `NotificationProvider`

Context provider that renders toast notifications in the top-right corner.

#### `useNotification()`

Returns:

- `showNotification(type, message, duration?)`
- convenience shortcuts: `success`, `error`, `warning`, `info`

Usage:

```tsx
import { useNotification } from '@/hooks/useNotification'

export function SaveButton() {
  const { success, error } = useNotification()

  return (
    <button
      onClick={async () => {
        try {
          // ... do work
          success('Saved!')
        } catch (e) {
          error('Failed to save')
        }
      }}
    >
      Save
    </button>
  )
}
```

## State (Zustand)

### `stores/searchStore.ts` — `useSearchStore`

Global search overlay state + searchable data registry.

- **State**:
  - `searchQuery: string`
  - `isOpen: boolean`
  - `searchableData: SearchableDataItem[]`
- **Actions**:
  - `setSearchQuery(query)`
  - `openSearch()`, `closeSearch()`, `toggleSearch()`
  - `registerData(items)` (replaces `searchableData`)
  - `clearData()`

Usage:

```ts
import { useSearchStore } from '@/stores/searchStore'

useSearchStore.getState().openSearch()
```

## Admin layout & navigation components

### `components/admin/AdminLayout.tsx` — `AdminLayout`

Wraps admin pages with:

- `SearchProvider` and `EventProvider` contexts
- `AdminSidebar`, `AdminHeader`, and `SearchOverlay`
- Clears registered search data on route changes (`clearData()`).

Usage (already used by `app/admin/layout.tsx`):

```tsx
import AdminLayout from '@/components/admin/AdminLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
```

### `components/admin/AdminSidebar.tsx` — `AdminSidebar`

Left navigation and “Search…” button (Ctrl+F) plus logout.

Notes:

- Logout calls `signOut({ redirect: false })` then redirects to `/auth/callback?callbackUrl=/`.

### `components/admin/AdminHeader.tsx` — `AdminHeader`

Top bar:

- Active page title/description (based on current path)
- Event filter dropdown (calls `/api/events` to populate)
- User avatar/name/email from NextAuth session

### `components/admin/Dropdown.tsx` — `Dropdown`

Reusable dropdown with optional icons and badges.

Props:

- `options: { value: string; label: string; icon?: any; badge?: string }[]`
- `value: string`
- `onChange(value: string): void`
- `placeholder?: string`
- `className?: string`

Example:

```tsx
import Dropdown from '@/components/admin/Dropdown'

<Dropdown
  value={status}
  onChange={setStatus}
  options={[
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
  ]}
/>
```

### `components/admin/SearchOverlay.tsx` — `SearchOverlay`

Full-screen search modal.

- Opens via `useSearchStore().openSearch()` or Ctrl+F.
- Searches:
  - routes via `searchRoutes(query)`
  - registered items via `searchDataItems(searchableData, query)`
- Stores recent searches in `localStorage` (up to 5).

### `components/admin/Statistics.tsx` — `Statistics`

Dashboard statistic cards.

Props:

- `uniqueCustomers: number`
- `totalRevenue: number` (net revenue)
- `totalTicketsSold: number`
- `averageTicketPrice: number`
- optional day-over-day deltas: `customersChange`, `revenueChange`, `ticketsChange`

### `components/admin/AdmissionStatistics.tsx` — `AdmissionStatistics`

Admission/check-in cards.

Props:

- `totalPaid: number`
- `admitted: number`
- `notAdmitted: number`
- `admissionRate: number` (percentage)

### Skeleton components

- `components/admin/skeletons/EventCardSkeleton.tsx`
- `components/admin/skeletons/StatisticsSkeleton.tsx`
- `components/admin/skeletons/TableSkeleton.tsx` (`rows?`, `columns?`)

Use these while loading server data.

## Admin contexts

### `components/admin/EventContext.tsx`

- `EventProvider`
- `useEvent()`: `{ selectedEventId, setSelectedEventId, events, setEvents }`

Usage:

```tsx
import { useEvent } from '@/components/admin/EventContext'
const { selectedEventId, setSelectedEventId } = useEvent()
```

### `components/admin/SearchContext.tsx`

- `SearchProvider`
- `useSearch()`: `{ searchQuery, setSearchQuery, registerSearchHandler }`

Notes:

- `SearchOverlay` mainly reads from the Zustand store, but this context supports registering a page-specific handler that reacts to query changes.

## Admin ticket table

### `components/admin/TicketList.tsx` — `TicketList`

Renders:

- filtering (status, ticket type), sorting, and a detail modal for a list of tickets
- net revenue calculation: multiplies paid totals by \(1 - 0.0195\) (Paystack fee)

Props:

- `tickets: Ticket[]`
- `onRefresh(): void`
- `ticketTypes?: TicketType[]`
- optional view toggles:
  - `viewMode?: 'tickets' | 'ticket-types'`
  - `onViewModeChange?: (mode) => void`

## Booking flow components

### `components/booking/PersonalInfoForm.tsx` — `PersonalInfoForm`

Collects:

- `fullName` (required)
- `phoneNumber` (required)
- `email` (optional)

Props:

- `onNext(data: { fullName; phoneNumber; email }): void`

### `components/booking/TicketTypeSelection.tsx` — `TicketTypeSelection`

Fetches ticket types for an event and allows selecting one.

Props:

- `selectedType: string | null` (ticket type id)
- `onSelect(typeId: string, price: number): void`
- `eventId?: string | null`

Behavior:

- fetches `/api/ticket-types?eventId=...` with `cache: 'no-store'`

### `components/booking/TicketItemsForm.tsx` — `TicketItemsForm`

Allows selecting one dish and one drink per ticket, fetching menu items from `/api/menu`.

Props:

- `ticketType: string`
- `numberOfTickets: number`
- `onItemsChange(items: { dish; drink }[]): void`
- `eventId?: string`

### `components/booking/MenuCard.tsx` — `MenuCard`

Selectable card (dish/drink) with image + checkmark.

Props:

- `id: string`
- `name: string`
- `imageUrl?: string | null`
- `isSelected: boolean`
- `onClick(): void`
- `type: 'dish' | 'drink'`

## Ticket display

### `components/ticket/TicketDisplay.tsx` — `TicketDisplay`

Renders a ticket confirmation view and provides a “Download as PNG” button via `downloadTicketAsPNG()`.

Props:

- `ticket: { id; fullName; phoneNumber; email?; ticketType; totalAmount; paymentReference?; items; createdAt }`

