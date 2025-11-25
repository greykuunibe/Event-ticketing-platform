-- Create a table to track deleted users (for hard deletes)
-- This prevents deleted users from recreating accounts even after hard deletion

CREATE TABLE IF NOT EXISTS deleted_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "originalUserId" TEXT,
  reason TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users(email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at ON deleted_users("deletedAt");

