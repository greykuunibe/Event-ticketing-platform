-- This SQL script helps verify and set up the menu-images storage bucket
-- Note: Storage buckets must be created through the Supabase Dashboard UI
-- This script is for reference only

-- To create the bucket:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: menu-images
-- 4. Make it Public
-- 5. Click "Create bucket"

-- After creating the bucket, run the policies below:

-- Policy 1: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images'::text);

-- Policy 2: Allow public reads
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'menu-images'::text);

-- Policy 3: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images'::text);

-- Policy 4: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images'::text);

