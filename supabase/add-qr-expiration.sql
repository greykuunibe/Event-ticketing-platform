-- Migration to add QR code expiration to events table
-- This allows QR codes to expire after a certain date

-- Add qrCodeExpiresAt column to events table
DO $$
BEGIN
  -- Add qrCodeExpiresAt column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'qrCodeExpiresAt'
  ) THEN
    ALTER TABLE events ADD COLUMN "qrCodeExpiresAt" TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Set default expiration for existing events (30 days from creation or event date, whichever is earlier)
-- For events with eventDate, set expiration to eventDate
-- For events without eventDate, set expiration to 30 days from creation
UPDATE events
SET "qrCodeExpiresAt" = CASE
  WHEN "eventDate" IS NOT NULL AND "eventDate" < NOW() + INTERVAL '30 days' THEN "eventDate"
  WHEN "eventDate" IS NOT NULL THEN "eventDate"
  ELSE "createdAt" + INTERVAL '30 days'
END
WHERE "qrCodeExpiresAt" IS NULL;

