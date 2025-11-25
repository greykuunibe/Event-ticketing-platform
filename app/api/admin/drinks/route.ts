import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('drinks')
      .select('*')
      .eq('userId', user.id)
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, imageUrl } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Drink name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('drinks')
      .insert({ 
        name: name.trim(),
        imageUrl: imageUrl || null,
        userId: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Drink already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating drink:', error)
    return NextResponse.json(
      { error: 'Failed to create drink' },
      { status: 500 }
    )
  }
}

