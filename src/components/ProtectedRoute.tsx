'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'coach' | 'client'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.push('/')
      } else if (requiredRole) {
        // Check user role (we'll implement this with user metadata later)
        // For now, we'll redirect based on the current path
        const currentPath = window.location.pathname
        if (requiredRole === 'coach' && currentPath.startsWith('/client')) {
          router.push('/coach')
        } else if (requiredRole === 'client' && currentPath.startsWith('/coach')) {
          router.push('/client')
        }
      }
    }
  }, [user, loading, router, requiredRole])

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
