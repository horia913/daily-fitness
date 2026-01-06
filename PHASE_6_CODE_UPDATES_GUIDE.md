# Phase 6: Code Updates Guide

## Overview

This guide provides step-by-step instructions for updating TypeScript types, components, and services to use the new relational structure and error handling.

## Step 1: Update TypeScript Types

### 1.1 Update Exercise Interface

**File:** `src/lib/workoutTemplateService.ts` or create `src/types/exercises.ts`

**Before:**
```typescript
export interface Exercise {
  id: string
  name: string
  description?: string
  category: string
  muscle_groups?: string[] // JSON array
  equipment_types?: string[] // JSON array
  instructions?: string[] // JSON array
  tips?: string[] // JSON array
  // ...
}
```

**After:**
```typescript
export interface ExerciseMuscleGroup {
  id: string
  exercise_id: string
  muscle_group: string
  is_primary: boolean
  created_at: string
}

export interface ExerciseEquipment {
  id: string
  exercise_id: string
  equipment_type: string
  is_required: boolean
  created_at: string
}

export interface ExerciseInstruction {
  id: string
  exercise_id: string
  instruction_order: number
  instruction_text: string
  created_at: string
}

export interface ExerciseTip {
  id: string
  exercise_id: string
  tip_order: number
  tip_text: string
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  description?: string
  category: string
  // Relational data (loaded separately)
  muscle_groups?: ExerciseMuscleGroup[]
  equipment?: ExerciseEquipment[]
  instructions?: ExerciseInstruction[]
  tips?: ExerciseTip[]
  // ...
}
```

### 1.2 Update Workout Log Types

**File:** `src/types/workoutBlocks.ts` or relevant type files

**Add:**
```typescript
export interface WorkoutSetDetail {
  id: string
  workout_exercise_log_id: string
  set_number: number
  weight_kg?: number
  reps_completed?: number
  rpe?: number
  rest_seconds?: number
  notes?: string
  completed_at?: string
  created_at: string
}

export interface WorkoutGiantSetExerciseLog {
  id: string
  workout_set_log_id: string
  exercise_id: string
  exercise_order: number
  weight_kg?: number
  reps_completed?: number
  created_at: string
}

// Update WorkoutExerciseLog interface
export interface WorkoutExerciseLog {
  id: string
  workout_log_id: string
  exercise_id: string
  // Remove: completed_sets?: any // JSON
  // Add:
  set_details?: WorkoutSetDetail[]
  // ...
}
```

## Step 2: Create Exercise Service

**File:** `src/lib/exerciseService.ts`

