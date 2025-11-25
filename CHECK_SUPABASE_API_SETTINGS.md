# Check Supabase API Settings

Your tables are correctly in the `public` schema. The PGRST106 error suggests PostgREST can't access it.

## Step 1: Check Exposed Schemas

1. Go to **Supabase Dashboard**
2. Go to **Settings** → **API**
3. Scroll down to find **Project API settings**
4. Look for **"Exposed schemas"** or **"db_schemas"**
5. Make sure `public` is listed

If `public` is NOT listed, that's the problem. Unfortunately, this setting is usually controlled by Supabase and can't be changed via the dashboard. You may need to contact Supabase support.

## Step 2: Verify .env Format

Make sure your `.env` file has NO quotes and NO spaces:

✅ **Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://yhmzypljwvrgfduyqoqm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **Wrong:**
```env
NEXT_PUBLIC_SUPABASE_URL = "https://yhmzypljwvrgfduyqoqm.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://yhmzypljwvrgfduyqoqm.supabase.co"
```

## Step 3: Try Direct PostgREST URL

If the adapter is having issues, we can try using the full PostgREST URL. But first, let's verify the current setup works.

## Step 4: Test the Connection

Visit: `http://localhost:3000/api/test-supabase`

This should return success. If it does, the issue is specifically with how the adapter constructs PostgREST requests.

## Alternative Solution

If the exposed schemas can't be changed, we might need to:
1. Contact Supabase support to enable the public schema
2. Or use a different authentication approach temporarily

