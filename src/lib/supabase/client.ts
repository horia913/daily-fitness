import { createBrowserClient } from '@supabase/ssr'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
}

/**
 * Browser client for Supabase (Next.js App Router)
 * 
 * Uses default storage mechanism (cookies via document.cookie when available).
 * No explicit localStorage override - let @supabase/ssr handle storage automatically.
 * Middleware refreshes session cookies on navigation for SSR consistency.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: getTrackedFetch(),
  },
})
