/**
 * Zod Validation Schemas
 * Comprehensive validation schemas for all entities
 */

import { z } from 'zod'

// ============================================================================
// EXERCISE SCHEMAS
// ============================================================================

export const ExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(200, 'Exercise name must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  category: z.string().min(1, 'Category is required'),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  video_url: z.string().url('Invalid video URL').optional().nullable(),
  is_active: z.boolean().default(true),
  // Note: muscle_groups, equipment_types, instructions, tips will be handled relationally
})

export const CreateExerciseSchema = ExerciseSchema.extend({
  coach_id: z.string().uuid('Invalid coach ID'),
})

export const UpdateExerciseSchema = ExerciseSchema.partial().extend({
  id: z.string().uuid('Invalid exercise ID'),
})

// ============================================================================
// WORKOUT TEMPLATE SCHEMAS
// ============================================================================

export const WorkoutTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Template name must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'athlete'], {
    message: 'Difficulty level must be beginner, intermediate, advanced, or athlete'
  }),
  estimated_duration: z.number().int('Duration must be an integer').min(1, 'Duration must be at least 1 minute').max(480, 'Duration must be 480 minutes or less'),
  category: z.string().max(100, 'Category must be 100 characters or less').optional().nullable(),
  is_active: z.boolean().default(true),
})

export const CreateWorkoutTemplateSchema = WorkoutTemplateSchema.extend({
  coach_id: z.string().uuid('Invalid coach ID'),
})

export const UpdateWorkoutTemplateSchema = WorkoutTemplateSchema.partial().extend({
  id: z.string().uuid('Invalid template ID'),
})

// ============================================================================
// WORKOUT BLOCK SCHEMAS
// ============================================================================

export const WorkoutBlockTypeSchema = z.enum([
  'straight_set',
  'superset',
  'giant_set',
  'drop_set',
  'cluster_set',
  'rest_pause',
  'pyramid_set',
  'ladder',
  'pre_exhaustion',
  'amrap',
  'emom',
  'for_time',
  'tabata',
  'circuit',
  'hr_sets'
])

export const WorkoutBlockSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  block_type: WorkoutBlockTypeSchema,
  block_order: z.number().int('Block order must be an integer').min(1, 'Block order must be at least 1'),
  block_name: z.string().max(255, 'Block name must be 255 characters or less').optional().nullable(),
  block_notes: z.string().max(2000, 'Block notes must be 2000 characters or less').optional().nullable(),
  duration_seconds: z.number().int('Duration must be an integer').min(1).max(36000).optional().nullable(),
  rest_seconds: z.number().int('Rest seconds must be an integer').min(0).max(3600).optional().nullable(),
  total_sets: z.number().int('Total sets must be an integer').min(1).max(100).optional().nullable(),
  reps_per_set: z.string().max(50, 'Reps per set must be 50 characters or less').optional().nullable(),
  // Note: block_parameters will be removed after migration
})

export const CreateWorkoutBlockSchema = WorkoutBlockSchema

export const UpdateWorkoutBlockSchema = WorkoutBlockSchema.partial().extend({
  id: z.string().uuid('Invalid block ID'),
})

// ============================================================================
// PROGRAM SCHEMAS
// ============================================================================

export const ProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(200, 'Program name must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'athlete'], {
    message: 'Difficulty level must be beginner, intermediate, advanced, or athlete'
  }),
  duration_weeks: z.number().int('Duration must be an integer').min(1, 'Duration must be at least 1 week').max(52, 'Duration must be 52 weeks or less'),
  is_active: z.boolean().default(true),
})

export const CreateProgramSchema = ProgramSchema.extend({
  coach_id: z.string().uuid('Invalid coach ID'),
})

export const UpdateProgramSchema = ProgramSchema.partial().extend({
  id: z.string().uuid('Invalid program ID'),
})

// ============================================================================
// PROGRAM SCHEDULE SCHEMAS
// ============================================================================

