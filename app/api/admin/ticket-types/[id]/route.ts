import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the ticket type belongs to the user
    const { data: existingType, error: checkError } = await supabase
      .from('ticket_types')
      .select('id')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (checkError || !existingType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
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
      .update({
        name: name.trim(),
        price: parseFloat(price),
        peoplePerTicket: parseInt(peoplePerTicket) || 1,
        color: color || '#4c6afe',
      })
      .eq('id', id)
      .eq('userId', user.id)
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

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating ticket type:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket type' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the ticket type belongs to the user
    const { data: existingType, error: checkError } = await supabase
      .from('ticket_types')
      .select('id')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (checkError || !existingType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', id)
      .eq('userId', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting ticket type:', error)
    return NextResponse.json(
      { error: 'Failed to delete ticket type' },
      { status: 500 }
    )
  }
}