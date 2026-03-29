import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server contexts where cookies are read-only (e.g. some RSC paths)
        }
      },
    },
    global: {
      fetch: getTrackedFetch(),
    },
  })
}
