-- Migration: Add user isolation to events, dishes, drinks, and ticket_types
-- This ensures each admin only sees and manages their own data

-- Add userId column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add userId column to dishes table
ALTER TABLE dishes 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add userId column to drinks table
ALTER TABLE drinks 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add userId column to ticket_types table
ALTER TABLE ticket_types 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Remove old UNIQUE constraints on name (since multiple users can have same names)
-- Drop unique constraint on dishes.name if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dishes_name_key' 
    AND conrelid = 'dishes'::regclass
  ) THEN
    ALTER TABLE dishes DROP CONSTRAINT dishes_name_key;
  END IF;
END $$;

-- Drop unique constraint on drinks.name if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'drinks_name_key' 
    AND conrelid = 'drinks'::regclass
  ) THEN
    ALTER TABLE drinks DROP CONSTRAINT drinks_name_key;
  END IF;
END $$;

-- Drop unique constraint on ticket_types.name if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_types_name_key' 
    AND conrelid = 'ticket_types'::regclass
  ) THEN
    ALTER TABLE ticket_types DROP CONSTRAINT ticket_types_name_key;
  END IF;
END $$;

-- Add composite unique constraints (name + userId) so each user can have their own items
CREATE UNIQUE INDEX IF NOT EXISTS idx_dishes_name_user_id ON dishes(name, "userId") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_drinks_name_user_id ON drinks(name, "userId") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_types_name_user_id ON ticket_types(name, "userId") WHERE "userId" IS NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events("userId");
CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes("userId");
CREATE INDEX IF NOT EXISTS idx_drinks_user_id ON drinks("userId");
CREATE INDEX IF NOT EXISTS idx_ticket_types_user_id ON ticket_types("userId");

-- Note: Existing records will have NULL userId
-- You may want to manually assign userId to existing records or delete them
-- For new records, userId will be set from the authenticated user's session

