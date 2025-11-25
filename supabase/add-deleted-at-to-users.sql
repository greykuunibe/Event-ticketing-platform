-- Add deletedAt field to users table to track deleted users
-- This prevents deleted users from signing up again

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users("deletedAt") WHERE "deletedAt" IS NOT NULL;

