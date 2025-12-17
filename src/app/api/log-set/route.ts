import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use service role key for admin operations, fallback to anon key
// Note: Service role key bypasses RLS. If not set, anon key will be subject to RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Warn if service role key is not set (will be subject to RLS)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - using anon key (subject to RLS policies)')
}

export async function POST(req: NextRequest) {
  console.log("📥 /api/log-set called");
  
  try {
    // Parse request body - support both old format (backwards compatible) and new format
    let body: any;
    try {
      body = await req.json();
      console.log("📦 Request body parsed successfully");
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return NextResponse.json(
        { 
          error: "Invalid JSON in request body",
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
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
      // Backwards compatible fields
      access_token,
      session_id,
      template_exercise_id,
    } = body

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
      has_access_token: !!access_token,
    });

    // Determine user ID - prioritize client_id, then auth token
    let userId: string | null = client_id || null
    
    if (!userId) {
      console.warn("⚠️ No client_id provided, trying access_token...");
    } else {
      console.log("✅ Using client_id:", userId);
    }
    
    // If access_token provided and no client_id, authenticate to get user
    if (!userId && access_token) {
      console.log("🔐 Authenticating with access_token...");
      try {
        const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: {
            headers: {
              Authorization: `Bearer ${access_token}`
            }
          }
        })
        
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError) {
          console.error("❌ Auth error:", authError);
        } else if (user) {
          userId = user.id;
          console.log("✅ Authenticated user:", userId);
        } else {
          console.warn("⚠️ No user returned from auth");
        }
      } catch (authErr) {
        console.error("❌ Error during authentication:", authErr);
      }
    }

    if (!userId) {
      console.error("❌ Missing client_id or access_token - cannot determine user");
      return NextResponse.json(
        { 
          error: 'Unauthorized - Missing client_id or access_token',
          details: 'Either client_id must be provided in request body, or access_token must be valid'
        },
        { status: 401 }
      )
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
      'pyramid_set',
      'ladder',
    ] as const

    type BlockType = (typeof validBlockTypes)[number]

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

      console.log('🔍 Checking for existing workout_log:', {
        client_id: userId,
        workout_assignment_id: workout_assignment_id,
        timestamp: new Date().toISOString(),
      });

      // ✅ Check if workout_log already exists for this assignment (and is not completed)
      const { data: existingLog, error: existingError } = await supabaseAdmin
        .from('workout_logs')
        .select('id, started_at, completed_at')
        .eq('client_id', userId)
        .eq('workout_assignment_id', workout_assignment_id)
        .is('completed_at', null)  // Only active (not completed) logs
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔴 DEBUG: Query result for existing log:', {
        existingLog: existingLog ? { id: existingLog.id, started_at: existingLog.started_at } : null,
        hasError: !!existingError,
        errorCode: existingError?.code,
        errorMessage: existingError?.message,
        errorDetails: existingError?.details,
        errorHint: existingError?.hint,
      });

      // Also check how many total logs exist for this assignment (for debugging)
      const { data: allLogsForAssignment, count } = await supabaseAdmin
        .from('workout_logs')
        .select('id, started_at, completed_at', { count: 'exact' })
        .eq('client_id', userId)
        .eq('workout_assignment_id', workout_assignment_id)
        .order('started_at', { ascending: false })
        .limit(10);

      console.log('🔴 DEBUG: All logs for this assignment:', {
        totalCount: count,
        activeLogs: allLogsForAssignment?.filter(l => !l.completed_at).length || 0,
        completedLogs: allLogsForAssignment?.filter(l => l.completed_at).length || 0,
        recentLogs: allLogsForAssignment?.slice(0, 5).map(l => ({
          id: l.id,
          started_at: l.started_at,
          completed_at: l.completed_at,
        })),
      });

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, but other errors are not
        console.error('❌ Error checking for existing workout_log:', existingError);
      }

      if (existingLog) {
        // ✅ Reuse existing log
        console.log('✅ Found existing workout_log, reusing:', existingLog.id);
        workoutLogId = existingLog.id;
      } else {
        // ✅ Create new log only if none exists
        console.log('📝 No existing log found, creating new workout_log');
        
        const { data: newLog, error: createError } = await supabaseAdmin
          .from('workout_logs')
          .insert([
            {
              client_id: userId,
              workout_assignment_id: workout_assignment_id,
              started_at: new Date().toISOString(),
              completed_at: null,
            },
          ])
          .select('id, workout_assignment_id')
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
        });
        workoutLogId = newLog.id;
      }
    } else {
      console.log("✅ Using existing workout_log_id:", workoutLogId);
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

    // Build insert data - workout_log_id is optional, block_id is required
    const insertData: any = {
      client_id: userId,
      block_id,
      block_type: blockType,
      completed_at: new Date().toISOString(),
    }

    // Add notes only if the column exists in the schema (optional field)
    // Note: Remove this if notes column doesn't exist in workout_set_logs
    // if (notes) {
    //   insertData.notes = notes
    // }

    // Add workout_log_id if available (optional)
    if (workoutLogId) {
      insertData.workout_log_id = workoutLogId
    }

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
    
    switch (blockType) {
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
          insertData.weight = parseNumber(body.weight)
          insertData.rest_pause_initial_weight = parseNumber(body.rest_pause_initial_weight)
          insertData.rest_pause_initial_reps = parseIntNumber(body.rest_pause_initial_reps)
          insertData.rest_pause_reps_after = parseIntNumber(body.rest_pause_reps_after)
          insertData.rest_pause_number = body.rest_pause_number || 1
          insertData.set_number = body.set_number || 1

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

        case 'pyramid_set': {
          insertData.exercise_id = body.exercise_id
          insertData.weight = parseNumber(body.weight)
          insertData.reps = parseIntNumber(body.reps)
          insertData.pyramid_step_number = body.pyramid_step_number

          primaryExerciseId = body.exercise_id || null
          primaryWeight = parseNumber(body.weight)
          primaryReps = parseIntNumber(body.reps)
          break
        }

        case 'ladder': {
          insertData.exercise_id = body.exercise_id
          insertData.weight = parseNumber(body.weight)
          insertData.reps = parseIntNumber(body.reps)
          insertData.ladder_rung_number = body.ladder_rung_number
          insertData.ladder_round_number = body.ladder_round_number

          primaryExerciseId = body.exercise_id || null
          primaryWeight = parseNumber(body.weight)
          primaryReps = parseIntNumber(body.reps)
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

    if (shouldCalculateE1RM) {
      // e1RM = weight × (1 + 0.0333 × reps)
      e1rm = primaryWeight * (1 + 0.0333 * primaryReps)
    }

    // Step 4: Calculate and update e1RM (non-blocking - set logging succeeds even if this fails)
    // Only attempt e1RM update if we have valid data for calculation
    let finalE1RM = e1rm || 0
    let action = 'calculated'
    let isNewPR = false
    let metricsError: string | null = null

    if (shouldCalculateE1RM && primaryExerciseId) {
      try {
        // Use upsert to handle insert-or-update atomically
        // This prevents race conditions and duplicate key errors
        // We'll check the existing value first to determine if it's a PR
        
        // First, check if record exists and get current value
        const { data: existingMetrics, error: fetchError } = await supabaseAdmin
          .from('user_exercise_metrics')
          .select('estimated_1rm')
          .eq('user_id', userId)
          .eq('exercise_id', primaryExerciseId)
          .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if no record exists
        console.error('Error fetching metrics:', fetchError)
        metricsError = fetchError.message
      } else {
        const existingE1RM = existingMetrics?.estimated_1rm || null
        const shouldUpdate = !existingE1RM || e1rm > existingE1RM

        if (shouldUpdate) {
          // Use upsert to insert or update atomically
          // onConflict handles the unique constraint (user_id, exercise_id)
          const upsertData = {
            user_id: userId,
            exercise_id: primaryExerciseId,
            estimated_1rm: e1rm,
            updated_at: new Date().toISOString(),
          }

          // Log whether we're using service role key
          const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!usingServiceKey) {
            console.warn('⚠️ API log-set: SUPABASE_SERVICE_ROLE_KEY not set - using anon key (subject to RLS)')
          }

          console.log('API log-set: Attempting to upsert user_exercise_metrics:', {
            user_id: userId,
            exercise_id: primaryExerciseId,
            estimated_1rm: e1rm,
            existingE1RM,
            usingServiceKey,
          })

          const { data: upsertedData, error: upsertError } = await supabaseAdmin
            .from('user_exercise_metrics')
            .upsert(
              upsertData,
              {
                onConflict: 'user_id,exercise_id',
                // Only update if the new e1RM is higher (handled by our check above)
              }
            )
            .select('estimated_1rm')
            .single()

          if (upsertError) {
            console.error('Error upserting metrics:', {
              error: upsertError,
              code: upsertError.code,
              message: upsertError.message,
              details: upsertError.details,
              hint: upsertError.hint,
              usingServiceKey,
            })
            metricsError = upsertError.message
            
            // If RLS error, provide helpful message but don't fail the request
            if (upsertError.message?.includes('row-level security')) {
              if (!usingServiceKey) {
                console.warn('⚠️ RLS policy violation - set SUPABASE_SERVICE_ROLE_KEY in environment variables to bypass RLS policies')
              } else {
                console.error('⚠️ RLS policy violation even with service role key - check RLS policies or key configuration')
              }
            }
          } else {
            // Successfully upserted
            if (existingE1RM) {
              // Updated existing record (PR)
              action = 'updated'
              finalE1RM = e1rm
              isNewPR = true
            } else {
              // Inserted new record
              action = 'inserted'
              finalE1RM = e1rm
            }
          }
        } else {
          // Not a PR - keep existing value
          finalE1RM = existingE1RM
          action = 'kept_existing'
        }
        }
      } catch (metricsErr) {
        console.error('Unexpected error updating metrics:', metricsErr)
        metricsError = metricsErr instanceof Error ? metricsErr.message : String(metricsErr)
        // Continue - set was logged successfully, just couldn't update metrics
      }
    }

    // Step 6: Sync strength goals if e1RM was updated (non-blocking)
    if (shouldCalculateE1RM && primaryExerciseId && (action === 'updated' || action === 'inserted')) {
      try {
        const { syncStrengthGoal } = await import('@/lib/goalSyncService')
        
        // Find all strength goals for this client with this exercise
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

          // Sync each matching goal
          if (strengthGoals && strengthGoals.length > 0) {
            for (const goal of strengthGoals) {
              // Only sync if goal title matches exercise name
              const goalTitleLower = goal.title.toLowerCase()
              const exerciseNameLower = exercise.name.toLowerCase()
              
              if (goalTitleLower.includes(exerciseNameLower) || 
                  (exerciseNameLower.includes('bench') && goalTitleLower.includes('bench')) ||
                  (exerciseNameLower.includes('squat') && goalTitleLower.includes('squat')) ||
                  (exerciseNameLower.includes('deadlift') && goalTitleLower.includes('deadlift')) ||
                  (exerciseNameLower.includes('hip') && goalTitleLower.includes('hip'))) {
                await syncStrengthGoal(goal.id, userId, primaryExerciseId)
              }
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to sync strength goals (non-blocking):', syncError)
        // Don't fail the request, just log error
      }
    }

    // Step 7: Return success (set logging succeeded, e1RM update may have warnings)
    const response: any = {
      success: true,
      block_type: blockType,
      set_logged: insertData || {
        workout_log_id: workoutLogId || null,
        block_id,
        block_type: blockType,
      },
      e1rm: {
        calculated: parseFloat(e1rm.toFixed(2)),
        stored: parseFloat(finalE1RM.toFixed(2)),
        action,
        is_new_pr: isNewPR,
      },
    }

    // Add message based on action
    if (metricsError) {
      response.e1rm.warning = `e1RM calculated but not saved: ${metricsError}`
      response.message = `Set logged! Estimated 1RM: ${e1rm.toFixed(2)}kg (not saved due to error)`
    } else {
      response.message =
        action === 'updated'
          ? `New personal record! ${finalE1RM.toFixed(2)}kg`
          : action === 'kept_existing'
          ? `Good effort! Best remains ${finalE1RM.toFixed(2)}kg`
          : action === 'inserted'
          ? `First set logged! Estimated 1RM: ${finalE1RM.toFixed(2)}kg`
          : `Set logged! Estimated 1RM: ${finalE1RM.toFixed(2)}kg`
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Unexpected error in /api/log-set:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : typeof error,
      },
      { status: 500 }
    )
  }
}
