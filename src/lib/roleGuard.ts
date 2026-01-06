/**
 * Role Guard Utility
 * Provides role-based access control helpers for client and server components
 */

import { supabase } from './supabase';

export type UserRole = 'client' | 'coach' | 'admin' | 'super_coach' | 'supercoach';

export const COACH_ROLES: Set<UserRole> = new Set(['coach', 'admin', 'super_coach', 'supercoach']);

/**
 * Check if a role is a coach role
 */
export function isCoachRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return COACH_ROLES.has(role as UserRole);
}

/**
 * Get user role from profiles table
 * @param userId - User ID to check
 * @returns User role or null if not found
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

/**
 * Require a specific role (for use in page components)
 * Redirects to appropriate dashboard if role doesn't match
 * @param requiredRole - The role required to access the page
 * @returns Object with isAuthorized flag and redirect path if unauthorized
 */
export async function requireRole(
  requiredRole: 'coach' | 'client'
): Promise<{ isAuthorized: boolean; redirectTo?: string; userRole?: UserRole }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { isAuthorized: false, redirectTo: '/' };
    }

    const userRole = await getUserRole(session.user.id);

    if (!userRole) {
      return { isAuthorized: false, redirectTo: '/' };
    }

    // Check if user has required role
    if (requiredRole === 'coach') {
      const hasCoachRole = isCoachRole(userRole);
      return {
        isAuthorized: hasCoachRole,
        redirectTo: hasCoachRole ? undefined : '/client',
        userRole
      };
    } else {
      // Client role check
      const isClient = !isCoachRole(userRole);
      return {
        isAuthorized: isClient,
        redirectTo: isClient ? undefined : '/coach',
        userRole
      };
    }
  } catch (error) {
    console.error('Error in requireRole:', error);
    return { isAuthorized: false, redirectTo: '/' };
  }
}

/**
 * Server-side role check for API routes
 * @param userId - User ID to check
 * @param requiredRole - Required role ('coach' or 'client')
 * @returns true if user has required role
 */
export async function checkRoleForAPI(
  userId: string,
  requiredRole: 'coach' | 'client'
): Promise<boolean> {
  const userRole = await getUserRole(userId);

  if (!userRole) return false;

  if (requiredRole === 'coach') {
    return isCoachRole(userRole);
  } else {
    return !isCoachRole(userRole);
  }
}

