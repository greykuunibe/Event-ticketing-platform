import { NextRequest, NextResponse } from 'next/server'

// Server-side redirect for /tickets/success?reference=... to /tickets/success/[reference]
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  
  if (reference) {
    // Redirect to the path-based route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(`${baseUrl}/tickets/success/${encodeURIComponent(reference)}`)
  }
  
  // No reference - redirect to home
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  return NextResponse.redirect(`${baseUrl}/`)
}

