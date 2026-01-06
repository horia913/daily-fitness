# Implementation Plan: Auth, Validation & Error Handling

## Current State

✅ **Zod is installed** (v4.1.8) - Ready for validation  
⚠️ **Services rely on RLS only** - No explicit auth checks  
⚠️ **Inconsistent error handling** - Some return `null`, others `false`, others throw  
⚠️ **Minimal validation** - Only basic checks (e.g., programDay 1-7)

---

## Phase 1: Quick Wins (Start Here - 2-3 hours)

### Step 1.1: Create Error Infrastructure (30 min)

Create `src/lib/errors/serviceErrors.ts`:

```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ServiceError";
    Error.captureStackTrace(this, this.constructor);
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

export class ValidationError extends ServiceError {
  constructor(message: string, public validationErrors: any[]) {
    super(message, "VALIDATION_ERROR", validationErrors, 400);
  }
}

export class AuthError extends ServiceError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", undefined, 401);
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string) {
    super(message, "FORBIDDEN", undefined, 403);
  }
}
```

### Step 1.2: Create Error Handler Utility (20 min)

Create `src/lib/utils/errorHandler.ts`:

```typescript
import {
  ServiceError,
  NotFoundError,
  ValidationError,
  AuthError,
  ForbiddenError,
} from "@/lib/errors/serviceErrors";

export function handleServiceError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
} {
  if (error instanceof AuthError) {
    return {
      message: "Authentication required",
      code: "AUTH_ERROR",
      statusCode: 401,
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      message: error.message || "Access denied",
      code: "FORBIDDEN",
      statusCode: 403,
    };
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message || "Invalid input data",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: error.validationErrors,
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
      details: error.originalError,
    };
  }

  // Unknown error - log for debugging
  console.error("Unhandled error:", error);
  return {
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}
```

### Step 1.3: Update One Service Function as Example (30 min)

Update `createProgram` in `workoutTemplateService.ts`:

```typescript
import { ServiceError, NotFoundError } from '@/lib/errors/serviceErrors'

static async createProgram(
  programData: Omit<Program, 'id' | 'created_at' | 'updated_at'>
): Promise<Program> {
  try {
    // Get current user (will throw if not authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthError('User must be authenticated to create programs')
    }

    // Basic validation
    if (!programData.name || programData.name.trim().length === 0) {
      throw new ValidationError('Program name is required', [])
    }

    if (programData.name.length > 200) {
      throw new ValidationError('Program name must be less than 200 characters', [])
    }

    // Create program
    const { data, error } = await supabase
      .from('workout_programs')
      .insert({
        ...programData,
        coach_id: user.id // Use authenticated user's ID
      })
      .select()
      .single()

    if (error) {
      // Handle specific Supabase errors
      if (error.code === '23505') { // Unique violation
        throw new ServiceError(
          `Program with name "${programData.name}" already exists`,
          'DUPLICATE_ERROR',
          error,
          409
        )
      }
      throw new ServiceError('Failed to create program', 'CREATE_ERROR', error)
    }

    if (!data) {
      throw new ServiceError('Program created but not returned', 'UNEXPECTED_ERROR')
    }

    return data
  } catch (error) {
    // Re-throw ServiceErrors, wrap others
    if (error instanceof ServiceError || error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new ServiceError('Unexpected error creating program', 'UNEXPECTED_ERROR', error)
  }
}
```

### Step 1.4: Update Component to Handle Errors (20 min)

Update `EnhancedProgramManager.tsx`:

```typescript
import { handleServiceError } from "@/lib/utils/errorHandler";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // or your toast library

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

## Phase 2: Add Validation (2-3 hours)

### Step 2.1: Create Validation Schemas (1 hour)

Create `src/lib/validation/programSchemas.ts`:

```typescript
import { z } from "zod";

export const CreateProgramSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Invalid difficulty level" }),
  }),
  duration_weeks: z
    .number()
    .int("Must be an integer")
    .min(1, "Must be at least 1 week")
    .max(52, "Must be less than 52 weeks"),
  target_audience: z
    .string()
    .max(100, "Target audience must be less than 100 characters")
    .optional(),
  is_active: z.boolean().optional().default(true),
});

export const ProgramScheduleSchema = z.object({
  program_id: z.string().uuid("Invalid program ID"),
  program_day: z
    .number()
    .int("Must be an integer")
    .min(1, "Day must be between 1-7")
    .max(7, "Day must be between 1-7"),
  week_number: z
    .number()
    .int("Must be an integer")
    .min(1, "Week must be at least 1")
    .max(52, "Week must be less than 52"),
  template_id: z.string().uuid("Invalid template ID"),
});

export const CreateProgramAssignmentSchema = z.object({
  program_id: z.string().uuid("Invalid program ID"),
  client_id: z.string().uuid("Invalid client ID"),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  total_days: z
    .number()
    .int("Must be an integer")
    .min(1, "Must be at least 1 day"),
});
```

### Step 2.2: Create Validation Helper (15 min)

Add to `src/lib/validation/programSchemas.ts`:

```typescript
import { ValidationError } from "@/lib/errors/serviceErrors";

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(
      "Validation failed",
      result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }))
    );
  }

  return result.data;
}
```

### Step 2.3: Update Service Functions (1 hour)

Update `createProgram`:

```typescript
import { validate } from '@/lib/validation/programSchemas'
import { CreateProgramSchema } from '@/lib/validation/programSchemas'

