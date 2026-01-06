/**
 * Error Handler Utility
 * Centralized error handling for components and API routes
 */

import {
  ServiceError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnprocessableEntityError,
  InternalServerError
} from '../errors/serviceErrors'
import {
  AuthError,
  ForbiddenError,
  UnauthorizedError
} from '../errors/authErrors'

export interface ErrorResponse {
  message: string
  code: string
  statusCode: number
  details?: any
}

/**
 * Handle service errors and convert to user-friendly error responses
 * @param error The error to handle
 * @returns Formatted error response
 */
export function handleServiceError(error: unknown): ErrorResponse {
  // Auth errors
  if (error instanceof AuthError) {
    return {
      message: error.message || 'Authentication required',
      code: 'AUTH_ERROR',
      statusCode: 401
    }
  }

  if (error instanceof UnauthorizedError) {
    return {
      message: error.message || 'Unauthorized access',
      code: 'UNAUTHORIZED',
      statusCode: 401
    }
  }

  if (error instanceof ForbiddenError) {
    return {
      message: error.message || 'Access denied',
      code: 'FORBIDDEN',
      statusCode: 403
    }
  }

  // Validation errors
  if (error instanceof BadRequestError) {
    return {
      message: error.message || 'Invalid input data',
      code: 'BAD_REQUEST',
      statusCode: 400,
      details: error.originalError
    }
  }

  if (error instanceof UnprocessableEntityError) {
    return {
      message: error.message || 'Unable to process request',
      code: 'UNPROCESSABLE_ENTITY',
      statusCode: 422,
      details: error.originalError
    }
  }

  // Not found errors
  if (error instanceof NotFoundError) {
    return {
      message: error.message,
      code: 'NOT_FOUND',
      statusCode: 404
    }
  }

  // Conflict errors
  if (error instanceof ConflictError) {
    return {
      message: error.message,
      code: 'CONFLICT',
      statusCode: 409
    }
  }

  // Generic service errors
  if (error instanceof ServiceError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.originalError
    }
  }

  // Internal server errors
  if (error instanceof InternalServerError) {
    return {
      message: error.message || 'An internal server error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.originalError : undefined
    }
  }

  // Unknown errors - log for debugging
  console.error('Unhandled error:', error)
  
  // Check if it's a Supabase error
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any
    return {
      message: supabaseError.message || 'A database error occurred',
      code: supabaseError.code || 'DATABASE_ERROR',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }
  }

  // Fallback for completely unknown errors
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: process.env.NODE_ENV === 'development' ? error : undefined
  }
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof AuthError || 
         error instanceof UnauthorizedError || 
         error instanceof ForbiddenError
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  if (error instanceof ServiceError) {
    return error.statusCode >= 400 && error.statusCode < 500
  }
  return false
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof ServiceError) {
    return error.statusCode >= 500
  }
  return false
}

