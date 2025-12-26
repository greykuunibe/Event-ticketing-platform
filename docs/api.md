# HTTP API Reference (`/api/*`)

This project uses Next.js App Router route handlers. Each endpoint below maps to a `route.ts` under `app/api/**`.

## Authentication model (important)

- **Admin endpoints** (mostly under `/api/admin/*` and some non-`/admin` routes like `/api/events`) call `getAuthenticatedUser()` and return **`401 Unauthorized`** when there is no valid NextAuth session.
- **Public endpoints** are callable without auth.
- The **admin UI routes** (`/admin/*`) are additionally protected by `middleware.ts` which checks for a NextAuth session cookie and redirects to `/auth/signin`.

## Common response conventions

- Error payloads are typically `{ "error": "message" }`, sometimes with `details`/`message`.
- Most endpoints return JSON with `Content-Type: application/json`.

---

## Auth

### `POST /api/auth/signup`

Creates an application user in the `users` table.

- **Auth**: Public
- **Body (JSON)**:
  - `email` (string, required)
  - `password` (string, required, min 6)
  - `name` (string, optional)
  - `googleId` (string, optional; used as the user id when present)
- **Success (200)**:
  - `{ success: true, userId, email, name }`
- **Errors**:
  - `400`: missing fields / weak password / user exists
  - `403`: user was deleted and cannot be recreated
  - `409`: unique constraint conflict
  - `500`: database/insert failure

Example:

```bash
curl -sS -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secret123",
    "name": "Admin"
  }'
```

### `GET /api/auth/check-user?email=...` (or `POST /api/auth/check-user`)

Checks whether a non-deleted user exists for the given email.

- **Auth**: Public
- **GET Query**: `email` (required)
- **POST Body**: `{ email }`
- **Success (200)**:
  - `{ exists: false }` or `{ exists: true, userId, name }`
- **Errors**:
  - `400`: missing email
  - `500`: database failure

Example:

```bash
curl -sS "http://localhost:3000/api/auth/check-user?email=admin%40example.com"
```

### `POST /api/auth/verify-password`

Verifies an email/password combination against the `users` table.

- **Auth**: Public
- **Body**: `{ email, password }`
- **Success (200)**: `{ success: true, userId, email, name }`
- **Errors**:
  - `400`: missing fields
  - `401`: invalid credentials / password not set
  - `500`: server error

Example:

```bash
curl -sS -X POST "http://localhost:3000/api/auth/verify-password" \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "secret123" }'
```

### `GET|POST /api/auth/[...nextauth]`

NextAuth handler.

- **Auth**: Public (drives auth flows)
- **Notes**:
  - Providers: credentials + Google OAuth
  - Session strategy: JWT
  - Custom sign-in page: `/auth/signin`

### `GET /api/auth/debug`

Returns diagnostic auth/environment information.

- **Auth**: Public
- **Availability**: **development only** (`NODE_ENV === 'development'`)
- **Success (200)**: `{ hasSession, session, env }`
- **Errors**:
  - `404`: in production
  - `500`: server error

---

## Events

### `GET /api/events`

Returns events for the authenticated user.

- **Auth**: Admin (session required)
- **Success (200)**: list of events (includes `tickets:tickets(count)` join data)
- **Errors**:
  - `401`: unauthorized

Example:

```bash
curl -sS "http://localhost:3000/api/events"
```

### `POST /api/events`

Creates an event for the authenticated user and generates an `qrCode` identifier.

- **Auth**: Admin
- **Body**: `{ name, description?, eventDate?, location? }`
- **Success (201)**: created event row
- **Errors**:
  - `401`: unauthorized
  - `500`: insert failure

### `GET /api/events/:id`

Fetches a single event by id.

- **Auth**: Public
- **Success (200)**: event
- **Errors**:
  - `404`: not found

Example:

```bash
curl -sS "http://localhost:3000/api/events/00000000-0000-0000-0000-000000000000"
```

### `GET /api/events/qr/:qrCode`

Fetches a single event by its `qrCode` field.

- **Auth**: Public
- **Success (200)**: event
- **Errors**:
  - `404`: not found

### `GET /api/events/:id/details`

Returns the event (owned by the user) and computed statistics.

- **Auth**: Admin
- **Success (200)**:
  - `{ event, statistics }`
  - `statistics` includes:
    - `totalTickets`, `paidTickets`, `pendingTickets`
    - `totalRevenue` (**net**, after Paystack fee multiplier \(1 - 0.0195\))
    - `totalQuantity`, `participants` (unique phone numbers), `ticketsByType`
- **Errors**:
  - `401`: unauthorized
  - `404`: event not found (or not owned by user)

---

## Ticket types

