/**
 * Authentication Service
 * Centralized authentication and authorization checks
 */

import { supabase } from '../supabase'
import { AuthError, ForbiddenError } from '../errors/authErrors'

export interface AuthenticatedUser {
  id: string
  role?: string
  email?: string
}

export class AuthService {
  /**
   * Get current authenticated user
   * @throws {AuthError} if user is not authenticated
   */
  static async getCurrentUser(): Promise<AuthenticatedUser> {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      throw new AuthError('User not authenticated')
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      role: profile?.role,
      email: profile?.email || user.email
    }
  }

  /**
   * Verify user is a coach
   * @param userId Optional user ID to check (defaults to current user)
   * @throws {AuthError} if user is not authenticated
   * @throws {ForbiddenError} if user is not a coach
   */
  static async verifyCoach(userId?: string): Promise<{ id: string }> {
    const user = userId 
      ? { id: userId } 
      : await this.getCurrentUser()

    // Get user role from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      throw new AuthError('Failed to verify user role')
    }

    if (profile?.role !== 'coach') {
      throw new ForbiddenError('User must be a coach to perform this action')
    }

    return { id: user.id }
  }

  /**
   * Verify user is a client
   * @param userId Optional user ID to check (defaults to current user)
   * @throws {AuthError} if user is not authenticated
   * @throws {ForbiddenError} if user is not a client
   */
  static async verifyClient(userId?: string): Promise<{ id: string }> {
    const user = userId 
      ? { id: userId } 
      : await this.getCurrentUser()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      throw new AuthError('Failed to verify user role')
    }

    if (profile?.role !== 'client') {
      throw new ForbiddenError('User must be a client to perform this action')
    }

    return { id: user.id }
  }

  /**
   * Verify user owns a resource or is a coach
   * @param resourceOwnerId The ID of the resource owner
   * @param userId Optional user ID to check (defaults to current user)
   * @throws {AuthError} if user is not authenticated
   * @throws {ForbiddenError} if user doesn't have access
   */
  static async verifyOwnershipOrCoach(
    resourceOwnerId: string,
    userId?: string
  ): Promise<{ id: string; isOwner: boolean; isCoach: boolean }> {
    const user = userId 
      ? { id: userId } 
      : await this.getCurrentUser()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      throw new AuthError('Failed to verify user role')
    }

    const isOwner = user.id === resourceOwnerId
    const isCoach = profile?.role === 'coach'

    if (!isOwner && !isCoach) {
      throw new ForbiddenError('You do not have permission to access this resource')
    }

    return {
      id: user.id,
      isOwner,
      isCoach: isCoach || false
    }
  }

  /**
   * Check if current user is authenticated (non-throwing)
   * @returns User object if authenticated, null otherwise
   */
  static async checkAuthentication(): Promise<AuthenticatedUser | null> {
    try {
      return await this.getCurrentUser()
    } catch {
      return null
    }
  }
}

