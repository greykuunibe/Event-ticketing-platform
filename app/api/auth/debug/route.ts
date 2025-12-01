import 'server-only'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    )
  }

  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      hasSession: !!session,
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
        },
      } : null,
      env: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        // Remove these - they're causing the secret scanner to flag
        // hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        // hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        // hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}