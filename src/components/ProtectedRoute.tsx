'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type UserRole = 'coach' | 'client' | 'admin'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timeoutReached, setTimeoutReached] = useState(false)
  
  // Timeout fallback: if loading takes more than 8 seconds, fail open
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        setTimeoutReached(true);
        if (!user) {
          router.push('/');
        }
      }, 8000);
      return () => clearTimeout(timeoutId);
    } else {
      setTimeoutReached(false);
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && !timeoutReached) {
      if (!user) {
        router.push('/')
      } else if (requiredRole || allowedRoles) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
        const effectiveRoles = allowedRoles || (requiredRole ? [requiredRole] : [])
        if (effectiveRoles.length > 0) {
          const hasCoachAccess = effectiveRoles.includes('coach') || effectiveRoles.includes('admin')
          const hasClientAccess = effectiveRoles.includes('client')
          if (hasCoachAccess && currentPath.startsWith('/client')) {
            router.push('/coach')
          } else if (hasClientAccess && !hasCoachAccess && currentPath.startsWith('/coach')) {
            router.push('/client')
          }
        }
      }
    }
  }, [user, loading, timeoutReached, router, requiredRole, allowedRoles])

  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen fc-app-bg flex flex-col items-center justify-center gap-4">
        <div
          className="w-10 h-10 rounded-full animate-spin border-4 border-t-transparent"
          style={{ borderColor: "color-mix(in srgb, var(--fc-accent-cyan) 30%, transparent)" }}
          aria-hidden
        />
        <p className="fc-text-dim text-sm font-medium">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return <>{children}</>
}
