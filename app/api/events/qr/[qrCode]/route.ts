import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('qrCode', qrCode)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if QR code has expired
    if (event.qrCodeExpiresAt) {
      const expirationDate = new Date(event.qrCodeExpiresAt)
      const now = new Date()
      
      if (now > expirationDate) {
        return NextResponse.json(
          { 
            error: 'QR code expired',
            expired: true,
            expiresAt: event.qrCodeExpiresAt
          },
          { status: 410 } // 410 Gone - resource is no longer available
        )
      }
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event by QR:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

