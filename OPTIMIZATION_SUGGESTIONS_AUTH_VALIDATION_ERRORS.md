# Optimization Suggestions: Authentication, Validation, and Error Handling

## Current State Analysis

### Authentication/Authorization

- **Current**: Services rely on RLS (Row Level Security) policies in Supabase
- **Issue**: No explicit authentication checks in service layer
- **Risk**: If RLS policies are misconfigured, services may fail silently or expose data

### Input Validation

- **Current**: Minimal validation in service functions
- **Issue**: Invalid data may reach database, causing errors
- **Risk**: Poor error messages, potential data corruption

### Error Handling

- **Current**: Inconsistent error handling patterns
- **Issue**: Some functions return `null`, others throw, others return `false`
- **Risk**: Difficult to debug, inconsistent user experience

---

## Recommended Optimizations

### 1. Authentication/Authorization Layer

#### Option A: Service-Level Auth Checks (Recommended)

Create a centralized authentication utility:

```typescript
// src/lib/auth/authService.ts
import { supabase } from "../supabase";

export class AuthService {
  /**
   * Get current authenticated user
   * @throws {AuthError} if user is not authenticated
   */
  static async getCurrentUser(): Promise<{ id: string; role?: string }> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new AuthError("User not authenticated", "UNAUTHENTICATED");
    }

    return { id: user.id, role: user.role };
  }

  /**
   * Verify user is a coach
   * @throws {AuthError} if user is not a coach
   */
  static async verifyCoach(userId?: string): Promise<{ id: string }> {
    const user = userId ? { id: userId } : await this.getCurrentUser();

    // Check if user has coach role (implement based on your role system)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "coach") {
      throw new AuthError("User is not a coach", "FORBIDDEN");
    }

    return user;
  }

  /**
   * Verify user owns resource or is coach
   */
  static async verifyOwnershipOrCoach(
    resourceCoachId: string,
    userId?: string
  ): Promise<{ id: string }> {
    const user = userId ? { id: userId } : await this.getCurrentUser();

    // If user is the coach who owns the resource, allow
    if (resourceCoachId === user.id) {
      return user;
    }

    // Otherwise, verify user is a coach
    return await this.verifyCoach(user.id);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "UNAUTHORIZED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}
```

**Usage in services**:

```typescript
static async createProgram(programData: CreateProgramInput): Promise<Program> {
  // Verify user is authenticated and is a coach
  const coach = await AuthService.verifyCoach()

  // Now safe to create program with coach_id
  const { data, error } = await supabase
    .from('workout_programs')
    .insert({
      ...programData,
      coach_id: coach.id
    })
    .select()
    .single()

  if (error) throw new ServiceError('Failed to create program', error)
  return data
}
```

#### Option B: Middleware Pattern (Alternative)

Create service middleware:

```typescript
// src/lib/middleware/authMiddleware.ts
export function requireAuth<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const user = await AuthService.getCurrentUser();
    return fn(...args, user);
  }) as T;
}

export function requireCoach<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const coach = await AuthService.verifyCoach();
    return fn(...args, coach);
  }) as T;
}
```

---

### 2. Input Validation Layer

#### Create Validation Utilities

```typescript
// src/lib/validation/programValidation.ts
import { z } from "zod"; // or use your preferred validation library

export const CreateProgramSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  target_audience: z.string().max(100).optional(),
});

export const ProgramScheduleSchema = z.object({
  program_id: z.string().uuid(),
  program_day: z.number().int().min(1).max(7),
  week_number: z.number().int().min(1).max(52),
  template_id: z.string().uuid(),
});

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError["errors"]) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.errors);
  }

  return result.data;
}
```

**Usage in services**:

```typescript
static async createProgram(programData: unknown): Promise<Program> {
  // Validate input
  const validated = validate(CreateProgramSchema, programData)

  // Verify auth
  const coach = await AuthService.verifyCoach()

  // Proceed with validated data
  const { data, error } = await supabase
    .from('workout_programs')
    .insert({
      ...validated,
      coach_id: coach.id
    })
    .select()
    .single()

  if (error) throw new ServiceError('Failed to create program', error)
  return data
}
```

---

### 3. Consistent Error Handling

#### Create Standardized Error Classes

```typescript
// src/lib/errors/serviceErrors.ts

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      undefined,
      404
    );
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, "CONFLICT", undefined, 409);
  }
}

export class BadRequestError extends ServiceError {
  constructor(message: string, errors?: any) {
    super(message, "BAD_REQUEST", errors, 400);
  }
}
```

#### Standardize Service Function Return Types

```typescript
// src/lib/types/serviceTypes.ts

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

// Or use Result pattern from libraries like neverthrow
```

