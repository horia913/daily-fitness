/**
 * Authentication & Authorization Error Classes
 */

import { ServiceError } from './serviceErrors'

export class AuthError extends ServiceError {
  constructor(message: string = 'User not authenticated') {
    super(message, 'AUTH_ERROR', undefined, 401)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', undefined, 403)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', undefined, 401)
    this.name = 'UnauthorizedError'
  }
}

