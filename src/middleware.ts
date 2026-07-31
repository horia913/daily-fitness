import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// v1: role checks live in ProtectedRoute (client). v2 hardening could enforce profile.role
// here (e.g. custom JWT claims or a profiles lookup) to block /coach vs /client URL mixing at the edge.

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
          // Update response reference to include new cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  // Cron endpoints are header-authenticated (CRON_SECRET) and do not require
  // browser session refresh. Skipping avoids noisy refresh-token errors when
  // stale auth cookies are present.
  const isCronRoute = pathname.startsWith('/api/cron/')

  // Refresh session if expired - required for App Router auth paths.
  if (!isCronRoute) {
    try {
      await supabase.auth.getUser()
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[middleware] supabase.auth.getUser failed (request continues):', err)
      }
    }
  }

  // DEV-only logging to prove middleware execution
  if (process.env.NODE_ENV !== 'production') {
    const allCookies = request.cookies.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const supabaseCookieNames = cookieNames.filter(name => 
      name.includes('sb-') || name.includes('supabase') || name.includes('auth')
    )
    const hasSbCookies = supabaseCookieNames.length > 0
    
    console.log(`[middleware] ${pathname}`, {
      timestamp: new Date().toISOString(),
      isCronRoute,
      cookieNames: supabaseCookieNames.length > 0 ? supabaseCookieNames : 'none',
      hasSbCookies,
      totalCookies: cookieNames.length,
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
