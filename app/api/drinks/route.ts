import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('drinks')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching drinks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drinks' },
      { status: 500 }
    )
  }
}