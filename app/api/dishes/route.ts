import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching dishes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dishes' },
      { status: 500 }
    )
  }
}