# Supabase Storage Setup for Menu Images

To enable image uploads for menu items, you need to set up a Supabase Storage bucket.

## ⚠️ IMPORTANT: You must complete these steps before image uploads will work!

### Step 1: Create Storage Bucket

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name:** `menu-images` (exactly this name, case-sensitive)
   - **Public bucket:** ✅ **Check this box** (IMPORTANT - makes images accessible via URL)
   - **File size limit:** Leave default or set to 5MB
   - **Allowed MIME types:** Leave empty or add: `image/jpeg,image/png,image/webp`
6. Click **"Create bucket"**

### Step 2: Set Bucket Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. In Storage, click on the `menu-images` bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

**Policy 1: Allow Authenticated Uploads**
- **Policy name:** `Allow authenticated uploads`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  (bucket_id = 'menu-images'::text) AND (auth.role() = 'authenticated'::text)
  ```
- Click **"Review"** then **"Save policy"**

**Policy 2: Allow Public Reads**
- **Policy name:** `Allow public reads`
- **Allowed operation:** `SELECT`
- **Target roles:** `anon, authenticated`
- **Policy definition:**
  ```sql
  bucket_id = 'menu-images'::text
  ```
- Click **"Review"** then **"Save policy"**

**Policy 3: Allow Authenticated Updates** (Optional but recommended)
- **Policy name:** `Allow authenticated updates`
- **Allowed operation:** `UPDATE`
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  bucket_id = 'menu-images'::text
  ```
- Click **"Review"** then **"Save policy"**

**Policy 4: Allow Authenticated Deletes** (Optional but recommended)
- **Policy name:** `Allow authenticated deletes`
- **Allowed operation:** `DELETE`
- **Target roles:** `authenticated`
- **Policy definition:**
  ```sql
  bucket_id = 'menu-images'::text
  ```
- Click **"Review"** then **"Save policy"**

**OR use SQL Editor:**
- Go to **SQL Editor** in Supabase
- Run the contents of `supabase/create-storage-bucket.sql` to create all policies at once

### Step 3: Run Database Migration

1. Go to **SQL Editor** in Supabase
2. Run the contents of `supabase/add-menu-images.sql` to add the `imageUrl` column to dishes and drinks tables

### Step 4: Verify Setup

1. Go to Admin → Menu Items in your app
2. Try uploading an image when creating/editing a dish or drink
3. The image should upload successfully and display in the table

## Troubleshooting

**Error: "Bucket not found"**
- Make sure you created the bucket with the exact name `menu-images` (case-sensitive)
- Verify the bucket exists in Storage → Buckets

**Error: "Permission denied" or "Row-level security policy violation"**
- Make sure you've created the policies as described above
- Verify policies are enabled (toggle should be ON)
- Check that the bucket is set to **Public**

**Error: "Failed to upload file"**
- Check file size (must be under 5MB)
- Check file type (must be JPEG, PNG, or WebP)
- Verify your Supabase credentials in `.env` file

