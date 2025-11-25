-- Comprehensive migration to fix user relationships in database
-- This ensures all tables are properly linked to users with foreign key constraints

-- Step 1: Add foreign key constraints to link tables to users
-- First, ensure users table exists and has proper structure
DO $$
BEGIN
  -- Add userId column to events if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'userId'
  ) THEN
    ALTER TABLE events ADD COLUMN "userId" TEXT;
  END IF;

  -- Add userId column to dishes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dishes' AND column_name = 'userId'
  ) THEN
    ALTER TABLE dishes ADD COLUMN "userId" TEXT;
  END IF;

  -- Add userId column to drinks if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drinks' AND column_name = 'userId'
  ) THEN
    ALTER TABLE drinks ADD COLUMN "userId" TEXT;
  END IF;

  -- Add userId column to ticket_types if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_types' AND column_name = 'userId'
  ) THEN
    ALTER TABLE ticket_types ADD COLUMN "userId" TEXT;
  END IF;
END $$;

-- Step 2: Add foreign key constraints (with ON DELETE CASCADE)
-- This ensures data is deleted when a user is deleted

-- Events table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'events_user_id_fkey'
  ) THEN
    ALTER TABLE events 
    ADD CONSTRAINT events_user_id_fkey 
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Dishes table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dishes_user_id_fkey'
  ) THEN
    ALTER TABLE dishes 
    ADD CONSTRAINT dishes_user_id_fkey 
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drinks table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'drinks_user_id_fkey'
  ) THEN
    ALTER TABLE drinks 
    ADD CONSTRAINT drinks_user_id_fkey 
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ticket_types table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_types_user_id_fkey'
  ) THEN
    ALTER TABLE ticket_types 
    ADD CONSTRAINT ticket_types_user_id_fkey 
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Ensure tickets are linked to user's events
-- Tickets don't need direct userId since they're linked through events
-- But we should ensure events.userId is set for all tickets
-- This is already handled by the foreign key: tickets -> events -> users

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events("userId");
CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes("userId");
CREATE INDEX IF NOT EXISTS idx_drinks_user_id ON drinks("userId");
CREATE INDEX IF NOT EXISTS idx_ticket_types_user_id ON ticket_types("userId");

-- Step 5: Add composite unique constraints (name + userId) for user-specific items
-- This allows multiple users to have items with the same name
DROP INDEX IF EXISTS idx_dishes_name_user_id;
DROP INDEX IF EXISTS idx_drinks_name_user_id;
DROP INDEX IF EXISTS idx_ticket_types_name_user_id;

CREATE UNIQUE INDEX idx_dishes_name_user_id ON dishes(name, "userId") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX idx_drinks_name_user_id ON drinks(name, "userId") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX idx_ticket_types_name_user_id ON ticket_types(name, "userId") WHERE "userId" IS NOT NULL;

-- Step 6: Remove old global unique constraints if they exist
DO $$
BEGIN
  -- Drop unique constraint on dishes.name if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dishes_name_key' 
    AND conrelid = 'dishes'::regclass
  ) THEN
    ALTER TABLE dishes DROP CONSTRAINT dishes_name_key;
  END IF;

  -- Drop unique constraint on drinks.name if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'drinks_name_key' 
    AND conrelid = 'drinks'::regclass
  ) THEN
    ALTER TABLE drinks DROP CONSTRAINT drinks_name_key;
  END IF;

  -- Drop unique constraint on ticket_types.name if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_types_name_key' 
    AND conrelid = 'ticket_types'::regclass
  ) THEN
    ALTER TABLE ticket_types DROP CONSTRAINT ticket_types_name_key;
  END IF;
END $$;

-- Step 7: Add NOT NULL constraint for new records (optional - can be done via application)
-- For now, we'll keep it nullable to handle existing records
-- Application code should enforce userId is always set for new records

-- Step 8: Clean up orphaned records (records without userId)
-- This is optional - uncomment if you want to delete orphaned records
-- DELETE FROM events WHERE "userId" IS NULL;
-- DELETE FROM dishes WHERE "userId" IS NULL;
-- DELETE FROM drinks WHERE "userId" IS NULL;
-- DELETE FROM ticket_types WHERE "userId" IS NULL;

-- Note: 
-- - Tickets are linked to users through events (tickets.eventId -> events.id -> events.userId)
-- - All new records MUST have userId set (enforced in application code)
-- - Foreign keys ensure data integrity and cascade deletion
-- - Indexes ensure fast queries filtered by userId

