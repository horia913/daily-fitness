'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.push('/')
      } else if (requiredRole || allowedRoles) {
        // Check user role (we'll implement this with user metadata later)
        // For now, we'll redirect based on the current path
        const currentPath = window.location.pathname
        
        // If allowedRoles is provided, check if any of them match
        // For now, treat 'admin' as having coach permissions
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
  }, [user, loading, router, requiredRole, allowedRoles])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return <>{children}</>
}
