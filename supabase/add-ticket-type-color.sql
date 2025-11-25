-- Migration: Add color column to ticket_types table
-- Run this in Supabase SQL Editor

-- Add color column to ticket_types table
ALTER TABLE ticket_types 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Add default colors for existing ticket types (optional)
UPDATE ticket_types 
SET color = '#f97316' 
WHERE name LIKE '%Regular Single%' AND color IS NULL;

UPDATE ticket_types 
SET color = '#22c55e' 
WHERE name LIKE '%Regular Couple%' AND color IS NULL;

UPDATE ticket_types 
SET color = '#a855f7' 
WHERE name LIKE '%VIP%' AND color IS NULL;

