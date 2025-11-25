import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'menu'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const fileBuffer = await file.arrayBuffer()

    // Check if bucket exists first
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json(
        { 
          error: 'Storage configuration error', 
          message: 'Unable to access storage. Please check your Supabase configuration.',
          details: listError.message 
        },
        { status: 500 }
      )
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'menu-images')
    
    if (!bucketExists) {
      return NextResponse.json(
        { 
          error: 'Storage bucket not found', 
          message: 'The "menu-images" bucket does not exist. Please create it in your Supabase dashboard under Storage.',
          setupRequired: true
        },
        { status: 404 }
      )
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      
      // Provide more specific error messages
      if (uploadError.message?.includes('new row violates row-level security')) {
        return NextResponse.json(
          { 
            error: 'Permission denied', 
            message: 'Storage bucket policies are not configured correctly. Please check the setup guide.',
            details: uploadError.message 
          },
          { status: 403 }
        )
      }
      
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { 
            error: 'Bucket not found', 
            message: 'The "menu-images" bucket does not exist. Please create it in Supabase Storage.',
            details: uploadError.message 
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Upload failed', 
          message: uploadError.message || 'Failed to upload file to storage',
          details: uploadError.message 
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      path: fileName,
    })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload file', 
        message: error?.message || 'An unexpected error occurred',
        details: error?.stack 
      },
      { status: 500 }
    )
  }
}

