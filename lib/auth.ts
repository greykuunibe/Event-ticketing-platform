import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabase } from './supabase'
import { verifyUserExists } from './auth-helpers'
import bcrypt from 'bcryptjs'
import { getOptionalServerEnv, getServerEnv } from './env'

const NEXTAUTH_SECRET = getServerEnv('NEXTAUTH_SECRET')
const GOOGLE_CLIENT_ID = getServerEnv('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = getServerEnv('GOOGLE_CLIENT_SECRET')
const DEFAULT_BASE_URL = getOptionalServerEnv('NEXTAUTH_URL', 'http://localhost:3000') ?? 'http://localhost:3000'

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Get user from database
          const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, password, deletedAt')
            .eq('email', credentials.email)
            .single()

          // Check for database connection errors
          if (error) {
            // Database connection or query errors
            if (error.code === 'PGRST116') {
              // User not found - this is an authentication error, not a connection error
              throw new Error('Invalid email or password')
            }
            
            // Network or connection errors
            if (error.message?.includes('fetch') || 
                error.message?.includes('network') || 
                error.message?.includes('connection') ||
                error.code?.includes('ECONNREFUSED') ||
                error.code?.includes('ETIMEDOUT')) {
              console.error('Database connection error:', error)
              throw new Error('DATABASE_CONNECTION_ERROR')
            }
            
            // Other database errors
            console.error('Database query error:', error)
            throw new Error('Invalid email or password')
          }

          if (!user) {
            throw new Error('Invalid email or password')
          }

          // Check if user is deleted
          if (user.deletedAt) {
            throw new Error('Account has been deleted')
          }

          // Check if password exists
          if (!user.password) {
            throw new Error('Password not set for this account. Please contact support.')
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            throw new Error('Invalid email or password')
          }

          // Return user object (without password)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch (error: any) {
          console.error('Credentials authorization error:', error)
          
          // If it's a database connection error, throw a specific error
          if (error.message === 'DATABASE_CONNECTION_ERROR') {
            throw new Error('DATABASE_CONNECTION_ERROR')
          }
          
          // For other errors, throw the original message or a generic auth error
          throw new Error(error.message || 'Invalid email or password')
        }
      },
    }),
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user exists and is deleted before allowing sign-in
      if (user?.email) {
        try {
          // Try query with deletedAt check first
          let query = supabase
            .from('users')
            .select('id, deletedAt')
            .eq('email', user.email)
          
          // Try to filter by deletedAt, but handle if column doesn't exist
          try {
            query = query.is('deletedAt', null)
          } catch (e) {
            // If deletedAt column doesn't exist, just query without it
            console.log('deletedAt column may not exist, querying without it')
          }
          
          const { data: existingUser, error } = await query.single()
    
          // If user doesn't exist (PGRST116 error), allow OAuth to complete but don't create user yet
          // The callback page will redirect to signup
          if (error && error.code === 'PGRST116') {
            // User doesn't exist - allow OAuth but don't create user
            return true
          }
    
          // If user exists and is not deleted, update their info
          if (existingUser && (!existingUser.deletedAt || existingUser.deletedAt === null)) {
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
          // Other errors - log but allow sign-in to proceed (will redirect to signup)
          console.error('Error checking user in signIn callback:', error)
          return true // Allow OAuth to complete, callback will handle redirect
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
        // For credentials provider, user.id is already set from authorize function
        if (account?.provider === 'credentials' && user.id) {
          token.id = user.id
          token.passwordVerified = true // Mark that password was verified
          return token
        }

        // For Google OAuth - store Google ID temporarily (even if user doesn't exist in DB)
        // This will be used for signup
        if (user.id && account?.provider === 'google') {
          token.googleId = user.id
        }

        // Check if user exists in database by email (for Google OAuth)
        if (user.email && account?.provider === 'google') {
          try {
            // First try with deletedAt check
            let { data: existingUser, error } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email)
              .is('deletedAt', null)
              .single()

            // If that fails due to missing column, try without deletedAt check
            if (error && error.code !== 'PGRST116') {
              const retryQuery = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single()
              
              if (!retryQuery.error && retryQuery.data) {
                existingUser = retryQuery.data
                error = null
              }
            }

            // Only set token.id if user exists in database
            if (existingUser && !error) {
              token.id = existingUser.id
            } else if (error) {
              // Check if error is "not found" (user doesn't exist)
              if (error.code === 'PGRST116') {
                // User doesn't exist - token.id will remain undefined
                // This will cause callback page to redirect to signup
                console.log('User not found in database, will redirect to signup:', user.email)
              } else {
                // Other database errors - log but don't set id
                console.error('Database error checking user:', error.message, error.code)
                // Don't set token.id so user gets redirected to signup
              }
            }
          } catch (error: any) {
            // Catch any unexpected errors
            console.error('Error checking user in JWT callback:', error)
            // Don't set token.id - user will be redirected to signup
            // This handles cases like missing deletedAt column gracefully
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
      // Store password verification status
      if (token.passwordVerified) {
        (session as any).passwordVerified = true
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Ensure baseUrl is valid
      if (!baseUrl) {
        baseUrl = DEFAULT_BASE_URL
      }

      // If the URL is the callback page, allow it (handle both relative and absolute)
      if (url.includes('/auth/callback')) {
        // If it's already a full URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url
        }
        // If it's relative, make it absolute
        return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`
      }
      
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        // For admin routes or if no specific URL, always go through callback page
        // Default to dashboard for admin authentication
        const destination = url === '/' || url === baseUrl ? '/admin/dashboard' : url
        const callbackUrl = encodeURIComponent(destination)
        return `${baseUrl}/auth/callback?callbackUrl=${callbackUrl}`
      }
      
      // Try to parse as absolute URL only if it's not a relative path
      try {
        // If url doesn't have a protocol, it might be a relative URL that slipped through
        if (!url.includes('://')) {
          // Treat as relative path
          const destination = url === '/' || url === baseUrl ? '/admin/dashboard' : url.startsWith('/') ? url : `/${url}`
          const callbackUrl = encodeURIComponent(destination)
          return `${baseUrl}/auth/callback?callbackUrl=${callbackUrl}`
        }
        
        const parsedUrl = new URL(url)
        // Allows callback URLs on the same origin
        if (parsedUrl.origin === baseUrl || parsedUrl.origin === new URL(baseUrl).origin) {
          const destination = url === baseUrl ? '/admin/dashboard' : parsedUrl.pathname + parsedUrl.search
          const callbackUrl = encodeURIComponent(destination)
          return `${baseUrl}/auth/callback?callbackUrl=${callbackUrl}`
        }
      } catch (e) {
        // If URL parsing fails (e.g., relative URL or invalid format), treat as relative path
        console.warn('Failed to parse URL in redirect callback:', url, e)
        const destination = url === '/' ? '/admin/dashboard' : url.startsWith('/') ? url : `/${url}`
        const callbackUrl = encodeURIComponent(destination)
        return `${baseUrl}/auth/callback?callbackUrl=${callbackUrl}`
      }
      
      // Default to dashboard
      return `${baseUrl}/auth/callback?callbackUrl=${encodeURIComponent('/admin/dashboard')}`
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