export const ProgramScheduleSchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  template_id: z.string().uuid('Invalid template ID'),
  day_of_week: z.number().int('Day of week must be an integer').min(0, 'Day must be 0-6').max(6, 'Day must be 0-6'),
  week_number: z.number().int('Week number must be an integer').min(1, 'Week number must be at least 1').max(52, 'Week number must be 52 or less'),
})

export const CreateProgramScheduleSchema = ProgramScheduleSchema

export const UpdateProgramScheduleSchema = ProgramScheduleSchema.partial().extend({
  id: z.string().uuid('Invalid schedule ID'),
})

// ============================================================================
// PROGRAM ASSIGNMENT SCHEMAS
// ============================================================================

export const ProgramAssignmentSchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  client_id: z.string().uuid('Invalid client ID'),
  coach_id: z.string().uuid('Invalid coach ID'),
  current_day_number: z.number().int('Current day must be an integer').min(1).max(7).optional().default(1),
  completed_days: z.number().int('Completed days must be an integer').min(0).optional().default(0),
  total_days: z.number().int('Total days must be an integer').min(1, 'Total days must be at least 1'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  preferred_workout_days: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional().default('active'),
  is_customized: z.boolean().optional().default(false),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
  name: z.string().max(200, 'Name must be 200 characters or less').optional().nullable(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  duration_weeks: z.number().int('Duration must be an integer').min(1).max(52).optional().nullable(),
})

export const CreateProgramAssignmentSchema = ProgramAssignmentSchema

export const UpdateProgramAssignmentSchema = ProgramAssignmentSchema.partial().extend({
  id: z.string().uuid('Invalid assignment ID'),
})

// ============================================================================
// MEAL PLAN SCHEMAS
// ============================================================================

export const MealPlanSchema = z.object({
  name: z.string().min(1, 'Meal plan name is required').max(200, 'Meal plan name must be 200 characters or less'),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
  target_calories: z.number().int('Target calories must be an integer').min(0).max(10000).optional().nullable(),
  target_protein: z.number().min(0).max(1000).optional().nullable(),
  target_carbs: z.number().min(0).max(1000).optional().nullable(),
  target_fat: z.number().min(0).max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
})

export const CreateMealPlanSchema = MealPlanSchema.extend({
  coach_id: z.string().uuid('Invalid coach ID'),
})

export const UpdateMealPlanSchema = MealPlanSchema.partial().extend({
  id: z.string().uuid('Invalid meal plan ID'),
})

// ============================================================================
// MEAL SCHEMAS
// ============================================================================

export const MealSchema = z.object({
  meal_plan_id: z.string().uuid('Invalid meal plan ID'),
  name: z.string().min(1, 'Meal name is required').max(200, 'Meal name must be 200 characters or less'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack'], {
    message: 'Meal type must be breakfast, lunch, dinner, or snack'
  }),
  order_index: z.number().int('Order index must be an integer').min(0).optional().default(0),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
})

export const CreateMealSchema = MealSchema

export const UpdateMealSchema = MealSchema.partial().extend({
  id: z.string().uuid('Invalid meal ID'),
})

// ============================================================================
// GOAL SCHEMAS
// ============================================================================

export const GoalSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  coach_id: z.string().uuid('Invalid coach ID').optional().nullable(),
  title: z.string().min(1, 'Goal title is required').max(200, 'Goal title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  category: z.enum([
    'weight_loss',
    'muscle_gain',
    'strength',
    'endurance',
    'mobility',
    'body_composition',
    'performance',
    'other'
  ], {
    message: 'Invalid goal category'
  }),
  target_value: z.number().min(0).optional().nullable(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').optional().nullable(),
  current_value: z.number().optional().nullable(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional().default('active'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  completed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Completed date must be in YYYY-MM-DD format').optional().nullable(),
  progress_percentage: z.number().min(0).max(100).optional().default(0),
  is_public: z.boolean().optional().default(false),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
  target_unit: z.string().max(50, 'Target unit must be 50 characters or less').optional().nullable(),
})

export const CreateGoalSchema = GoalSchema

export const UpdateGoalSchema = GoalSchema.partial().extend({
  id: z.string().uuid('Invalid goal ID'),
})

// ============================================================================
// HABIT SCHEMAS
// ============================================================================

export const HabitSchema = z.object({
  coach_id: z.string().uuid('Invalid coach ID'),
  name: z.string().min(1, 'Habit name is required').max(255, 'Habit name must be 255 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  frequency_type: z.enum(['daily', 'weekly'], {
    message: 'Frequency type must be daily or weekly'
  }),
  target_days: z.number().int('Target days must be an integer').min(1, 'Target days must be at least 1').max(7, 'Target days must be 7 or less').optional().default(1),
  is_active: z.boolean().default(true),
})

