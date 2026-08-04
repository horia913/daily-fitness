import { z } from 'zod'

export const RoundsDriverSchema = z.enum(['fixed', 'amrap', 'interval', 'for_time'])
export const MeasurementSchema = z.enum(['reps', 'time', 'distance'])
export const TechniqueSchema = z.enum(['none', 'drop_set', 'cluster', 'rest_pause'])

/** Per-set row on workout_set_prescriptions (slot-level pace/time/speed/HR live on wsee). */
export const PrescriptionSchema = z.object({
  id: z.string().uuid().optional(),
  slot_id: z.string().uuid().optional(),
  set_number: z.number().int().min(1),
  reps: z.string().nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  load_percentage: z.number().nullable().optional(),
  rpe: z.number().int().min(6).max(10).nullable().optional(),
  tempo: z.string().nullable().optional(),
  work_seconds: z.number().int().nullable().optional(),
  distance_meters: z.number().nullable().optional(),
})

export const GroupModelSlotWriteSchema = z
  .object({
    exercise_id: z.string().uuid(),
    exercise_order: z.number().int().min(1),
    measurement: MeasurementSchema,
    technique: TechniqueSchema,
    sets: z.number().int().nullable().optional(),
    reps: z.string().nullable().optional(),
    weight_kg: z.number().nullable().optional(),
    load_percentage: z.number().nullable().optional(),
    rpe: z.number().int().min(6).max(10).nullable().optional(),
    tempo: z.string().nullable().optional(),
    rest_seconds: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
    work_seconds: z.number().int().nullable().optional(),
    distance_meters: z.number().nullable().optional(),
    target_time_seconds: z.number().int().nullable().optional(),
    target_pace_seconds_per_km: z.number().nullable().optional(),
    target_speed_pct: z.number().nullable().optional(),
    hr_zone: z.number().int().nullable().optional(),
    target_hr_pct: z.number().nullable().optional(),
    drop_percentage: z.number().int().nullable().optional(),
    max_drops: z.number().int().nullable().optional(),
    reps_per_cluster: z.number().int().nullable().optional(),
    clusters_per_set: z.number().int().nullable().optional(),
    intra_cluster_rest_seconds: z.number().int().nullable().optional(),
    rest_pause_seconds: z.number().int().nullable().optional(),
    max_rest_pauses: z.number().int().nullable().optional(),
    exercise_letter: z.string().nullable().optional(),
  })
  .superRefine((slot, ctx) => {
    if (slot.technique === 'drop_set' && slot.drop_percentage == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'drop_percentage required for drop_set technique',
        path: ['drop_percentage'],
      })
    }
    if (slot.technique === 'cluster') {
      if (slot.reps_per_cluster == null || slot.clusters_per_set == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reps_per_cluster and clusters_per_set required for cluster technique',
        })
      }
    }
    if (slot.technique === 'rest_pause') {
      if (slot.rest_pause_seconds == null || slot.max_rest_pauses == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'rest_pause_seconds and max_rest_pauses required for rest_pause technique',
        })
      }
    }
    if (slot.measurement === 'time' && slot.work_seconds == null && slot.technique === 'none') {
      // timed_set / tabata slots need work_seconds unless emom time mode handled at group level
    }
    if (slot.measurement === 'distance' && slot.distance_meters == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'distance_meters required for distance measurement',
        path: ['distance_meters'],
      })
    }
  })

export const GroupModelWritePayloadSchema = z
  .object({
    rounds_driver: RoundsDriverSchema,
    interval_seconds: z.number().int().nullable().optional(),
    time_cap_seconds: z.number().int().nullable().optional(),
    total_sets: z.number().int().nullable().optional(),
    rest_seconds: z.number().int().nullable().optional(),
    duration_seconds: z.number().int().nullable().optional(),
    set_type: z.string(),
    reps_per_set: z.string().nullable().optional(),
    set_name: z.string().nullable().optional(),
    set_notes: z.string().nullable().optional(),
    slots: z.array(GroupModelSlotWriteSchema).min(1),
  })
  .superRefine((payload, ctx) => {
    if (payload.rounds_driver === 'interval' && payload.interval_seconds == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interval_seconds required when rounds_driver is interval',
        path: ['interval_seconds'],
      })
    }
    if (payload.rounds_driver === 'for_time' && payload.time_cap_seconds == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'time_cap_seconds required when rounds_driver is for_time',
        path: ['time_cap_seconds'],
      })
    }
    if (payload.rounds_driver === 'amrap' && payload.duration_seconds == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'duration_seconds required when rounds_driver is amrap',
        path: ['duration_seconds'],
      })
    }
  })
