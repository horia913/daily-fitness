/**
 * Validation Error Types
 */

import { z } from 'zod'
import { BadRequestError } from '../errors/serviceErrors'

export class ValidationError extends BadRequestError {
  constructor(
    message: string = 'Validation failed',
    public errors: z.ZodError['issues']
  ) {
    super(message)
    this.name = 'ValidationError'
  }

  /**
   * Get formatted error messages
   */
  getFormattedErrors(): Record<string, string> {
    const formatted: Record<string, string> = {}
    
    this.errors.forEach((error) => {
      const path = error.path.join('.')
      formatted[path] = error.message
    })
    
    return formatted
  }

  /**
   * Get first error message
   */
  getFirstError(): string {
    if (this.errors.length > 0) {
      return this.errors[0].message
    }
    return this.message
  }
}