### `GET /api/ticket-types?eventId=...`

Public ticket types used by the booking flow. Ticket types are returned **for the event’s `userId`**.

- **Auth**: Public
- **Query**: `eventId` (required)
- **Success (200)**: ticket type list (sorted by price)
- **Errors**:
  - `400`: missing `eventId`
  - `404`: event not found
  - `500`: event has no userId or query failure

Example:

```bash
curl -sS "http://localhost:3000/api/ticket-types?eventId=EVENT_ID"
```

---

## Tickets (public + admin)

### `POST /api/tickets`

Creates a ticket and optional ticket items. The ticket starts with `paymentStatus: "pending"`.

- **Auth**: Public
- **Body**:
  - `eventId` (required)
  - `fullName` (string, optional in code but expected by UI)
  - `phoneNumber` (string, optional in code but expected by UI)
  - `email` (string, optional)
  - `ticketType` (string, required): **either** a ticket type UUID **or** a ticket type name
  - `quantity` (number, optional; default 1)
  - `items` (array, optional): `{ dish: string, drink: string }[]`
- **Success (201)**: full ticket including `ticket_items`
- **Errors**:
  - `400`: missing `eventId`, missing `ticketType`, invalid ticketType for event’s user
  - `404`: event not found
  - `500`: insert/query failure

Example:

```bash
curl -sS -X POST "http://localhost:3000/api/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "fullName": "Jane Doe",
    "phoneNumber": "233000000000",
    "email": "jane@example.com",
    "ticketType": "TICKET_TYPE_ID_OR_NAME",
    "quantity": 2,
    "items": [
      { "dish": "Jollof rice with chicken", "drink": "Malt (can and bottle)" },
      { "dish": "Fried rice with fish", "drink": "Club" }
    ]
  }'
```

### `GET /api/tickets`

Lists tickets (includes `ticket_items`). Supports filtering/searching.

- **Auth**: Public (note: not scoped to a user)
- **Query params**:
  - `eventId` (optional)
  - `status` (optional: `paid|pending|failed|all`)
  - `search` (optional; matches `fullName`, `phoneNumber`, `email`, `paymentReference`)
- **Success (200)**: ticket list

Example:

```bash
curl -sS "http://localhost:3000/api/tickets?eventId=EVENT_ID&status=paid&search=jane"
```

### `GET /api/tickets/:id`

Gets a ticket by id and returns a normalized `items` field derived from `ticket_items`.

- **Auth**: Public
- **Success (200)**: ticket with `items`
- **Errors**:
  - `404`: ticket not found

### `POST /api/tickets/:id/update-payment`

Marks a ticket as paid. It can locate the ticket by the `:id` param or a `paymentReference` in the body.

- **Auth**: Public
- **Body**: `{ paymentReference?: string }`
- **Success (200)**: `{ success: true, ticketId, paymentStatus: "paid" }`
- **Errors**:
  - `404`: ticket not found
  - `500`: update failure

---

## Menu (dishes + drinks)

### `GET /api/menu?eventId=...`

Returns `{ dishes, drinks }` for the event owner (public booking), or for the authenticated user (admin view).

- **Auth**: Public when `eventId` provided
- **Auth**: Admin (session) when `eventId` omitted (otherwise returns empty arrays)
- **Query**: `eventId` (optional)
- **Success (200)**:
  - `{ dishes: [{ id, name, imageUrl }], drinks: [{ id, name, imageUrl }] }`
- **Errors**:
  - `404`: event not found (when using `eventId`)

### `GET /api/dishes`

Returns all dishes (not scoped to user).

- **Auth**: Public

### `GET /api/drinks`

Returns all drinks (not scoped to user).

- **Auth**: Public

---

## Paystack

### `POST /api/paystack/initialize`

Generates a new payment reference, recalculates ticket amount from current ticket type pricing, updates the ticket, and returns Paystack authorization URL.

- **Auth**: Public
- **Body**: `{ ticketId: string, email?: string }`
- **Success (200)**:
  - `{ authorizationUrl, accessCode, reference }`
- **Errors**:
  - `404`: ticket not found
  - `400`: ticket already paid; ticket type missing; ticket type not configured
  - `500`: update/init failure

Example:

```bash
curl -sS -X POST "http://localhost:3000/api/paystack/initialize" \
  -H "Content-Type: application/json" \
  -d '{ "ticketId": "TICKET_ID", "email": "jane@example.com" }'
```

### `GET /api/paystack/webhook?reference=...`

Redirect helper: Paystack sometimes redirects users here after payment; this handler redirects users to the success page.

- **Auth**: Public
- **Redirects to**: `/tickets/success/:reference`

### `POST /api/paystack/webhook`

