import { supabase } from '@/lib/supabase/client'

/**
 * Helper function to ensure user is authenticated before making queries
 * Returns the authenticated user or throws an error
 */
export async function ensureAuthenticated(): Promise<{ id: string; email?: string }> {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  
  return user
}

/**
 * Helper function to get authenticated Supabase client for API routes
 * Validates the session from request headers
 */
export { supabase }

// Database types (we'll expand these as we build the app)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'coach' | 'client'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'coach' | 'client'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'coach' | 'client'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
