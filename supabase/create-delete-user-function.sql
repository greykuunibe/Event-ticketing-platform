-- Create a function to properly delete users
-- This function will:
-- 1. Record the user in deleted_users table
-- 2. Delete the user (which will cascade delete all related data)

CREATE OR REPLACE FUNCTION delete_user(user_id TEXT, delete_reason TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- First, record the user in deleted_users table
  INSERT INTO deleted_users (id, email, "originalUserId", reason)
  SELECT 
    gen_random_uuid()::text,
    email,
    id,
    delete_reason
  FROM users
  WHERE id = user_id;
  
  -- Then delete the user (cascade will handle related data)
  DELETE FROM users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT delete_user('user-id-here', 'Account deletion requested by admin');

