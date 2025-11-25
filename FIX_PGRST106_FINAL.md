# Fix PGRST106 Error - Final Solution

The error `PGRST106: The schema must be one of the following: public, graphql_public` means PostgREST can't access the schema.

## Solution Steps

### 1. Verify Supabase API Settings

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Scroll down to **Project API settings**
3. Under **Exposed schemas**, make sure `public` is listed
4. If not, you may need to contact Supabase support (this is usually set by default)

### 2. Verify Your URL Format

Your `.env` should have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yhmzypljwvrgfduyqoqm.supabase.co
```

**Important:**
- No trailing slash
- No `/rest/v1` path
- Just the base URL exactly as shown in Supabase dashboard

### 3. Verify Tables Are in Public Schema

Run this in Supabase SQL Editor:

```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');
```

All 4 tables should be returned with `table_schema = 'public'`.

### 4. Try Restarting Your Dev Server

After any changes:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### 5. If Still Not Working

The issue might be with the adapter version or a Supabase project configuration. Try:

1. **Check Supabase Project Status:**
   - Make sure your project is active and not paused
   - Check if there are any warnings in the Supabase dashboard

2. **Try Creating a New Supabase Project:**
   - Sometimes projects can have configuration issues
   - Create a new project and migrate your tables

3. **Contact Supabase Support:**
   - If the public schema isn't exposed, this might be a project-level issue
   - Supabase support can help verify PostgREST configuration

## Alternative: Use JWT Strategy Instead

If the database adapter continues to fail, you could temporarily use JWT strategy:

```typescript
session: {
  strategy: 'jwt', // Instead of 'database'
}
```

But this won't persist sessions in the database, so it's not ideal for production.