```typescript
'use client'

import { supabase } from './supabase'
import { AuthService } from './auth/authService'
import { validate } from './validation/validationUtils'
import { CreateExerciseSchema, UpdateExerciseSchema } from './validation/validators'
import { NotFoundError, ServiceError } from './errors/serviceErrors'
import type { Exercise, ExerciseMuscleGroup, ExerciseEquipment, ExerciseInstruction, ExerciseTip } from './workoutTemplateService'

export class ExerciseService {
  /**
   * Load relational data for an exercise
   */
  private static async loadExerciseRelations(exerciseId: string): Promise<{
    muscle_groups: ExerciseMuscleGroup[]
    equipment: ExerciseEquipment[]
    instructions: ExerciseInstruction[]
    tips: ExerciseTip[]
  }> {
    const [muscleGroupsResult, equipmentResult, instructionsResult, tipsResult] = await Promise.all([
      supabase
        .from('exercise_muscle_groups')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('is_primary', { ascending: false }),
      supabase
        .from('exercise_equipment')
        .select('*')
        .eq('exercise_id', exerciseId),
      supabase
        .from('exercise_instructions')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('instruction_order'),
      supabase
        .from('exercise_tips')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('tip_order')
    ])

    return {
      muscle_groups: muscleGroupsResult.data || [],
      equipment: equipmentResult.data || [],
      instructions: instructionsResult.data || [],
      tips: tipsResult.data || []
    }
  }

  /**
   * Get all exercises with relational data
   */
  static async getExercises(coachId: string, includeRelations: boolean = false): Promise<Exercise[]> {
    const coach = await AuthService.verifyCoach()
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('coach_id', coach.id)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new ServiceError('Failed to fetch exercises', 'FETCH_ERROR', error)
    }

    if (!data) {
      return []
    }

    if (includeRelations) {
      const exercisesWithRelations = await Promise.all(
        data.map(async (exercise) => {
          const relations = await this.loadExerciseRelations(exercise.id)
          return { ...exercise, ...relations }
        })
      )
      return exercisesWithRelations
    }

    return data
  }

  /**
   * Get exercise by ID with relational data
   */
  static async getExerciseById(exerciseId: string): Promise<Exercise> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Exercise', exerciseId)
      }
      throw new ServiceError('Failed to fetch exercise', 'FETCH_ERROR', error)
    }

    if (!data) {
      throw new NotFoundError('Exercise', exerciseId)
    }

    const relations = await this.loadExerciseRelations(exerciseId)
    return { ...data, ...relations }
  }

  /**
   * Create exercise with relational data
   */
  static async createExercise(exerciseData: {
    name: string
    description?: string
    category: string
    muscle_groups?: string[]
    equipment_types?: string[]
    instructions?: string[]
    tips?: string[]
    [key: string]: any
  }): Promise<Exercise> {
    // Validate input
    const validated = validate(CreateExerciseSchema, exerciseData)
    
    // Verify auth
    const coach = await AuthService.verifyCoach()

    // Extract relational data
    const { muscle_groups, equipment_types, instructions, tips, ...exerciseFields } = exerciseData

    // Create exercise
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .insert({
        ...validated,
        coach_id: coach.id
      })
      .select()
      .single()

    if (exerciseError) {
      throw new ServiceError('Failed to create exercise', 'CREATE_ERROR', exerciseError)
    }

    if (!exercise) {
      throw new NotFoundError('Exercise')
    }

    // Create relational data
    const relations = await Promise.all([
      muscle_groups?.map((mg, index) =>
        supabase.from('exercise_muscle_groups').insert({
          exercise_id: exercise.id,
          muscle_group: mg,
          is_primary: index === 0
        })
      ) || [],
      equipment_types?.map(et =>
        supabase.from('exercise_equipment').insert({
          exercise_id: exercise.id,
          equipment_type: et,
          is_required: true
        })
      ) || [],
      instructions?.map((inst, index) =>
        supabase.from('exercise_instructions').insert({
          exercise_id: exercise.id,
          instruction_order: index,
          instruction_text: inst
        })
      ) || [],
      tips?.map((tip, index) =>
        supabase.from('exercise_tips').insert({
          exercise_id: exercise.id,
          tip_order: index,
          tip_text: tip
        })
      ) || []
    ])

    // Load and return exercise with relations
    const loadedRelations = await this.loadExerciseRelations(exercise.id)
    return { ...exercise, ...loadedRelations }
  }

  /**
   * Update exercise and relational data
   */
  static async updateExercise(
    exerciseId: string,
    exerciseData: Partial<Exercise> & {
      muscle_groups?: string[]
      equipment_types?: string[]
      instructions?: string[]
      tips?: string[]
    }
  ): Promise<Exercise> {
    // Validate input
    const validated = validate(UpdateExerciseSchema, { id: exerciseId, ...exerciseData })
    
    // Verify auth and ownership
    const coach = await AuthService.verifyCoach()
    
    // Check exercise exists and belongs to coach
    const existing = await this.getExerciseById(exerciseId)
    if (existing.coach_id !== coach.id) {
      throw new ForbiddenError('You do not have permission to update this exercise')
    }

    // Extract relational data
    const { muscle_groups, equipment_types, instructions, tips, ...exerciseFields } = exerciseData

    // Update exercise
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .update(exerciseFields)
      .eq('id', exerciseId)
      .select()
      .single()

    if (exerciseError) {
      throw new ServiceError('Failed to update exercise', 'UPDATE_ERROR', exerciseError)
    }

    // Update relational data if provided
    if (muscle_groups !== undefined) {
      // Delete existing
      await supabase.from('exercise_muscle_groups').delete().eq('exercise_id', exerciseId)
      // Insert new
      await Promise.all(
        muscle_groups.map((mg, index) =>
          supabase.from('exercise_muscle_groups').insert({
            exercise_id: exerciseId,
            muscle_group: mg,
            is_primary: index === 0
          })
        )
      )
    }

    // Similar for equipment_types, instructions, tips...

    const loadedRelations = await this.loadExerciseRelations(exerciseId)
    return { ...exercise, ...loadedRelations }
  }

  /**
   * Delete exercise (cascade deletes relational data)
   */
  static async deleteExercise(exerciseId: string): Promise<void> {
    const coach = await AuthService.verifyCoach()
    
    const existing = await this.getExerciseById(exerciseId)
    if (existing.coach_id !== coach.id) {
      throw new ForbiddenError('You do not have permission to delete this exercise')
    }

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) {
      throw new ServiceError('Failed to delete exercise', 'DELETE_ERROR', error)
    }
  }
}
```

