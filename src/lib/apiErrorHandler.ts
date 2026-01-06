/**
 * API Error Handler
 * Standardized error response format for all API routes
 */

import { NextResponse } from 'next/server'

export interface ApiError {
  error: string
  details?: string
  code?: string
}

export interface ApiSuccess<T = any> {
  success: true
  data?: T
  message?: string
}

export type ApiResponse<T = any> = ApiError | ApiSuccess<T>

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  details?: string,
  code?: string,
  status: number = 500
): NextResponse<ApiError> {
  const response: ApiError = {
    error,
    ...(details && { details }),
    ...(code && { code }),
  }

  return NextResponse.json(response, { status })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  const response: ApiSuccess<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  }

  return NextResponse.json(response, { status })
}

/**
 * Handle API errors with standardized format
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<ApiError> {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Check for common error types
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      return createErrorResponse('Unauthorized', error.message, 'UNAUTHORIZED', 401)
    }

    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return createErrorResponse('Resource not found', error.message, 'NOT_FOUND', 404)
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return createErrorResponse('Validation error', error.message, 'VALIDATION_ERROR', 400)
    }

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return createErrorResponse('Permission denied', error.message, 'FORBIDDEN', 403)
    }

    // Generic error
    return createErrorResponse(defaultMessage, error.message, 'INTERNAL_ERROR', 500)
  }

  // Unknown error type
  return createErrorResponse(
    defaultMessage,
    String(error),
    'UNKNOWN_ERROR',
    500
  )
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}

