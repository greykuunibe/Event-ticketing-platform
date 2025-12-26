# Documentation Index

## What’s in this folder

- **`api.md`**: All HTTP endpoints implemented under `app/api/**` (public + admin). Includes curl examples and auth requirements.
- **`lib.md`**: Public/shared library exports under `lib/**` (auth helpers, Supabase client, Paystack helpers, email helpers, QR + ticket download, search helpers, constants).
- **`components.md`**: Exported React components, contexts, hooks, and stores under `components/**`, `hooks/**`, and `stores/**`, with usage examples.

## Conventions used in these docs

- **Base URL**: examples assume `http://localhost:3000`.
- **JSON**: request/response examples use JSON unless otherwise specified.
- **Auth**:
  - “Admin” endpoints generally require a valid NextAuth session cookie.
  - “Public” endpoints are callable without authentication unless noted.