**Usage in services**:

```typescript
static async getProgram(programId: string): Promise<Program> {
  // Always throw errors - let caller handle
  const coach = await AuthService.verifyCoach()

  const { data, error } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('id', programId)
    .eq('coach_id', coach.id) // Extra safety check
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Program', programId)
    }
    throw new ServiceError('Failed to fetch program', 'FETCH_ERROR', error)
  }

  if (!data) {
    throw new NotFoundError('Program', programId)
  }

  return data
}
```

#### Error Handling in Components

```typescript
// src/lib/utils/errorHandler.ts
import {
  AuthError,
  ValidationError,
  ServiceError,
  NotFoundError,
} from "@/lib/errors";

export function handleServiceError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof AuthError) {
    return {
      message: "Authentication required",
      code: error.code,
      statusCode: 401,
    };
  }

  if (error instanceof ValidationError) {
    return {
      message: "Invalid input data",
      code: "VALIDATION_ERROR",
      statusCode: 400,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      message: error.message,
      code: "NOT_FOUND",
      statusCode: 404,
    };
  }

  if (error instanceof ServiceError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Unknown error
  console.error("Unhandled error:", error);
  return {
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}
```

**Usage in components**:

```typescript
const handleCreateProgram = async () => {
  try {
    const program = await WorkoutTemplateService.createProgram(formData);
    toast.success("Program created successfully");
    onSuccess(program);
  } catch (error) {
    const { message, statusCode } = handleServiceError(error);

    if (statusCode === 401) {
      router.push("/login");
    } else {
      toast.error(message);
    }
  }
};
```

---

## Implementation Priority

### Phase 1: Critical (Do First)

1. ✅ **Standardize Error Handling**
   - Create error classes
   - Update all service functions to throw errors consistently
   - Update components to handle errors properly

### Phase 2: High Priority

2. ✅ **Add Input Validation**
   - Create validation schemas for all inputs
   - Add validation to service functions
   - Provide clear error messages

### Phase 3: Medium Priority

3. ✅ **Add Service-Level Auth Checks**
   - Create AuthService utility
   - Add auth checks to critical operations
   - Keep RLS as defense-in-depth

---

## Migration Strategy

### Step 1: Create Error Infrastructure

1. Create error classes (`src/lib/errors/serviceErrors.ts`)
2. Create error handler utility (`src/lib/utils/errorHandler.ts`)
3. Update one service function as example

### Step 2: Migrate Services Gradually

1. Start with most critical functions (create, update, delete)
2. Update error handling first
3. Add validation next
4. Add auth checks last

### Step 3: Update Components

1. Add error handling to all service calls
2. Add user-friendly error messages
3. Add loading states

### Step 4: Testing

1. Test with invalid inputs
2. Test with unauthenticated users
3. Test with unauthorized users
4. Test error scenarios

---

## Benefits

1. **Better Security**: Explicit auth checks + RLS defense-in-depth
2. **Better UX**: Clear error messages, consistent behavior
3. **Easier Debugging**: Standardized error types, better logging
4. **Type Safety**: Validation ensures correct types
5. **Maintainability**: Consistent patterns across codebase

---

## Example: Complete Service Function

```typescript
static async createProgram(programData: unknown): Promise<Program> {
  // 1. Validate input
  const validated = validate(CreateProgramSchema, programData)

  // 2. Verify authentication
  const coach = await AuthService.verifyCoach()

  // 3. Business logic checks
  const existing = await supabase
    .from('workout_programs')
    .select('id')
    .eq('name', validated.name)
    .eq('coach_id', coach.id)
    .maybeSingle()

  if (existing.data) {
    throw new ConflictError(`Program "${validated.name}" already exists`)
  }

  // 4. Create resource
  const { data, error } = await supabase
    .from('workout_programs')
    .insert({
      ...validated,
      coach_id: coach.id
    })
    .select()
    .single()

  // 5. Handle errors
  if (error) {
    throw new ServiceError('Failed to create program', 'CREATE_ERROR', error)
  }

  if (!data) {
    throw new ServiceError('Program created but not returned', 'UNEXPECTED_ERROR')
  }

  // 6. Return result
  return data
}
```

---

## Quick Start: Minimal Implementation

If you want to start small, implement these three things first:

1. **Error Classes** (30 min)

   - Create `ServiceError`, `NotFoundError`, `ValidationError`
   - Update 2-3 critical service functions

2. **Input Validation** (1 hour)

   - Add Zod schemas for program creation/update
   - Validate in service functions

3. **Error Handler Utility** (30 min)
   - Create `handleServiceError` function
   - Update components to use it

This gives you 80% of the benefits with 20% of the effort.
