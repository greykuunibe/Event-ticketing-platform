-- Migration script to add direct payment tracking field to tickets table
-- Run this in Supabase SQL Editor

-- Add isDirectPayment field (boolean, defaults to false - meaning Paystack payment)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS "isDirectPayment" BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on direct payment status
CREATE INDEX IF NOT EXISTS idx_tickets_is_direct_payment ON tickets("isDirectPayment");

