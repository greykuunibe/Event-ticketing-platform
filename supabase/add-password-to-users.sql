-- Add password field to users table for admin authentication
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

