-- Migration script to add admission tracking fields to tickets table
-- Run this in Supabase SQL Editor

-- Add admitted field (boolean, defaults to false)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS "admitted" BOOLEAN NOT NULL DEFAULT false;

-- Add admittedAt timestamp (nullable, set when admitted)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS "admittedAt" TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance on admitted status
CREATE INDEX IF NOT EXISTS idx_tickets_admitted ON tickets("admitted");

-- Create index for admittedAt for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_tickets_admitted_at ON tickets("admittedAt");

