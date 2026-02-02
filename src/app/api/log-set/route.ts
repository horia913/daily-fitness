import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import { createErrorResponse, handleApiError, validateRequiredFields } from '@/lib/apiErrorHandler'
import { createForbiddenResponse } from '@/lib/apiAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(req: NextRequest) {
  // Initialize performance collector for Server-Timing header
  const perf = new PerfCollector('/api/log-set')
  
  console.log("📥 /api/log-set called");
  
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await perf.time('auth', () => 
      supabaseAuth.auth.getUser()
    )
    if (authError || !user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AuthMissing]', {
          route: '/api/log-set',
          reason: authError?.message || 'no_user',
        })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
    let supabaseAdmin: any = null
    // Parse request body - support both old format (backwards compatible) and new format
    let body: any;
    try {
      body = await req.json();
      console.log("📦 Request body parsed successfully");
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return createErrorResponse(
        "Invalid JSON in request body",
        parseError instanceof Error ? parseError.message : String(parseError),
        'PARSE_ERROR',
        400
      );
    }
    
    // Debug logging - comprehensive request body inspection
    console.log("📦 Request body:", {
      exercise_id: body.exercise_id,
      weight: body.weight,
      reps: body.reps,
      block_id: body.block_id,
      client_id: body.client_id,
      workout_assignment_id: body.workout_assignment_id,
      block_type: body.block_type,
      exercise_id_type: typeof body.exercise_id,
      weight_type: typeof body.weight,
      reps_type: typeof body.reps,
      has_exercise_id: !!body.exercise_id,
      has_weight: !!body.weight,
      has_reps: !!body.reps,
      has_block_id: !!body.block_id,
      has_client_id: !!body.client_id,
      has_workout_assignment_id: !!body.workout_assignment_id,
      all_keys: Object.keys(body),
    })
    
    const {
      workout_log_id,
      block_id,
      client_id,
      notes,
      block_type: incomingBlockType,
      workout_assignment_id,
      session_id, // workout_sessions.id - used to link workout_logs
      template_exercise_id,
    } = body

    // Validate session_id is a valid UUID if provided
    const isValidUuid = (value: string | null | undefined): boolean => {
      if (!value) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    };
    const validSessionId = isValidUuid(session_id) ? session_id : null;

    console.log("📥 /api/log-set received:", {
      workout_assignment_id,
      block_id,
      client_id,
      has_workout_log_id: !!workout_log_id,
    });

    console.log("🔍 Extracted parameters:", {
      has_workout_log_id: !!workout_log_id,
      has_block_id: !!block_id,
      has_client_id: !!client_id,
      has_workout_assignment_id: !!workout_assignment_id,
      block_type: incomingBlockType,
    });

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
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      console.log("🔍 Validating block_type:", incomingBlockType);
      if (!validBlockTypes.includes(incomingBlockType)) {
        console.error("❌ Invalid block_type:", incomingBlockType, "Valid types:", validBlockTypes);
        return NextResponse.json(
          { 
            error: `Invalid block_type: ${incomingBlockType}`,
            details: `Must be one of: ${validBlockTypes.join(", ")}`,
            received: incomingBlockType
          },
          { status: 400 }
        )
      }
      blockType = incomingBlockType;
      console.log("✅ Using block_type:", blockType);
    } else {
      console.log("⚠️ No block_type provided, defaulting to straight_set");
    }

    // Step 1: Get or create workout_log_id (REQUIRED for workout_set_logs)
    // workout_logs table is for session summary, NOT individual sets
    // Individual sets go to workout_set_logs table, but they require a workout_log_id
    let workoutLogId = workout_log_id

    console.log("🔍 Step 1: Getting/creating workout_log_id");
    console.log("  - Provided workout_log_id:", workoutLogId || "none");

    // If workout_log_id not provided, check for existing one or create a new one
    // workout_assignment_id is REQUIRED (NOT NULL constraint)
    if (!workoutLogId) {
      console.log("  - workout_log_id not provided, checking for existing or creating new one");
      
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
        const { data: workoutLog, error: logError } = await supabaseAdmin
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
        console.log('✅ Resolved workout_assignment_id from workout_log:', actualWorkoutAssignmentId);
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
      const { data: workoutAssignment, error: assignmentError } = await supabaseAdmin
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

      console.log('✅ Validated workout_assignment:', {
        id: workoutAssignment.id,
        workout_template_id: workoutAssignment.workout_template_id,
      });
      
      console.log('🔍 Checking for existing workout_log:', {
        client_id: userId,
        workout_assignment_id: actualWorkoutAssignmentId,
        original_assignment_id: workout_assignment_id,
        timestamp: new Date().toISOString(),
      });

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

      console.log('🔴 DEBUG: Query result for existing log:', {
        existingLog: existingLog ? { id: existingLog.id, started_at: existingLog.started_at, workout_session_id: existingLog.workout_session_id } : null,
        hasError: !!existingError,
        errorCode: existingError?.code,
        errorMessage: existingError?.message,
        errorDetails: existingError?.details,
        errorHint: existingError?.hint,
        queriedWithSessionId: validSessionId,
      });

      // Fallback: If no log found for this session, check for any active log without session linkage
      let finalExistingLog = existingLog;
      if (!existingLog && validSessionId) {
        const { data: unlinkedLog, error: unlinkedError } = await supabaseAdmin
          .from('workout_logs')
          .select('id, started_at, completed_at, workout_session_id')
          .eq('client_id', userId)
          .eq('workout_assignment_id', actualWorkoutAssignmentId)
          .is('completed_at', null)
          .is('workout_session_id', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (unlinkedLog && !unlinkedError) {
          // Link this existing unlinked log to the session
          console.log('🔗 Found unlinked workout_log, linking to session:', {
            logId: unlinkedLog.id,
            sessionId: validSessionId,
          });
          const { error: linkError } = await supabaseAdmin
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

      console.log('🔴 DEBUG: All logs for this assignment:', {
        totalCount: count,
        activeLogs: logsForAssignment.filter(l => !l.completed_at).length,
        completedLogs: logsForAssignment.filter(l => l.completed_at).length,
        recentLogs: logsForAssignment.slice(0, 5).map(l => ({
          id: l.id,
          started_at: l.started_at,
          completed_at: l.completed_at,
        })),
      });

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, but other errors are not
        console.error('❌ Error checking for existing workout_log:', existingError);
      }

      if (finalExistingLog) {
        // ✅ Reuse existing log
        console.log('✅ Found existing workout_log, reusing:', finalExistingLog.id);
        workoutLogId = finalExistingLog.id;
      } else {
        // ✅ Create new log only if none exists
        console.log('📝 No existing log found, creating new workout_log');
        
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
          console.log('🔗 Linking new workout_log to session:', validSessionId);
        }

        const { data: newLog, error: createError } = await supabaseAdmin
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

        console.log('✅ Created new workout_log:', {
          id: newLog.id,
          workout_assignment_id: newLog.workout_assignment_id,
          workout_session_id: newLog.workout_session_id,
        });
        workoutLogId = newLog.id;
      }
    } else {
      console.log("✅ Using existing workout_log_id:", workoutLogId);
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

    // Step 2: Build insert payload based on block_type and log to workout_set_logs
    console.log("🔍 Step 2: Building insert payload for workout_set_logs");
    
    let primaryExerciseId: string | null = null
    let primaryWeight: number | null = null
    let primaryReps: number | null = null

    // Validate that we have at least block_id (required for workout_set_logs)
    if (!block_id) {
      console.error("❌ Missing required field: block_id");
      return NextResponse.json(
        { 
          error: 'Missing required field: block_id',
          details: 'block_id is required for workout_set_logs table'
        },
        { status: 400 }
      )
    }
    
    console.log("✅ block_id validated:", block_id);
    console.log("✅ workout_log_id validated:", workoutLogId);

    // Build insert data - workout_log_id is REQUIRED (NOT NULL constraint)
    const insertData: any = {
      client_id: userId,
      block_id,
      workout_log_id: workoutLogId, // REQUIRED - always set at this point
      block_type: blockType,
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

    console.log("🔍 Processing block_type:", blockType);
    
    const blockTypeForPerformance = blockType as BlockType | 'hr_sets'

    switch (blockTypeForPerformance) {
        case 'straight_set': {
          console.log("  - Processing straight_set");
          const exerciseId = body.exercise_id as string | undefined
          const weightNum = parseNumber(body.weight)
          const repsNum = parseIntNumber(body.reps)

          console.log("  - Validation:", {
            has_exercise_id: !!exerciseId,
            exercise_id: exerciseId,
            weight: weightNum,
            reps: repsNum,
            weight_raw: body.weight,
            reps_raw: body.reps,
          });

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
          
          console.log("✅ straight_set validation passed");

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
          primaryExerciseId = body.superset_exercise_a_id || null
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
            { error: `Unhandled block_type: ${blockType}` },
            { status: 500 }
          )
        }
      }

    // Log the insert data for debugging
    console.log('💾 Step 3: Inserting to workout_set_logs:', {
      block_type: blockType,
      block_id,
      workout_log_id: workoutLogId || 'null',
      client_id: userId,
      has_exercise_id: !!insertData.exercise_id,
      insert_keys: Object.keys(insertData),
      insert_data_sample: {
        ...insertData,
        // Don't log entire object if it's huge
        ...(insertData.giant_set_exercises ? { giant_set_exercises: '[JSONB data]' } : {}),
      },
    })

    const { data: insertedData, error: logError } = await supabaseAdmin
      .from('workout_set_logs')
      .insert([insertData])
      .select()

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
            block_type: blockType,
            block_id,
            has_exercise_id: !!insertData.exercise_id,
            has_weight: insertData.weight !== undefined,
            has_reps: insertData.reps !== undefined,
          }
        },
        { status: 400 }
      )
    }
    
    console.log('✅ Successfully inserted to workout_set_logs');

    console.log('API log-set: Successfully inserted set log:', {
      inserted_count: insertedData?.length || 0,
      inserted_id: insertedData?.[0]?.id,
    })

    // Step 3: Calculate estimated 1RM using Epley formula for supported block types
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
        const { error: upsertError } = await supabaseAdmin
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
        const { data: exercise } = await supabaseAdmin
          .from('exercises')
          .select('id, name')
          .eq('id', primaryExerciseId)
          .single()

        if (exercise) {
          const { data: strengthGoals } = await supabaseAdmin
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

    // Step 7: Return success (set logging succeeded, metrics update may have warnings)
    // Include set_log_id for RPE modal to use
    const setLogId = insertedData?.[0]?.id || null;
    
    const response: any = {
      success: true,
      set_log_id: setLogId, // For RPE modal to update this set
      block_type: blockType,
      set_logged: insertData || {
        workout_log_id: workoutLogId || null,
        block_id,
        block_type: blockType,
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
  } catch (error) {
    return handleApiError(error, 'Failed to log workout set')
  }
}
