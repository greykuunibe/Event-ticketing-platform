import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { supabase } from './supabase'

export async function verifyUserExists(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .is('deletedAt', null) // Only check non-deleted users
    .single()

  return !error && !!data
}

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || !session.user.id) {
    return null
  }

  // Verify user exists in database
  const userExists = await verifyUserExists(session.user.id)
  
  if (!userExists) {
    return null
  }

  return session.user
}