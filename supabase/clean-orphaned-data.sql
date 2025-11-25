-- Clean up orphaned data (items with NULL userId)
-- This ensures new users don't see data from other users or seed data

-- Delete dishes with NULL userId
DELETE FROM dishes WHERE "userId" IS NULL;

-- Delete drinks with NULL userId
DELETE FROM drinks WHERE "userId" IS NULL;

-- Delete ticket_types with NULL userId
DELETE FROM ticket_types WHERE "userId" IS NULL;

-- Delete events with NULL userId (optional - be careful with this)
-- Uncomment only if you're sure you want to delete all events without owners
-- DELETE FROM events WHERE "userId" IS NULL;

-- Note: Tickets are linked through events, so they don't need direct cleanup
-- If an event is deleted, tickets will be cascade deleted