Paystack webhook receiver. On `charge.success`, marks the ticket as paid (even if Paystack verification fails), and emails the ticket if `ticket.email` is present.

- **Auth**: Public (Paystack servers)
- **Body**: Paystack event payload (expects at least `{ event, data: { reference } }`)
- **Success (200)**: `{ received: true }`

Operational note: this handler does not validate Paystack webhook signatures; if you need strong verification, add signature validation before processing.

---

## Admin: ticket types

### `GET /api/admin/ticket-types`

Returns ticket types for the authenticated user.

- **Auth**: Admin

### `POST /api/admin/ticket-types`

Creates a ticket type for the authenticated user.

- **Auth**: Admin
- **Body**: `{ name, price, peoplePerTicket?, color? }`
- **Success (201)**: created ticket type
- **Errors**:
  - `400`: invalid name/price
  - `401`: unauthorized
  - `409`: already exists

### `PUT /api/admin/ticket-types/:id`

Updates a ticket type (must belong to user).

- **Auth**: Admin
- **Body**: `{ name, price, peoplePerTicket?, color? }`
- **Errors**: `404` if not found or not owned

### `DELETE /api/admin/ticket-types/:id`

Deletes a ticket type (must belong to user).

- **Auth**: Admin
- **Success (200)**: `{ success: true }`

---

## Admin: dishes

### `GET /api/admin/dishes`

Lists dishes belonging to the authenticated user.

- **Auth**: Admin

### `POST /api/admin/dishes`

Creates a dish for the authenticated user.

- **Auth**: Admin
- **Body**: `{ name, imageUrl? }`
- **Errors**: `409` if duplicate

### `PUT /api/admin/dishes/:id`

Updates a dish (must belong to user).

- **Auth**: Admin
- **Body**: `{ name, imageUrl? }`

### `DELETE /api/admin/dishes/:id`

Deletes a dish (must belong to user).

- **Auth**: Admin
- **Success (200)**: `{ success: true }`

---

## Admin: drinks

### `GET /api/admin/drinks`

Lists drinks belonging to the authenticated user.

- **Auth**: Admin

### `POST /api/admin/drinks`

Creates a drink for the authenticated user.

- **Auth**: Admin
- **Body**: `{ name, imageUrl? }`
- **Errors**: `409` if duplicate

### `PUT /api/admin/drinks/:id`

Updates a drink (must belong to user).

- **Auth**: Admin
- **Body**: `{ name, imageUrl? }`

### `DELETE /api/admin/drinks/:id`

Deletes a drink (must belong to user).

- **Auth**: Admin
- **Success (200)**: `{ success: true }`

---

## Admin: tickets & admission

### `GET /api/admin/tickets`

Lists tickets for events owned by the authenticated user and returns computed dashboard statistics.

- **Auth**: Admin
- **Query params**:
  - `eventId` (optional; must be owned by user)
  - `status` (optional: `paid|pending|failed|all`)
  - `search` (optional)
- **Success (200)**:
  - `{ tickets, statistics }`
  - `statistics` includes:
    - `totalTickets`, `paidTickets`, `pendingTickets`
    - `totalRevenue` (**net**, after Paystack fee multiplier)
    - `uniqueCustomers` (unique phone numbers)
    - `totalQuantitySold`, `averageTicketPrice`
    - day-over-day changes: `revenueChange`, `customersChange`, `ticketsChange`
    - admission: `admittedTickets`, `paidNotAdmitted`, `admissionRate`

### `POST /api/admin/tickets/:id/admit`

Marks a ticket as admitted (check-in) if it belongs to one of the user’s events and is paid.

- **Auth**: Admin
- **Rules**:
  - ticket must be owned by one of the user’s events
  - ticket must have `paymentStatus === "paid"`
  - cannot admit twice
- **Success (200)**: `{ success: true, ticket, message }`
- **Errors**:
  - `400`: already admitted; not paid
  - `404`: ticket not found (or no events)

---

## Admin: uploads

### `POST /api/admin/upload`

Uploads an image to Supabase Storage bucket `menu-images` and returns a public URL.

- **Auth**: Admin
- **Content-Type**: `multipart/form-data`
- **Form fields**:
  - `file` (File, required): jpeg/jpg/png/webp, max 5MB
  - `folder` (string, optional; default `"menu"`)
- **Success (200)**: `{ url, path }`
- **Errors**:
  - `400`: missing file / invalid type / too large
  - `401`: unauthorized
  - `404`: bucket not found (also returns `setupRequired: true`)
  - `403`: storage RLS/policy issues
  - `500`: upload failure

Example:

```bash
curl -sS -X POST "http://localhost:3000/api/admin/upload" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "folder=menu" \
  -F "file=@./example.png"
```

