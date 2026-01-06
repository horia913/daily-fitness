/**
 * Error Utilities
 * Standardized error message handling and toast notifications
 */

import { useToast } from '@/components/ui/toast-provider'

/**
 * Standard error messages
 */
export const ErrorMessages = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  SERVER_ERROR: 'Server error. Please try again later',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const

/**
 * Show error toast
 */
export function showErrorToast(
  addToast: (toast: any) => void,
  message: string,
  title: string = 'Error'
) {
  addToast({
    title,
    description: message,
    variant: 'destructive',
    duration: 5000,
  })
}

/**
 * Show success toast
 */
export function showSuccessToast(
  addToast: (toast: any) => void,
  message: string,
  title: string = 'Success'
) {
  addToast({
    title,
    description: message,
    variant: 'success',
    duration: 3000,
  })
}

/**
 * Show warning toast
 */
export function showWarningToast(
  addToast: (toast: any) => void,
  message: string,
  title: string = 'Warning'
) {
  addToast({
    title,
    description: message,
    variant: 'warning',
    duration: 4000,
  })
}

/**
 * Format API error message for display
 */
export function formatApiError(error: any): string {
  if (typeof error === 'string') return error
  
  if (error?.error) {
    if (error.details) {
      return `${error.error}: ${error.details}`
    }
    return error.error
  }
  
  if (error?.message) return error.message
  
  return ErrorMessages.UNKNOWN_ERROR
}

