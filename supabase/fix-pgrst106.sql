-- Fix PGRST106 error: "The schema must be one of the following: public, graphql_public"
-- This ensures PostgREST can access the public schema

-- Check current schema exposure
SELECT 
  schemaname 
FROM 
  pg_catalog.pg_tables 
WHERE 
  schemaname = 'public' 
  AND tablename IN ('users', 'accounts', 'sessions', 'verification_tokens');

-- If the above returns rows, your tables are in the public schema
-- The issue might be with PostgREST configuration

-- For Supabase, the public schema should be exposed by default
-- But if you're still getting the error, try:

-- 1. Verify tables are in public schema
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');

-- 2. If tables exist, the issue is likely with the adapter URL format
-- Make sure NEXT_PUBLIC_SUPABASE_URL is exactly: https://xxxxx.supabase.co
-- (no trailing slash, no /rest/v1, just the base URL)

