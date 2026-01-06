/**
 * Validation Utilities
 * Helper functions for validating data with Zod schemas
 */

import { z } from 'zod'
import { ValidationError } from './errorTypes'

/**
 * Validate data against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data
 * @throws {ValidationError} if validation fails
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.issues)
  }
  
  return result.data
}

/**
 * Validate data and return result object (non-throwing)
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Result object with success flag and data/error
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    return {
      success: false,
      error: new ValidationError('Validation failed', result.error.issues)
    }
  }
  
  return {
    success: true,
    data: result.data
  }
}

/**
 * Validate partial data (allows undefined/null fields)
 * @param schema Zod object schema to validate against
 * @param data Data to validate
 * @returns Validated data
 * @throws {ValidationError} if validation fails
 */
export function validatePartial<T extends z.ZodTypeAny>(
  schema: T extends z.ZodObject<infer U> ? z.ZodObject<U> : never,
  data: unknown
): Partial<T> {
  if (schema instanceof z.ZodObject) {
    const partialSchema = schema.partial()
    return validate(partialSchema, data) as Partial<T>
  }
  throw new ValidationError('Schema must be a ZodObject for partial validation', [])
}

