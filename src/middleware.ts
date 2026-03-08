import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // Refresh session if expired - required for App Router
  // This writes refreshed session cookies to the response
  await supabase.auth.getUser()

  // DEV-only logging to prove middleware execution
  if (process.env.NODE_ENV !== 'production') {
    const allCookies = request.cookies.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const supabaseCookieNames = cookieNames.filter(name => 
      name.includes('sb-') || name.includes('supabase') || name.includes('auth')
    )
    const hasSbCookies = supabaseCookieNames.length > 0
    
    console.log(`[middleware] ${request.nextUrl.pathname}`, {
      timestamp: new Date().toISOString(),
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
