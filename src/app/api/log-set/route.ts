import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'
import { createForbiddenResponse } from '@/lib/apiAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

/** Request body for POST /api/log-set. Common fields + set-type-specific (optional). */
interface LogSetRequestBody {
  workout_log_id?: string
  workout_assignment_id?: string
  set_entry_id?: string   // current name
  block_id?: string       // backward-compat alias for set_entry_id
  set_type?: string       // current name
  block_type?: string     // backward-compat alias for set_type
  client_id?: string
  session_id?: string
  notes?: string
  template_exercise_id?: string
  rpe?: number | string
  idempotency_key?: string
  exercise_id?: string
  weight?: number | string
  reps?: number | string
  set_number?: number
  [key: string]: unknown
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(req: NextRequest) {
  // Initialize performance collector for Server-Timing header
  const perf = new PerfCollector('/api/log-set')

  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await perf.time('auth', () => 
      supabaseAuth.auth.getUser()
    )
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
    let supabaseAdmin: ReturnType<typeof createClient> | null = null
    let body: LogSetRequestBody
    try {
      body = (await req.json()) as LogSetRequestBody
    } catch (parseError: unknown) {
      console.error("❌ Error parsing request body:", parseError);
      return createErrorResponse(
        "Invalid JSON in request body",
        parseError instanceof Error ? parseError.message : String(parseError),
        'PARSE_ERROR',
        400
      );
    }

    const {
      workout_log_id,
      set_entry_id: bodySetEntryId,
      block_id: bodyBlockId,           // backward-compat alias
      client_id,
      notes,
      set_type: bodySetType,
      block_type: bodyBlockType,       // backward-compat alias
      workout_assignment_id,
      session_id, // workout_sessions.id - used to link workout_logs
      template_exercise_id,
      rpe: incomingRpe, // Golden Logging Flow: RPE included with set log
      idempotency_key, // Golden Logging Flow: client-generated dedup key
    } = body

    // Resolve canonical field names (prefer new names, fall back to old)
    const set_entry_id = bodySetEntryId ?? bodyBlockId
    const incomingBlockType = bodySetType ?? bodyBlockType

    // Validate session_id is a valid UUID if provided
    const isValidUuid = (value: string | null | undefined): boolean => {
      if (!value) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    };
    const validSessionId = isValidUuid(session_id) ? session_id : null;

    if (!userId) {
      console.error("❌ Missing user - cannot determine user");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Validate that client_id matches authenticated user
    // This prevents users from logging sets for other clients
    if (client_id && client_id !== userId) {
      console.error("❌ Security violation: client_id mismatch", { client_id, userId });
      return createForbiddenResponse('Cannot log sets for another user')
    }
    
    // Ensure we have admin client
    if (!supabaseAdmin) {
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseServiceKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 503 })
      }
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        global: { fetch: getTrackedFetch() },
      })
    }

    // Determine block type (default to straight_set for backwards compatibility)
    const validBlockTypes = [
      'straight_set',
      'superset',
      'giant_set',
      'amrap',
      'dropset',
      'cluster_set',
      'rest_pause',
      'preexhaust',
      'emom',
      'tabata',
      'fortime',
      'hr_sets',
    ] as const

    type BlockType = (typeof validBlockTypes)[number] | 'hr_sets'

    let blockType: BlockType = 'straight_set'

    if (incomingBlockType) {
      if (!(validBlockTypes as readonly string[]).includes(incomingBlockType)) {
        console.error("❌ Invalid set_type:", incomingBlockType, "Valid types:", validBlockTypes);
        return NextResponse.json(
          { 
            error: `Invalid set_type: ${incomingBlockType}`,
            details: `Must be one of: ${validBlockTypes.join(", ")}`,
            received: incomingBlockType
          },
          { status: 400 }
        )
      }
      blockType = incomingBlockType as BlockType;
    }

    // Step 1: Get or create workout_log_id (REQUIRED for workout_set_logs)
    // workout_logs table is for session summary, NOT individual sets
    // Individual sets go to workout_set_logs table, but they require a workout_log_id
    let workoutLogId = workout_log_id

    // If workout_log_id not provided, check for existing one or create a new one
    // workout_assignment_id is REQUIRED (NOT NULL constraint)
    if (!workoutLogId) {
      if (!workout_assignment_id) {
        console.error("❌ Missing workout_assignment_id - required to create workout_log");
        return NextResponse.json(
          { 
            error: 'Missing required field: workout_assignment_id (required for workout_logs)',
            details: 'workout_assignment_id is required when workout_log_id is not provided'
          },
          { status: 400 }
        )
      }

      // TASK 1: For program workouts, determine workout_template_id ONLY via workout_assignments
      // Resolve workout_assignment_id from workout_log_id if needed
      let actualWorkoutAssignmentId = workout_assignment_id;
      
      // If workout_log_id is provided but workout_assignment_id is not, resolve it from workout_logs
      if (!actualWorkoutAssignmentId && workout_log_id) {
        const { data: rawLog, error: logError } = await supabaseAdmin
          .from('workout_logs')
          .select('workout_assignment_id')
          .eq('id', workout_log_id)
          .eq('client_id', userId)
          .maybeSingle();

        if (logError) {
          console.error('❌ Error fetching workout_log:', logError);
          return NextResponse.json(
            { 
              error: 'Failed to resolve workout assignment from workout log',
              details: logError.message || 'Unknown error'
            },
            { status: 400 }
          );
        }

        const workoutLog = rawLog as { workout_assignment_id: string | null } | null;
        if (!workoutLog?.workout_assignment_id) {
          console.error('❌ workout_log found but workout_assignment_id is null');
          return NextResponse.json(
            { 
              error: 'Workout log missing workout_assignment_id',
              details: 'The workout log does not have a linked workout assignment'
            },
            { status: 400 }
          );
        }

        actualWorkoutAssignmentId = workoutLog.workout_assignment_id;
      }

      // Validate that workout_assignment_id exists and has workout_template_id
      if (!actualWorkoutAssignmentId) {
        console.error('❌ Missing workout_assignment_id - required to create workout_log');
        return NextResponse.json(
          { 
            error: 'Missing required field: workout_assignment_id',
            details: 'workout_assignment_id is required when workout_log_id is not provided'
          },
          { status: 400 }
        );
      }

      // Get workout_assignment to verify it exists and get workout_template_id
      const { data: rawAssignment, error: assignmentError } = await supabaseAdmin
        .from('workout_assignments')
        .select('id, workout_template_id, client_id')
        .eq('id', actualWorkoutAssignmentId)
        .eq('client_id', userId)
        .maybeSingle();

      if (assignmentError) {
        console.error('❌ Error fetching workout_assignment:', assignmentError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch workout assignment',
            details: assignmentError.message || 'Unknown error'
          },
          { status: 400 }
        );
      }

      const workoutAssignment = rawAssignment as { id: string; workout_template_id: string | null; client_id: string } | null;
      if (!workoutAssignment) {
        console.error('❌ workout_assignment not found or access denied');
        return NextResponse.json(
          { 
            error: 'Workout assignment not found',
            details: 'The workout assignment does not exist or you do not have access to it'
          },
          { status: 400 }
        );
      }

      // TASK 1: Ensure workout_template_id is not null
      if (!workoutAssignment.workout_template_id) {
        console.error('❌ workout_assignment.workout_template_id is null');
        return NextResponse.json(
          { 
            error: 'Workout assignment missing template',
            details: 'The workout assignment does not have a workout_template_id. This is required for logging sets.'
          },
          { status: 400 }
        );
      }

      // ✅ Check if workout_log already exists for this assignment (and is not completed)
      // If session_id provided, prefer logs linked to that session
      let existingLogQuery = supabaseAdmin
        .from('workout_logs')
        .select('id, started_at, completed_at, workout_session_id')
        .eq('client_id', userId)
        .eq('workout_assignment_id', actualWorkoutAssignmentId)
        .is('completed_at', null)  // Only active (not completed) logs
        .order('started_at', { ascending: false })
        .limit(1);
      
      // If we have a valid session_id, prioritize logs linked to that session
      if (validSessionId) {
        existingLogQuery = existingLogQuery.eq('workout_session_id', validSessionId);
      }
      
      const { data: existingLog, error: existingError } = await existingLogQuery.maybeSingle();

      type ExistingLogRow = { id: string; started_at: string | null; completed_at: string | null; workout_session_id?: string | null };
      let finalExistingLog: ExistingLogRow | null = (existingLog ?? null) as ExistingLogRow | null;

      // Fallback: If no log found for this session, check for any active log without session linkage
      if (!existingLog && validSessionId) {
        const { data: rawUnlinked, error: unlinkedError } = await supabaseAdmin
          .from('workout_logs')
          .select('id, started_at, completed_at, workout_session_id')
          .eq('client_id', userId)
          .eq('workout_assignment_id', actualWorkoutAssignmentId)
          .is('completed_at', null)
          .is('workout_session_id', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        type UnlinkedLogRow = { id: string; started_at: string | null; completed_at: string | null; workout_session_id: string | null };
        const unlinkedLog = rawUnlinked as UnlinkedLogRow | null;
        
        if (unlinkedLog && !unlinkedError) {
          const { error: linkError } = await (supabaseAdmin as any)
            .from('workout_logs')
            .update({ workout_session_id: validSessionId })
            .eq('id', unlinkedLog.id);
          
          if (!linkError) {
            finalExistingLog = { ...unlinkedLog, workout_session_id: validSessionId };
          } else {
            console.warn('⚠️ Failed to link existing log to session:', linkError);
            finalExistingLog = unlinkedLog;
          }
        }
      }

      // Also check how many total logs exist for this assignment (for debugging)
      const { data: allLogsForAssignment, count } = await supabaseAdmin
        .from('workout_logs')
        .select('id, started_at, completed_at', { count: 'exact' })
        .eq('client_id', userId)
        .eq('workout_assignment_id', actualWorkoutAssignmentId)
        .order('started_at', { ascending: false })
        .limit(10);
      const logsForAssignment = (allLogsForAssignment ?? []) as Array<{
        id: string
        started_at: string | null
        completed_at: string | null
      }>

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, but other errors are not
        console.error('❌ Error checking for existing workout_log:', existingError);
      }

      if (finalExistingLog) {
        workoutLogId = finalExistingLog.id;
      } else {
        // Include workout_session_id if we have a valid session
        const insertPayload: {
          client_id: string;
          workout_assignment_id: string;
          started_at: string;
          completed_at: null;
          workout_session_id?: string;
        } = {
          client_id: userId,
          workout_assignment_id: actualWorkoutAssignmentId,
          started_at: new Date().toISOString(),
          completed_at: null,
        };
        
        if (validSessionId) {
          insertPayload.workout_session_id = validSessionId;
        }

        const { data: newLog, error: createError } = await (supabaseAdmin as any)
          .from('workout_logs')
          .insert([insertPayload])
          .select('id, workout_assignment_id, workout_session_id')
          .single();

        if (createError) {
          console.error('❌ Error creating workout_log:', {
            error: createError,
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
          });
          return NextResponse.json(
            { 
              error: 'Failed to create workout log',
              details: createError.message || 'Unknown error',
              code: createError.code,
              hint: createError.hint
            },
            { status: 400 }
          );
        }

        if (!newLog) {
          console.error('❌ Created workout_log but no data returned');
          return NextResponse.json(
            { 
              error: 'Failed to create workout log',
              details: 'Insert succeeded but no data returned'
            },
            { status: 400 }
          );
        }

        workoutLogId = newLog.id;
      }
    }

    // CRITICAL: Validate workout_log_id is set (REQUIRED by database NOT NULL constraint)
    if (!workoutLogId) {
      console.error("❌ Missing required field: workout_log_id - cannot insert to workout_set_logs");
      return NextResponse.json(
        { 
          error: 'Missing required field: workout_log_id',
          details: 'workout_log_id is required (NOT NULL) for workout_set_logs table. Failed to create or retrieve workout log.',
          code: 'MISSING_WORKOUT_LOG_ID'
        },
        { status: 400 }
      )
    }

    // Step 2: Build insert payload based on set_type and log to workout_set_logs
    let primaryExerciseId: string | null = null
    let primaryWeight: number | null = null
    let primaryReps: number | null = null

    // Validate that we have at least set_entry_id (required for workout_set_logs)
    if (!set_entry_id) {
      console.error("❌ Missing required field: set_entry_id");
      return NextResponse.json(
        { 
          error: 'Missing required field: set_entry_id',
          details: 'set_entry_id is required for workout_set_logs table'
        },
        { status: 400 }
      )
    }

    // Build insert data - workout_log_id is REQUIRED (NOT NULL constraint)
    const insertData: any = {
      client_id: userId,
      set_entry_id,
      workout_log_id: workoutLogId, // REQUIRED - always set at this point
      set_type: blockType,
      completed_at: new Date().toISOString(),
    }

    // Add notes only if the column exists in the schema (optional field)
    // Note: Remove this if notes column doesn't exist in workout_set_logs
    // if (notes) {
    //   insertData.notes = notes
    // }

    const parseNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null
      const num = typeof value === 'number' ? value : parseFloat(String(value))
      return isNaN(num) ? null : num
    }

    const parseIntNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null
      const num = typeof value === 'number' ? value : parseInt(String(value), 10)
      return isNaN(num) ? null : num
    }

    const blockTypeForPerformance = blockType as BlockType | 'hr_sets'

    switch (blockTypeForPerformance) {
        case 'straight_set': {
          const exerciseId = body.exercise_id as string | undefined
          const weightNum = parseNumber(body.weight)
          const repsNum = parseIntNumber(body.reps)

          if (!exerciseId || !weightNum || !repsNum) {
            console.error("❌ Missing required fields for straight_set:", {
              has_exercise_id: !!exerciseId,
              has_weight: weightNum !== null,
              has_reps: repsNum !== null,
            });
            return NextResponse.json(
              { 
                error: 'Missing required fields for straight_set: exercise_id, weight, reps',
                details: {
                  exercise_id: exerciseId || 'missing',
                  weight: weightNum !== null ? weightNum : 'missing or invalid',
                  reps: repsNum !== null ? repsNum : 'missing or invalid',
                  received: {
                    exercise_id: body.exercise_id,
                    weight: body.weight,
                    reps: body.reps,
                  }
                }
              },
              { status: 400 }
            )
          }

          insertData.exercise_id = exerciseId
          insertData.weight = weightNum
          insertData.reps = repsNum
          insertData.set_number = body.set_number || 1

          primaryExerciseId = exerciseId
          primaryWeight = weightNum
          primaryReps = repsNum
          break
        }

        case 'superset': {
          insertData.set_number = body.set_number || 1
          insertData.superset_exercise_a_id = body.superset_exercise_a_id
          insertData.superset_weight_a = parseNumber(body.superset_weight_a)
          insertData.superset_reps_a = parseIntNumber(body.superset_reps_a)
          insertData.superset_exercise_b_id = body.superset_exercise_b_id
          insertData.superset_weight_b = parseNumber(body.superset_weight_b)
          insertData.superset_reps_b = parseIntNumber(body.superset_reps_b)

          // Use exercise A for e1RM
          primaryExerciseId = typeof body.superset_exercise_a_id === 'string' ? body.superset_exercise_a_id : null
          primaryWeight = parseNumber(body.superset_weight_a)
          primaryReps = parseIntNumber(body.superset_reps_a)
          break
        }

        case 'giant_set': {
          insertData.round_number = body.round_number || 1
          // Assume schema has JSONB column giant_set_exercises
          insertData.giant_set_exercises = body.giant_set_exercises || null
          break
        }

        case 'amrap': {
          if (body.exercise_id) {
            insertData.exercise_id = body.exercise_id
          }
          insertData.amrap_total_reps = parseIntNumber(body.amrap_total_reps)
          insertData.amrap_duration_seconds = parseIntNumber(body.amrap_duration_seconds)
          insertData.amrap_target_reps = parseIntNumber(body.amrap_target_reps) || null
          break
        }

        case 'dropset': {
          insertData.set_number = body.set_number || 1
          insertData.dropset_initial_weight = parseNumber(body.dropset_initial_weight)
          insertData.dropset_initial_reps = parseIntNumber(body.dropset_initial_reps)
          insertData.dropset_final_weight = parseNumber(body.dropset_final_weight)
          insertData.dropset_final_reps = parseIntNumber(body.dropset_final_reps)
          insertData.dropset_percentage = parseNumber(body.dropset_percentage)

          // Use initial weight/reps for e1RM
          primaryExerciseId = body.exercise_id || null
          primaryWeight = parseNumber(body.dropset_initial_weight)
          primaryReps = parseIntNumber(body.dropset_initial_reps)
          if (body.exercise_id) {
            insertData.exercise_id = body.exercise_id
          }
          break
        }

        case 'cluster_set': {
          const exerciseId = body.exercise_id as string | undefined
          const weightNum = parseNumber(body.weight)
          const repsNum = parseIntNumber(body.reps)

          insertData.exercise_id = exerciseId
          insertData.weight = weightNum
          insertData.reps = repsNum
          insertData.set_number = body.set_number || 1
          insertData.cluster_number = body.cluster_number || 1

          primaryExerciseId = exerciseId || null
          primaryWeight = weightNum
          primaryReps = repsNum
          break
        }

        case 'rest_pause': {
          const exerciseId = body.exercise_id as string | undefined
          insertData.exercise_id = exerciseId
          // Only save rest_pause_initial_weight, not the generic weight field
          insertData.rest_pause_initial_weight = parseNumber(body.rest_pause_initial_weight)
          insertData.rest_pause_initial_reps = parseIntNumber(body.rest_pause_initial_reps)
          insertData.rest_pause_reps_after = parseIntNumber(body.rest_pause_reps_after)
          insertData.rest_pause_number = body.rest_pause_number || 1
          insertData.set_number = body.set_number || 1
          // Add rest_pause_duration and max_rest_pauses (from workout_rest_pause_sets)
          insertData.rest_pause_duration = parseIntNumber(body.rest_pause_duration)
          insertData.max_rest_pauses = parseIntNumber(body.max_rest_pauses)

          primaryExerciseId = exerciseId || null
          primaryWeight = parseNumber(body.rest_pause_initial_weight)
          primaryReps = parseIntNumber(body.rest_pause_initial_reps)
          break
        }

        case 'preexhaust': {
          insertData.set_number = body.set_number || 1
          insertData.preexhaust_isolation_exercise_id = body.preexhaust_isolation_exercise_id
          insertData.preexhaust_isolation_weight = parseNumber(body.preexhaust_isolation_weight)
          insertData.preexhaust_isolation_reps = parseIntNumber(body.preexhaust_isolation_reps)
          insertData.preexhaust_compound_exercise_id = body.preexhaust_compound_exercise_id
          insertData.preexhaust_compound_weight = parseNumber(body.preexhaust_compound_weight)
          insertData.preexhaust_compound_reps = parseIntNumber(body.preexhaust_compound_reps)
          break
        }

        case 'emom': {
          if (body.exercise_id) {
            insertData.exercise_id = body.exercise_id
          }
          insertData.emom_minute_number = body.emom_minute_number
          insertData.emom_total_reps_this_min = parseIntNumber(body.emom_total_reps_this_min)
          insertData.emom_total_duration_sec = parseIntNumber(body.emom_total_duration_sec)
          break
        }

        case 'tabata': {
          if (body.exercise_id) {
            insertData.exercise_id = body.exercise_id
          }
          insertData.tabata_rounds_completed = parseIntNumber(body.tabata_rounds_completed)
          insertData.tabata_total_duration_sec = parseIntNumber(body.tabata_total_duration_sec)
          break
        }

        case 'fortime': {
          if (body.exercise_id) {
            insertData.exercise_id = body.exercise_id
          }
          insertData.fortime_total_reps = parseIntNumber(body.fortime_total_reps)
          insertData.fortime_time_taken_sec = parseIntNumber(body.fortime_time_taken_sec)
          insertData.fortime_time_cap_sec = parseIntNumber(body.fortime_time_cap_sec)
          insertData.fortime_target_reps = parseIntNumber(body.fortime_target_reps) || null
          break
        }


        default: {
          return NextResponse.json(
            { error: `Unhandled set_type: ${blockType}` },
            { status: 500 }
          )
        }
      }

    // Golden Logging Flow: include RPE in the insert if provided (1-10)
    if (incomingRpe !== undefined && incomingRpe !== null) {
      const rpeNum = Number(incomingRpe)
      if (!isNaN(rpeNum) && Number.isInteger(rpeNum) && rpeNum >= 1 && rpeNum <= 10) {
        insertData.rpe = rpeNum
      }
    }

    // Golden Logging Flow: Server-side dedupe by natural key
    // If idempotency_key is provided, check for an existing row matching
    // (workout_log_id, set_entry_id, exercise_id, set_number) before inserting.
    if (idempotency_key && workoutLogId && insertData.set_number != null) {
      const dedupeQuery = supabaseAdmin
        .from('workout_set_logs')
        .select('id')
        .eq('workout_log_id', workoutLogId)
        .eq('set_entry_id', set_entry_id)
        .eq('set_number', insertData.set_number)

      // exercise_id may be null for some block types
      if (insertData.exercise_id) {
        dedupeQuery.eq('exercise_id', insertData.exercise_id)
      }

      const { data: rawExisting } = await dedupeQuery.limit(1)
      const existingRows = rawExisting as { id: string }[] | null

      if (existingRows && existingRows.length > 0) {
        return NextResponse.json({
          success: true,
          set_log_id: existingRows[0].id,
          workout_log_id: workoutLogId ?? null,
          deduplicated: true,
          message: 'Set already logged (deduplicated)',
        }, {
          status: 200,
          headers: perf.getHeaders(),
        })
      }
    }

    const { data: insertedData, error: logError } = await (supabaseAdmin as any)
      .from('workout_set_logs')
      .insert([insertData])
      .select('id')
      .single()

    if (logError) {
      console.error('❌ Error logging set to workout_set_logs:', {
        error: logError,
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint,
        insert_data_keys: Object.keys(insertData),
      });
      return NextResponse.json(
        { 
          error: 'Failed to log set',
          details: logError.message,
          code: logError.code,
          hint: logError.hint,
          attempted_insert: {
            set_type: blockType,
            set_entry_id,
            has_exercise_id: !!insertData.exercise_id,
            has_weight: insertData.weight !== undefined,
            has_reps: insertData.reps !== undefined,
          }
        },
        { status: 400 }
      )
    }

    // Calculate estimated 1RM using Epley formula for supported block types
    let e1rm = 0
    const shouldCalculateE1RM =
      primaryExerciseId &&
      primaryWeight &&
      primaryReps &&
      ['straight_set', 'superset', 'dropset', 'cluster_set', 'rest_pause'].includes(blockType)

    if (shouldCalculateE1RM && primaryWeight !== null && primaryReps !== null) {
      // e1RM = weight × (1 + 0.0333 × reps)
      e1rm = primaryWeight * (1 + 0.0333 * primaryReps)
    }

    type PerformanceEntry = {
      exercise_id: string
      weight: number
      reps: number
    }

    const performanceEntries: PerformanceEntry[] = []
    const addPerformanceEntry = (
      exerciseId: any,
      weightVal: number | null,
      repsVal: number | null
    ) => {
      if (!exerciseId || weightVal === null || repsVal === null) return
      if (weightVal <= 0 || repsVal <= 0) return
      performanceEntries.push({
        exercise_id: String(exerciseId),
        weight: weightVal,
        reps: repsVal,
      })
    }

    switch (blockType) {
      case 'straight_set':
        addPerformanceEntry(body.exercise_id, parseNumber(body.weight), parseIntNumber(body.reps))
        break
      case 'superset':
        addPerformanceEntry(body.superset_exercise_a_id, parseNumber(body.superset_weight_a), parseIntNumber(body.superset_reps_a))
        addPerformanceEntry(body.superset_exercise_b_id, parseNumber(body.superset_weight_b), parseIntNumber(body.superset_reps_b))
        break
      case 'giant_set': {
        const giantExercises = Array.isArray(body.giant_set_exercises)
          ? body.giant_set_exercises
          : []
        for (const ex of giantExercises) {
          addPerformanceEntry(ex.exercise_id, parseNumber(ex.weight), parseIntNumber(ex.reps))
        }
        break
      }
      case 'dropset':
        addPerformanceEntry(body.exercise_id, parseNumber(body.dropset_initial_weight), parseIntNumber(body.dropset_initial_reps))
        break
      case 'cluster_set':
        addPerformanceEntry(body.exercise_id, parseNumber(body.weight), parseIntNumber(body.reps))
        break
      case 'rest_pause':
        addPerformanceEntry(body.exercise_id, parseNumber(body.rest_pause_initial_weight), parseIntNumber(body.rest_pause_initial_reps))
        break
      case 'preexhaust':
        addPerformanceEntry(body.preexhaust_isolation_exercise_id, parseNumber(body.preexhaust_isolation_weight), parseIntNumber(body.preexhaust_isolation_reps))
        addPerformanceEntry(body.preexhaust_compound_exercise_id, parseNumber(body.preexhaust_compound_weight), parseIntNumber(body.preexhaust_compound_reps))
        break
      case 'amrap':
        addPerformanceEntry(body.exercise_id, parseNumber(body.weight), parseIntNumber(body.amrap_total_reps))
        break
      case 'emom': {
        const repsPerRound = parseIntNumber(body.emom_reps_per_round ?? body.emom_target_reps)
        addPerformanceEntry(body.exercise_id, parseNumber(body.weight), repsPerRound)
        break
      }
      case 'fortime': {
        const targetReps =
          parseIntNumber(body.fortime_target_reps) ??
          parseIntNumber(body.fortime_total_reps)
        addPerformanceEntry(body.exercise_id, parseNumber(body.weight), targetReps)
        break
      }
      case 'tabata':
      case 'hr_sets':
        break
      default:
        break
    }

    let metricsError: string | null = null
    let finalE1RM = e1rm || 0
    let e1rmAction = 'calculated'
    let e1rmUpdated = false

    const exerciseIdsForMetrics = new Set<string>()
    if (primaryExerciseId) exerciseIdsForMetrics.add(primaryExerciseId)
    for (const entry of performanceEntries) {
      exerciseIdsForMetrics.add(entry.exercise_id)
    }

    const existingMetricsByExercise = new Map<string, any>()
    if (exerciseIdsForMetrics.size > 0) {
      const { data: existingMetrics, error: fetchError } = await supabaseAdmin
        .from('user_exercise_metrics')
        .select(
          'user_id, exercise_id, estimated_1rm, best_weight, best_reps, best_volume, best_volume_weight, best_volume_reps'
        )
        .eq('user_id', userId)
        .in('exercise_id', Array.from(exerciseIdsForMetrics))

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching metrics:', fetchError)
        metricsError = fetchError.message
      } else {
        ;(existingMetrics || []).forEach((row: any) => {
          existingMetricsByExercise.set(row.exercise_id, row)
        })
      }
    }

    const updatedMetricsByExercise = new Map<string, any>()
    const prResults: Array<{
      exercise_id: string
      weight_pr: boolean
      volume_pr: boolean
      weight: number
      reps: number
      volume: number
    }> = []

    for (const entry of performanceEntries) {
      const existing = existingMetricsByExercise.get(entry.exercise_id)
      const existingBestWeight = existing?.best_weight ?? null
      const existingBestReps = existing?.best_reps ?? null
      const existingBestVolume = existing?.best_volume ?? null
      const existingBestVolumeWeight = existing?.best_volume_weight ?? null
      const existingBestVolumeReps = existing?.best_volume_reps ?? null

      let weightPR = false
      let volumePR = false
      let bestWeight = existingBestWeight
      let bestReps = existingBestReps
      let bestVolume = existingBestVolume
      let bestVolumeWeight = existingBestVolumeWeight
      let bestVolumeReps = existingBestVolumeReps

      if (
        bestWeight === null ||
        entry.weight > bestWeight ||
        (entry.weight === bestWeight && entry.reps > (bestReps ?? 0))
      ) {
        bestWeight = entry.weight
        bestReps = entry.reps
        weightPR = true
      }

      const volume = entry.weight * entry.reps
      if (bestVolume === null || volume > bestVolume) {
        bestVolume = volume
        bestVolumeWeight = entry.weight
        bestVolumeReps = entry.reps
        volumePR = true
      }

      updatedMetricsByExercise.set(entry.exercise_id, {
        user_id: userId,
        exercise_id: entry.exercise_id,
        estimated_1rm: existing?.estimated_1rm ?? null,
        best_weight: bestWeight,
        best_reps: bestReps,
        best_volume: bestVolume,
        best_volume_weight: bestVolumeWeight,
        best_volume_reps: bestVolumeReps,
        updated_at: new Date().toISOString(),
      })

      prResults.push({
        exercise_id: entry.exercise_id,
        weight_pr: weightPR,
        volume_pr: volumePR,
        weight: entry.weight,
        reps: entry.reps,
        volume,
      })
    }

    if (shouldCalculateE1RM && primaryExerciseId) {
      const existing = existingMetricsByExercise.get(primaryExerciseId)
      const existingE1RM = existing?.estimated_1rm ?? null
      if (!existingE1RM || e1rm > existingE1RM) {
        const existingRecord = updatedMetricsByExercise.get(primaryExerciseId) || {
          user_id: userId,
          exercise_id: primaryExerciseId,
          best_weight: existing?.best_weight ?? null,
          best_reps: existing?.best_reps ?? null,
          best_volume: existing?.best_volume ?? null,
          best_volume_weight: existing?.best_volume_weight ?? null,
          best_volume_reps: existing?.best_volume_reps ?? null,
        }
        updatedMetricsByExercise.set(primaryExerciseId, {
          ...existingRecord,
          estimated_1rm: e1rm,
          updated_at: new Date().toISOString(),
        })
        finalE1RM = e1rm
        e1rmAction = existingE1RM ? 'updated' : 'inserted'
        e1rmUpdated = true
      } else {
        finalE1RM = existingE1RM
        e1rmAction = 'kept_existing'
      }
    }

    if (updatedMetricsByExercise.size > 0) {
      try {
        const upsertData = Array.from(updatedMetricsByExercise.values())
        const { error: upsertError } = await (supabaseAdmin as any)
          .from('user_exercise_metrics')
          .upsert(upsertData, { onConflict: 'user_id,exercise_id' })

        if (upsertError) {
          console.error('Error upserting metrics:', upsertError)
          metricsError = upsertError.message
        }
      } catch (metricsErr) {
        console.error('Unexpected error updating metrics:', metricsErr)
        metricsError = metricsErr instanceof Error ? metricsErr.message : String(metricsErr)
      }
    }

    // Step 6: Sync strength goals if e1RM was updated (non-blocking)
    if (shouldCalculateE1RM && primaryExerciseId && e1rmUpdated) {
      try {
        const { syncStrengthGoal } = await import('@/lib/goalSyncService')
        const { data: rawEx } = await supabaseAdmin
          .from('exercises')
          .select('id, name')
          .eq('id', primaryExerciseId)
          .single()
        const exercise = rawEx as { id: string; name: string } | null

        if (exercise) {
          const { data: strengthGoals } = await (supabaseAdmin as any)
            .from('goals')
            .select('id, title')
            .eq('client_id', userId)
            .eq('status', 'active')
            .or(`title.ilike.%${exercise.name}%,title.ilike.%bench%,title.ilike.%squat%,title.ilike.%deadlift%,title.ilike.%hip thrust%`)

          if (strengthGoals && strengthGoals.length > 0) {
            for (const goal of strengthGoals) {
              const goalTitleLower = goal.title.toLowerCase()
              const exerciseNameLower = exercise.name.toLowerCase()
              if (
                goalTitleLower.includes(exerciseNameLower) ||
                (exerciseNameLower.includes('bench') && goalTitleLower.includes('bench')) ||
                (exerciseNameLower.includes('squat') && goalTitleLower.includes('squat')) ||
                (exerciseNameLower.includes('deadlift') && goalTitleLower.includes('deadlift')) ||
                (exerciseNameLower.includes('hip') && goalTitleLower.includes('hip'))
              ) {
                await syncStrengthGoal(goal.id, userId, primaryExerciseId)
              }
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to sync strength goals (non-blocking):', syncError)
      }
    }

    const anyWeightPR = prResults.some((r) => r.weight_pr)
    const anyVolumePR = prResults.some((r) => r.volume_pr)
    const prMessage = anyWeightPR && anyVolumePR
      ? 'New weight and volume PR!'
      : anyWeightPR
      ? 'New weight PR!'
      : anyVolumePR
      ? 'New volume PR!'
      : null

    // Step 6.5: Check and store PRs in personal_records table (non-blocking)
    const storedPRResults: Array<{ exercise_id: string; exercise_name: string; prResult: any }> = []
    if (primaryExerciseId && primaryWeight && primaryReps) {
      try {
        const { checkAndStorePR } = await import('@/lib/prService')
        const { data: rawExercise } = await supabaseAdmin
          .from('exercises')
          .select('id, name')
          .eq('id', primaryExerciseId)
          .single()
        const exercise = rawExercise as { id: string; name: string } | null

        if (exercise) {
          // Get workout_assignment_id from workout_log_id if available
          let workoutAssignmentId: string | undefined = undefined
          if (workoutLogId) {
            const { data: rawWl } = await supabaseAdmin
              .from('workout_logs')
              .select('workout_assignment_id')
              .eq('id', workoutLogId)
              .single()
            const workoutLog = rawWl as { workout_assignment_id: string | null } | null
            workoutAssignmentId = workoutLog?.workout_assignment_id || undefined
          }
          
          const prResult = await checkAndStorePR(userId, {
            exercise_id: primaryExerciseId,
            weight: primaryWeight,
            reps: primaryReps,
            workout_assignment_id: workoutAssignmentId,
            completed_at: insertData.completed_at || new Date().toISOString(),
          })
          if (prResult?.isNewPR) {
            storedPRResults.push({
              exercise_id: primaryExerciseId,
              exercise_name: exercise.name,
              prResult,
            })
          }
        }
      } catch (prError) {
        console.error('Failed to check/store PR (non-blocking):', prError)
      }
    }

    // Step 7: Return success (set logging succeeded, metrics update may have warnings)
    // Include set_log_id and workout_log_id at top level for RPE modal and Undo (set correction)
    const setLogId = insertedData?.id ?? null;
    
    const response: any = {
      success: true,
      set_log_id: setLogId,
      workout_log_id: workoutLogId ?? null,
      set_type: blockType,
      set_logged: insertData || {
        workout_log_id: workoutLogId || null,
        set_entry_id,
        set_type: blockType,
      },
      e1rm: {
        calculated: parseFloat(e1rm.toFixed(2)),
        stored: parseFloat(finalE1RM.toFixed(2)),
        action: e1rmAction,
        is_new_pr: e1rmUpdated,
      },
      pr: {
        any_weight_pr: anyWeightPR,
        any_volume_pr: anyVolumePR,
        results: prResults,
        message: prMessage,
        stored_prs: storedPRResults,
      },
    }

    if (metricsError) {
      response.pr.warning = `Performance PRs may not have been saved: ${metricsError}`
    }

    response.message = prMessage || 'Set logged!'

    // Log performance summary
    perf.logSummary()
    
    // Create response with Server-Timing header
    const jsonResponse = NextResponse.json(response, { status: 200 })
    const perfHeaders = perf.getHeaders()
    Object.entries(perfHeaders).forEach(([key, value]) => {
      jsonResponse.headers.set(key, value)
    })
    
    return jsonResponse
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to log workout set')
  }
}
