/**
 * Service Error Classes
 * Standardized error handling for all service layer functions
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ServiceError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      undefined,
      404
    )
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 'CONFLICT', undefined, 409)
    this.name = 'ConflictError'
  }
}

export class BadRequestError extends ServiceError {
  constructor(message: string, errors?: any) {
    super(message, 'BAD_REQUEST', errors, 400)
    this.name = 'BadRequestError'
  }
}

export class UnprocessableEntityError extends ServiceError {
  constructor(message: string, errors?: any) {
    super(message, 'UNPROCESSABLE_ENTITY', errors, 422)
    this.name = 'UnprocessableEntityError'
  }
}

export class InternalServerError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, 'INTERNAL_ERROR', originalError, 500)
    this.name = 'InternalServerError'
  }
}

