import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // persist session across reloads/tabs
    autoRefreshToken: true,     // refresh tokens in background
    detectSessionInUrl: true    // handle magic links
  }
})

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
