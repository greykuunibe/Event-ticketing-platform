-- Migration: Change default payment status from 'pending' to 'paid'
-- This ensures tickets are marked as paid by default, which is safer
-- since we're on the success page = payment succeeded

-- Update the default value for paymentStatus column
ALTER TABLE tickets 
ALTER COLUMN "paymentStatus" SET DEFAULT 'paid';

-- Optional: Update existing pending tickets to paid (if you want)
-- Uncomment the line below if you want to update existing pending tickets
-- UPDATE tickets SET "paymentStatus" = 'paid' WHERE "paymentStatus" = 'pending';