static async createProgram(programData: unknown): Promise<Program> {
  try {
    // Validate input
    const validated = validate(CreateProgramSchema, programData)

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('User must be authenticated')
    }

    // Create program with validated data
    const { data, error } = await supabase
      .from('workout_programs')
      .insert({
        ...validated,
        coach_id: user.id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ServiceError(
          `Program "${validated.name}" already exists`,
          'DUPLICATE_ERROR',
          error,
          409
        )
      }
      throw new ServiceError('Failed to create program', 'CREATE_ERROR', error)
    }

    if (!data) {
      throw new ServiceError('Program created but not returned', 'UNEXPECTED_ERROR')
    }

    return data
  } catch (error) {
    if (error instanceof ServiceError || error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new ServiceError('Unexpected error creating program', 'UNEXPECTED_ERROR', error)
  }
}
```

---

## Phase 3: Add Auth Service (1-2 hours)

### Step 3.1: Create Auth Service (30 min)

Create `src/lib/auth/authService.ts`:

```typescript
import { supabase } from "../supabase";
import { AuthError, ForbiddenError } from "../errors/serviceErrors";

export class AuthService {
  /**
   * Get current authenticated user
   * @throws {AuthError} if user is not authenticated
   */
  static async getCurrentUser(): Promise<{ id: string }> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new AuthError("User not authenticated");
    }

    return { id: user.id };
  }

  /**
   * Verify user is a coach (check profile role or coach_id in clients table)
   * @throws {AuthError} if not authenticated
   * @throws {ForbiddenError} if not a coach
   */
  static async verifyCoach(): Promise<{ id: string }> {
    const user = await this.getCurrentUser();

    // Check if user has coach role in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, coach_id")
      .eq("id", user.id)
      .single();

    // If profile has coach_id, user is a coach
    // Or if role is 'coach'
    const isCoach = profile?.coach_id || profile?.role === "coach";

    if (!isCoach) {
      // Check if user is in clients table as a coach
      const { data: clientRecord } = await supabase
        .from("clients")
        .select("coach_id")
        .eq("coach_id", user.id)
        .limit(1);

      if (!clientRecord || clientRecord.length === 0) {
        throw new ForbiddenError("User is not authorized as a coach");
      }
    }

    return user;
  }

  /**
   * Verify user owns resource or is coach
   */
  static async verifyOwnershipOrCoach(
    resourceCoachId: string
  ): Promise<{ id: string }> {
    const user = await this.getCurrentUser();

    // If user is the coach who owns the resource, allow
    if (resourceCoachId === user.id) {
      return user;
    }

    // Otherwise, verify user is a coach
    return await this.verifyCoach();
  }
}
```

### Step 3.2: Update Service Functions (1 hour)

Update `createProgram`:

```typescript
import { AuthService } from '@/lib/auth/authService'

static async createProgram(programData: unknown): Promise<Program> {
  try {
    // Validate input
    const validated = validate(CreateProgramSchema, programData)

    // Verify user is a coach
    const coach = await AuthService.verifyCoach()

    // Create program
    const { data, error } = await supabase
      .from('workout_programs')
      .insert({
        ...validated,
        coach_id: coach.id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ServiceError(
          `Program "${validated.name}" already exists`,
          'DUPLICATE_ERROR',
          error,
          409
        )
      }
      throw new ServiceError('Failed to create program', 'CREATE_ERROR', error)
    }

    if (!data) {
      throw new ServiceError('Program created but not returned', 'UNEXPECTED_ERROR')
    }

    return data
  } catch (error) {
    if (error instanceof ServiceError || error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new ServiceError('Unexpected error creating program', 'UNEXPECTED_ERROR', error)
  }
}
```

---

## Migration Order

### Week 1: Foundation

1. ✅ Create error infrastructure
2. ✅ Create error handler utility
3. ✅ Update 2-3 critical service functions (createProgram, updateProgram, deleteProgram)
4. ✅ Update components to handle errors

### Week 2: Validation

1. ✅ Create validation schemas
2. ✅ Add validation to all create/update functions
3. ✅ Update components to show validation errors

### Week 3: Auth

1. ✅ Create AuthService
2. ✅ Add auth checks to all service functions
3. ✅ Test with different user roles

---

## Testing Checklist

After each phase, test:

- [ ] Invalid input (empty, too long, wrong type)
- [ ] Unauthenticated user (should get 401)
- [ ] Unauthorized user (non-coach trying to create program)
- [ ] Valid input (should work)
- [ ] Duplicate data (should get 409)
- [ ] Not found (should get 404)
- [ ] Database errors (should get 500 with message)

---

## Quick Start (Minimal - 1 hour)

If you want to start immediately with minimal changes:

1. **Create error classes** (15 min) - Copy from Step 1.1
2. **Create error handler** (10 min) - Copy from Step 1.2
3. **Update createProgram** (20 min) - Copy from Step 1.3
4. **Update component** (15 min) - Copy from Step 1.4

This gives you immediate benefits with minimal risk.
