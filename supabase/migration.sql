-- Migration script to add events table and update tickets table
-- Run this in Supabase SQL Editor if you already have tickets and ticket_items tables

-- Step 1: Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  "eventDate" TIMESTAMP WITH TIME ZONE,
  location TEXT,
  "qrCode" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add eventId and quantity columns to tickets table (if they don't exist)
DO $$ 
BEGIN
  -- Add eventId column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'eventId'
  ) THEN
    ALTER TABLE tickets ADD COLUMN "eventId" TEXT;
  END IF;

  -- Add quantity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE tickets ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Step 3: Create a default event for existing tickets (optional - only if you have existing tickets)
-- This creates a default event so existing tickets can still work
DO $$
DECLARE
  default_event_id TEXT;
BEGIN
  -- Check if we have tickets without eventId
  IF EXISTS (SELECT 1 FROM tickets WHERE "eventId" IS NULL LIMIT 1) THEN
    -- Create a default event
    INSERT INTO events (name, description, "qrCode")
    VALUES ('Default Event', 'Default event for existing tickets', gen_random_uuid()::text)
    ON CONFLICT DO NOTHING
    RETURNING id INTO default_event_id;
    
    -- Update existing tickets to use the default event
    UPDATE tickets 
    SET "eventId" = (SELECT id FROM events WHERE name = 'Default Event' LIMIT 1)
    WHERE "eventId" IS NULL;
  END IF;
END $$;

-- Step 4: Now make eventId required (after updating existing records)
ALTER TABLE tickets ALTER COLUMN "eventId" SET NOT NULL;

-- Step 5: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tickets_eventId_fkey'
  ) THEN
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_eventId_fkey 
    FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_events_qr_code ON events("qrCode");
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets("eventId");

-- Step 7: Create trigger for events table
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