export const CreateHabitSchema = HabitSchema

export const UpdateHabitSchema = HabitSchema.partial().extend({
  id: z.string().uuid('Invalid habit ID'),
})

// ============================================================================
// SESSION SCHEMAS
// ============================================================================

export const SessionSchema = z.object({
  coach_id: z.string().uuid('Invalid coach ID'),
  client_id: z.string().uuid('Invalid client ID'),
  title: z.string().min(1, 'Session title is required').max(200, 'Session title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  scheduled_at: z.string().datetime('Scheduled at must be a valid datetime'),
  duration_minutes: z.number().int('Duration must be an integer').min(15, 'Duration must be at least 15 minutes').max(480, 'Duration must be 480 minutes or less').optional().default(60),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional().default('scheduled'),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
})

export const CreateSessionSchema = SessionSchema

export const UpdateSessionSchema = SessionSchema.partial().extend({
  id: z.string().uuid('Invalid session ID'),
})

// ============================================================================
// CLIPCARD SCHEMAS
// ============================================================================

export const ClipcardSchema = z.object({
  coach_id: z.string().uuid('Invalid coach ID'),
  client_id: z.string().uuid('Invalid client ID'),
  clipcard_type_id: z.string().uuid('Invalid clipcard type ID'),
  sessions_total: z.number().int('Sessions total must be an integer').min(1, 'Sessions total must be at least 1'),
  sessions_used: z.number().int('Sessions used must be an integer').min(0).optional().default(0),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  is_active: z.boolean().default(true),
})

export const CreateClipcardSchema = ClipcardSchema

export const UpdateClipcardSchema = ClipcardSchema.partial().extend({
  id: z.string().uuid('Invalid clipcard ID'),
})

// ============================================================================
// CLIPCARD TYPE SCHEMAS
// ============================================================================

export const ClipcardTypeSchema = z.object({
  coach_id: z.string().uuid('Invalid coach ID'),
  name: z.string().min(1, 'Clipcard type name is required').max(200, 'Name must be 200 characters or less'),
  sessions_count: z.number().int('Sessions count must be an integer').min(1, 'Sessions count must be at least 1'),
  validity_days: z.number().int('Validity days must be an integer').min(1, 'Validity days must be at least 1'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  is_active: z.boolean().default(true),
})

export const CreateClipcardTypeSchema = ClipcardTypeSchema

export const UpdateClipcardTypeSchema = ClipcardTypeSchema.partial().extend({
  id: z.string().uuid('Invalid clipcard type ID'),
})

// ============================================================================
// COACH AVAILABILITY SCHEMAS
// ============================================================================

export const CoachAvailabilitySchema = z.object({
  coach_id: z.string().uuid('Invalid coach ID'),
  day_of_week: z.number().int('Day of week must be an integer').min(0, 'Day must be 0-6').max(6, 'Day must be 0-6'),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Start time must be in HH:MM:SS format'),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'End time must be in HH:MM:SS format'),
  slot_capacity: z.number().int('Slot capacity must be an integer').min(1).max(100).optional().default(4),
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
)

export const CreateCoachAvailabilitySchema = CoachAvailabilitySchema

export const UpdateCoachAvailabilitySchema = CoachAvailabilitySchema.partial().extend({
  id: z.string().uuid('Invalid availability ID'),
})

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format')

/**
 * Date validation schema (YYYY-MM-DD)
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

/**
 * Time validation schema (HH:MM:SS)
 */
export const TimeSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format')

/**
 * Email validation schema
 */
export const EmailSchema = z.string().email('Invalid email format')

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