## Step 3: Update Components

### 3.1 Update ExerciseForm Component

**File:** `src/components/ExerciseForm.tsx`

**Key Changes:**
1. Update form to handle arrays for muscle_groups, equipment_types, instructions, tips
2. Add error handling using `handleServiceError`
3. Use `ExerciseService` instead of direct Supabase calls
4. Load relational data when editing

**Example:**
```typescript
import { ExerciseService } from '@/lib/exerciseService'
import { handleServiceError } from '@/lib/utils/errorHandler'
import { useRouter } from 'next/navigation'

const ExerciseForm = ({ exerciseId, onSuccess }) => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    muscle_groups: [] as string[],
    equipment_types: [] as string[],
    instructions: [] as string[],
    tips: [] as string[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (exerciseId) {
        await ExerciseService.updateExercise(exerciseId, formData)
        toast.success('Exercise updated successfully')
      } else {
        await ExerciseService.createExercise(formData)
        toast.success('Exercise created successfully')
      }
      onSuccess?.()
    } catch (error) {
      const { message, statusCode } = handleServiceError(error)
      if (statusCode === 401) {
        router.push('/login')
      } else {
        toast.error(message)
      }
    }
  }

  // ... rest of component
}
```

### 3.2 Update All Service Calls

**Pattern for all components:**

```typescript
// Before
const { data, error } = await supabase.from('exercises').select('*')
if (error) {
  console.error(error)
  return
}

// After
try {
  const exercises = await ExerciseService.getExercises(coachId, true)
  // Use exercises
} catch (error) {
  const { message, statusCode } = handleServiceError(error)
  if (statusCode === 401) {
    router.push('/login')
  } else {
    toast.error(message)
  }
}
```

## Step 4: Update Workout Log Components

**Files to Update:**
- `src/app/api/log-set/route.ts` - Update to use `workout_set_details` table
- `src/components/client/workout-execution/**` - Update to read relational data
- `src/app/client/progress/workout-logs/**` - Update to display relational data

**Example for log-set route:**
```typescript
// Before: Storing in completed_sets JSON
await supabase.from('workout_exercise_logs').update({
  completed_sets: [...sets]
})

// After: Storing in workout_set_details table
await Promise.all(
  sets.map((set, index) =>
    supabase.from('workout_set_details').upsert({
      workout_exercise_log_id: logId,
      set_number: index + 1,
      weight_kg: set.weight,
      reps_completed: set.reps,
      rpe: set.rpe,
      rest_seconds: set.rest,
      completed_at: new Date().toISOString()
    })
  )
)
```

## Step 5: Testing Checklist

- [ ] Run all migration scripts in order
- [ ] Verify data migrated correctly using `10_verification_queries.sql`
- [ ] Test exercise creation with relational data
- [ ] Test exercise update with relational data
- [ ] Test exercise deletion (verify cascade)
- [ ] Test workout log creation with relational data
- [ ] Test all error handling paths
- [ ] Test validation errors
- [ ] Test auth errors
- [ ] Verify RLS policies work correctly
- [ ] Test performance with new relational queries
- [ ] Run full build (`npm run build`)
- [ ] Test in browser (create, read, update, delete operations)

## Step 6: Cleanup (Future Migration)

After all code is updated and tested:

1. Remove JSON columns from database (new migration)
2. Remove JSON types from TypeScript interfaces
3. Remove any JSON-related code

This should be done in a separate migration after confirming everything works.

