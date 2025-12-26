# Event Ticketing Platform — Documentation

This repository is a Next.js (App Router) ticketing platform backed by Supabase and Paystack.

## Quick start

```bash
npm install
npm run dev
```

## Environment variables

Create a `.env.local` (not committed) with at least:

- **Supabase**
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side; keep secret)
- **NextAuth**
  - `NEXTAUTH_SECRET`: session/JWT signing secret
  - `NEXTAUTH_URL`: canonical app URL (e.g. `http://localhost:3000`)
  - `GOOGLE_CLIENT_ID`: Google OAuth client id
  - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- **Payments (Paystack)**
  - `PAYSTACK_SECRET_KEY`: Paystack secret key
  - `NEXT_PUBLIC_BASE_URL`: used to build Paystack callback URLs (falls back to Netlify URL in code)
- **Email (Resend)**
  - `RESEND_API_KEY`: Resend API key (used to email tickets/admission confirmations)

## Where to find the full docs

- `docs/index.md`: doc map
- `docs/api.md`: all HTTP API endpoints under `app/api/**`
- `docs/lib.md`: exported functions/constants in `lib/**`
- `docs/components.md`: exported React components/hooks/contexts/stores

