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

    // Verify the drink belongs to the user
    const { data: existingDrink, error: checkError } = await supabase
      .from('drinks')
      .select('id')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (checkError || !existingDrink) {
      return NextResponse.json({ error: 'Drink not found' }, { status: 404 })
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
      .update({ 
        name: name.trim(),
        imageUrl: imageUrl || null,
      })
      .eq('id', id)
      .eq('userId', user.id)
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

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating drink:', error)
    return NextResponse.json(
      { error: 'Failed to update drink' },
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

    // Verify the drink belongs to the user
    const { data: existingDrink, error: checkError } = await supabase
      .from('drinks')
      .select('id')
      .eq('id', id)
      .eq('userId', user.id)
      .single()

    if (checkError || !existingDrink) {
      return NextResponse.json({ error: 'Drink not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('drinks')
      .delete()
      .eq('id', id)
      .eq('userId', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting drink:', error)
    return NextResponse.json(
      { error: 'Failed to delete drink' },
      { status: 500 }
    )
  }
}

