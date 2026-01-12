# Library API (`lib/**`)

This document describes the public/shared exports from the `lib/` directory.

## `lib/supabase.ts`

### `supabase`

```ts
export const supabase = createClient(supabaseUrl, supabaseKey)
```

- **Purpose**: Server-side Supabase client used by route handlers and server utilities.
- **Environment variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` (required)
  - `SUPABASE_SERVICE_ROLE_KEY` (required)
- **Behavior**: Throws at module load time if either env var is missing.

Usage (server-side only):

```ts
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.from('events').select('*')
```

## `lib/auth.ts`

### `authOptions: NextAuthOptions`

NextAuth configuration used by `app/api/auth/[...nextauth]/route.ts`.

- **Providers**:
  - Credentials (email/password checked against `users` table; bcrypt comparison)
  - Google OAuth
- **Notable behaviors**:
  - Soft-deleted users (`deletedAt`) are blocked.
  - The JWT callback stores:
    - `token.id` for DB user id (when known)
    - `token.googleId` to support the Google signup flow
    - `token.passwordVerified` for credentials sign-in
  - `redirect` callback forces most redirects through `/auth/callback`.

## `lib/auth-helpers.ts`

### `verifyUserExists(userId: string): Promise<boolean>`

Checks whether a non-deleted user exists.

```ts
import { verifyUserExists } from '@/lib/auth-helpers'
const ok = await verifyUserExists(userId)
```

### `getAuthenticatedUser(): Promise<{ id: string; ... } | null>`

Returns the authenticated session user **only if** the user still exists in the DB.

Typical usage in route handlers:

```ts
import { getAuthenticatedUser } from '@/lib/auth-helpers'

const user = await getAuthenticatedUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

## `lib/paystack.ts`

### `initializePayment(email, amount, reference, metadata?)`

Initializes a Paystack transaction and returns the SDK response.

- **Args**:
  - `email: string`
  - `amount: number` (in GHS; library converts to kobo by multiplying by 100)
  - `reference: string` (your internal reference)
  - `metadata?: Record<string, any>`
- **Callback URL**:
  - computed as `${NEXT_PUBLIC_BASE_URL}/tickets/success/:reference`
  - falls back to `https://event-ticketing-platform.netlify.app` when missing

Example:

```ts
import { initializePayment } from '@/lib/paystack'

const res = await initializePayment('jane@example.com', 120, 'TKT-ABC123', { ticketId: '...' })
```

### `verifyPayment(reference: string)`

Verifies a Paystack transaction by reference.

```ts
import { verifyPayment } from '@/lib/paystack'
const res = await verifyPayment('TKT-ABC123')
```

### `default export paystack`

The initialized Paystack SDK instance:

```ts
import paystack from '@/lib/paystack'
```

## `lib/email.ts`

### `sendTicketEmail(email, ticketData)`

Sends a ticket confirmation email via Resend.

- **Env**: `RESEND_API_KEY`
- **ticketData**:
  - `fullName`, `ticketType`, `items`, `paymentReference`, `totalAmount`

### `sendAdmissionEmail(email, ticketData)`

Sends a “Admission Confirmed” email via Resend.

Includes `eventName` and `admittedAt`.

## `lib/qrcode.ts`

### `generateQRCode(data: string): Promise<string>`

Returns a QR code image as a data URL.

```ts
import { generateQRCode } from '@/lib/qrcode'
const dataUrl = await generateQRCode('some text')
```

## `lib/ticket-generator.ts`

### `downloadTicketAsPNG(elementId: string, filename: string)`

Client-side helper that renders an element to PNG via `html-to-image` and triggers a download.

Example:

```ts
import { downloadTicketAsPNG } from '@/lib/ticket-generator'

await downloadTicketAsPNG('ticket-content', 'ticket.png')
```

## `lib/searchRoutes.ts`

### `SearchableRoute`

```ts
export interface SearchableRoute {
  name: string
  href: string
  description: string
  keywords: string[]
  icon: any
  category: 'navigation' | 'feature'
}
```

### `searchableRoutes`

Static list of admin routes used by the global search overlay.

### `searchRoutes(query: string): SearchableRoute[]`

Performs a scored search over `searchableRoutes`.

```ts
import { searchRoutes } from '@/lib/searchRoutes'
const results = searchRoutes('ticket')
```

## `lib/searchData.ts`

### `searchDataItems(items, query): SearchableDataItem[]`

Scored search over arbitrary data items registered into the global search store.

```ts
import { searchDataItems } from '@/lib/searchData'
import type { SearchableDataItem } from '@/stores/searchStore'

const results = searchDataItems(items, 'jane')
```

## `lib/constants.ts`

### `TICKET_TYPES`, `DISHES`, `DRINKS`

Static arrays (declared `as const`) of default ticket types/dishes/drinks.

Note: the live product behavior is primarily driven by database tables (`ticket_types`, `dishes`, `drinks`); these constants are most useful as seed/reference data.

