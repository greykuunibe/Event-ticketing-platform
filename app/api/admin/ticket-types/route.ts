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
      .from('ticket_types')
      .select('*')
      .eq('userId', user.id)
      .order('price', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching ticket types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket types' },
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
    const { name, price, peoplePerTicket, color } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Ticket type name is required' },
        { status: 400 }
      )
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .insert({
        name: name.trim(),
        price: parseFloat(price),
        peoplePerTicket: parseInt(peoplePerTicket) || 1,
        color: color || '#4c6afe',
        userId: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ticket type already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating ticket type:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket type' },
      { status: 500 }
    )
  }
}