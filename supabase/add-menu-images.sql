-- Migration: Add imageUrl column to dishes and drinks tables
-- Run this in Supabase SQL Editor

-- Add imageUrl column to dishes table
ALTER TABLE dishes 
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Add imageUrl column to drinks table
ALTER TABLE drinks 
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Add index for imageUrl (optional, for faster queries)
CREATE INDEX IF NOT EXISTS idx_dishes_image_url ON dishes("imageUrl") WHERE "imageUrl" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drinks_image_url ON drinks("imageUrl") WHERE "imageUrl" IS NOT NULL;

