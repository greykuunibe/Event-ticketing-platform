import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from './supabase'
import { verifyUserExists } from './auth-helpers'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user exists and is deleted before allowing sign-in
      if (user?.email) {
        try {
          const { data: existingUser, error } = await supabase
            .from('users')
            .select('id, deletedAt')
            .eq('email', user.email)
            .is('deletedAt', null) // Only check non-deleted users
            .single()

          // If user doesn't exist (PGRST116 error), allow OAuth to complete but don't create user yet
          // The callback page will redirect to signup
          if (error && error.code === 'PGRST116') {
            // User doesn't exist - allow OAuth but don't create user
            return true
          }

          // If user exists and is not deleted, update their info
          if (existingUser && !existingUser.deletedAt) {
            try {
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  name: user.name,
                  image: user.image,
                  emailVerified: new Date().toISOString(),
                })
                .eq('id', existingUser.id)

              if (updateError) {
                console.error('Error updating user:', updateError)
              }
            } catch (updateError) {
              console.error('Error updating user in signIn callback:', updateError)
            }
            return true
          }

          // If user exists but is deleted (soft delete), block sign-in
          if (existingUser && existingUser.deletedAt) {
            console.error('Sign-in blocked: User was deleted', user.email)
            return false
          }
        } catch (error) {
          // If error is "not found" (PGRST116), user doesn't exist yet - allow OAuth
          if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
            return true
          }
          // Other errors - log but allow sign-in to proceed
          console.error('Error checking user in signIn callback:', error)
        }

        // Check if user was hard-deleted (in deleted_users table)
        try {
          const { data: deletedUser } = await supabase
            .from('deleted_users')
            .select('id')
            .eq('email', user.email)
            .single()

          if (deletedUser) {
            console.error('Sign-in blocked: User was hard-deleted', user.email)
            return false
          }
        } catch (error) {
          // If error is "not found", user wasn't hard-deleted - continue
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - verify user exists in database before storing id in token
      if (user) {
        // Store Google ID temporarily (even if user doesn't exist in DB)
        // This will be used for signup
        if (user.id) {
          token.googleId = user.id
        }

        // Check if user exists in database by email
        if (user.email) {
          try {
            const { data: existingUser, error } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email)
              .is('deletedAt', null)
              .single()

            // Only set token.id if user exists in database
            if (existingUser && !error) {
              token.id = existingUser.id
            }
            // If user doesn't exist, token.id will remain undefined
            // This will cause callback page to redirect to signup
          } catch (error) {
            // User doesn't exist - don't set token.id
            console.log('User not found in database during JWT creation:', user.email)
          }
        }
      }

      // On token refresh, verify user still exists in database
      if (token.id && typeof token.id === 'string') {
        const userExists = await verifyUserExists(token.id)
        if (!userExists) {
          // User was deleted - remove id from token to invalidate session
          delete token.id
        }
      }

      return token
    },
    async session({ session, token }) {
      // Verify user exists before setting session
      if (session.user && token.id && typeof token.id === 'string') {
        const userExists = await verifyUserExists(token.id)
        if (userExists) {
          session.user.id = token.id as string
        } else {
          // User was deleted - don't set id, effectively invalidating the session
          delete (session.user as any).id
        }
      } else {
        // If no token.id, user was deleted - don't set id
        delete (session.user as any).id
      }
      // Store Google ID in session for signup flow
      if (token.googleId && typeof token.googleId === 'string') {
        (session as any).googleId = token.googleId
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}