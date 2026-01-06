"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isCoachRole } from '@/lib/roleGuard';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: 'coach' | 'client';
  fallbackPath?: string;
}

/**
 * RoleGuard Component
 * Protects routes by checking user role from profiles table
 * Redirects unauthorized users to appropriate dashboard
 */
export function RoleGuard({ children, requiredRole, fallbackPath }: RoleGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/');
          return;
        }

        // Fetch user role from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Error fetching profile:', error);
          router.push('/');
          return;
        }

        const userRole = profile.role;

        // Check authorization based on required role
        if (requiredRole === 'coach') {
          const hasCoachRole = isCoachRole(userRole);
          if (!hasCoachRole) {
            router.push(fallbackPath || '/client');
            return;
          }
          setIsAuthorized(true);
        } else {
          // Client role check
          const isClient = !isCoachRole(userRole);
          if (!isClient) {
            router.push(fallbackPath || '/coach');
            return;
          }
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error in RoleGuard:', error);
        router.push('/');
      }
    };

    checkRole();
  }, [requiredRole, fallbackPath, router]);

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  return isAuthorized ? <>{children}</> : null;
}

