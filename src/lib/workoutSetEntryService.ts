import { supabase } from '@/lib/supabase'
import { adaptBlockRowToLegacy } from '@/lib/groupModel/adaptBlockRow'
import { fetchPrescriptionsBySlotIds } from '@/lib/groupModel/canvasLoad'
import type { GroupModelSlotWrite } from '@/lib/groupModel/types'
import {
  WorkoutSetEntry,
  WorkoutSetEntryExercise,
  SetType,
  WorkoutDropSet,
  WorkoutClusterSet,
  WorkoutRestPauseSet,
  WorkoutTimeProtocol,
  WorkoutSpeedSet,
  WorkoutEnduranceSet,
  LiveWorkoutSetEntry,
  LiveWorkoutExercise,
  LoggedSet
} from '@/types/workoutSetEntries'

const ALL_SET_ENTRY_CHILD_TABLES = [
  'workout_set_entry_exercises',
  'workout_drop_sets',
  'workout_cluster_sets',
  'workout_rest_pause_sets',
  'workout_time_protocols',
  'workout_speed_sets',
  'workout_endurance_sets',
] as const

/** Child tables touched per set type on template save (same-type updates only clear these). */
function childTablesForSetType(setType: string): string[] {
  switch (setType) {
    case 'straight_set':
    case 'superset':
    case 'giant_set':
    case 'pre_exhaustion':
    case 'timed_set':
      return ['workout_set_entry_exercises']
    case 'drop_set':
      return ['workout_set_entry_exercises', 'workout_drop_sets']
    case 'cluster_set':
      return ['workout_set_entry_exercises', 'workout_cluster_sets']
    case 'rest_pause':
      return ['workout_set_entry_exercises', 'workout_rest_pause_sets']
    case 'amrap':
    case 'emom':
    case 'for_time':
    case 'tabata':
      return ['workout_time_protocols']
    case 'speed_work':
      return ['workout_set_entry_exercises', 'workout_speed_sets']
    case 'endurance':
      return ['workout_set_entry_exercises', 'workout_endurance_sets']
    default:
      return [...ALL_SET_ENTRY_CHILD_TABLES]
  }
}

export class WorkoutSetEntryService {
  private static blocksCache = new Map<
    string,
    { data: WorkoutSetEntry[]; fetchedAt: number }
  >()
  private static readonly CACHE_TTL_MS = 30 * 1000

  /** Lite vs full payloads differ (special tables skipped in lite); never share one cache entry. */
  private static blocksCacheKey(templateId: string, lite: boolean): string {
    return `${templateId}:${lite ? 'lite' : 'full'}`
  }

  private static getCachedBlocks(
    templateId: string,
    lite: boolean
  ): WorkoutSetEntry[] | null {
    const key = this.blocksCacheKey(templateId, lite)
    const cached = this.blocksCache.get(key)
    if (!cached) return null
    if (Date.now() - cached.fetchedAt > this.CACHE_TTL_MS) {
      this.blocksCache.delete(key)
      return null
    }
    return cached.data
  }

  private static setCachedBlocks(
    templateId: string,
    lite: boolean,
    data: WorkoutSetEntry[]
  ) {
    this.blocksCache.set(this.blocksCacheKey(templateId, lite), {
      data,
      fetchedAt: Date.now(),
    })
  }

  /** Drop cached blocks so schedule/template edits refetch instead of reusing stale lite payloads */
  static clearBlocksCacheForTemplates(templateIds: string[]) {
    const ids = [...new Set(templateIds.filter(Boolean))]
    for (const id of ids) {
      this.blocksCache.delete(this.blocksCacheKey(id, true))
      this.blocksCache.delete(this.blocksCacheKey(id, false))
    }
  }

  /** Chunk array to avoid Supabase/Postgres statement timeouts on large .in() lists */
  private static readonly QUERY_CHUNK_SIZE = 50

  /** Unique id for dev timers so React Strict Mode double-invoke never reuses the same label */
  private static _runIdCounter = 0
  private static nextRunId(): string {
    return (++WorkoutSetEntryService._runIdCounter).toString(36)
  }

  private static chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size))
    }
    return out
  }

  private static async buildBlocksForTemplates(blocks: any[], options?: { lite?: boolean }): Promise<WorkoutSetEntry[]> {
    if (!blocks || blocks.length === 0) return []

    const allBlockIds = blocks.map((b: any) => b.id)
    if (allBlockIds.length === 0) return []

    // Group model: slots on workout_set_entry_exercises are the source of truth; satellite tables ignored.

    const safeQuery = async (
      queryFn: () => PromiseLike<{ data: any; error: any }>,
      tableName: string
    ) => {
      const attempt = async (): Promise<{ data: any[]; error: any }> => {
        try {
          const result = await queryFn()
          if (result.error) {
            if (
              result.error.code === '57014' ||
              result.error.message?.includes('timeout')
            ) {
              console.warn(
                `Query timeout for ${tableName} (skipping table):`,
                result.error.message
              )
            } else {
              console.error(`Error fetching ${tableName}:`, result.error)
            }
            return { data: [], error: result.error }
          }
          return { data: result.data || [], error: null }
        } catch (err) {
          console.error(`Error fetching ${tableName}:`, err)
          return { data: [], error: err }
        }
      }
      const first = await attempt()
      if (first.error) {
        const code = first.error?.code ?? first.error?.status ?? first.error?.statusCode
        const msg = (first.error?.message ?? '').toLowerCase()
        const is500 = code === 500 || code === '500' || msg.includes('internal server error')
        const isAuth = code === 401 || code === '401' || code === 'PGRST301' || msg.includes('jwt')
        if (is500 || isAuth) {
          await new Promise(r => setTimeout(r, 500))
          if (isAuth) {
            try { await supabase.auth.getSession() } catch {}
          }
          return attempt()
        }
      }
      return first
    }

    const buildRunId = this.nextRunId()
    const queryTableInChunks = async (
      tableName: string,
      select: string,
      blockIds: string[]
    ): Promise<{ data: any[]; error: any }> => {
      if (blockIds.length === 0) return { data: [], error: null }
      const chunks = this.chunk(blockIds, this.QUERY_CHUNK_SIZE)
      const label = `[buildBlocks] queryTableInChunks ${tableName} ${buildRunId}`
      if (process.env.NODE_ENV !== 'production') console.time(label)
      const chunkResults = await Promise.all(
        chunks.map((chunkIds) =>
          safeQuery(
            () =>
              supabase.from(tableName).select(select).in('set_entry_id', chunkIds),
            tableName
          )
        )
      )
      const allData: any[] = []
      for (const result of chunkResults) {
        if (result.data?.length) allData.push(...result.data)
        if (result.error && result.error.code !== '57014') {
          if (process.env.NODE_ENV !== 'production') console.timeEnd(label)
          return { data: allData, error: result.error }
        }
      }
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd(label)
        console.log(`[buildBlocks] queryTableInChunks ${tableName} ids=${blockIds.length} chunks=${chunks.length} rows=${allData.length}`)
      }
      return { data: allData, error: null }
    }

    const exercisesRes = await queryTableInChunks(
      'workout_set_entry_exercises',
      '*',
      allBlockIds,
    )

    const allExerciseIds = new Set<string>()
    for (const row of exercisesRes.data || []) {
      if (row.exercise_id) allExerciseIds.add(row.exercise_id)
    }

    const exercisesLabel = process.env.NODE_ENV !== 'production' ? `[buildBlocks] exercises ${buildRunId}` : ''
    if (process.env.NODE_ENV !== 'production') console.time(exercisesLabel)
    let exercisesData: any[] = []
    if (allExerciseIds.size > 0) {
      const ids = Array.from(allExerciseIds)
      const idChunks = this.chunk(ids, this.QUERY_CHUNK_SIZE)
      for (const idChunk of idChunks) {
        const { data } = await safeQuery(
          // `exercises` has `primary_muscle_group_id` (FK); resolve name via `muscle_groups` below (no `muscle_groups` column on exercises).
          () =>
            supabase
              .from('exercises')
              .select('id, name, description, video_url, primary_muscle_group_id')
              .in('id', idChunk),
          'exercises'
        )
        if (data?.length) exercisesData = exercisesData.concat(data)
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd(exercisesLabel)
      console.log('[buildBlocks] exercises ids=', allExerciseIds.size, 'rows=', exercisesData.length)
    }

    const muscleGroupNameById = new Map<string, string>()
    const muscleIds = [
      ...new Set(
        (exercisesData || [])
          .map((e: any) => e.primary_muscle_group_id)
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    if (muscleIds.length > 0) {
      const mgChunks = this.chunk(muscleIds, this.QUERY_CHUNK_SIZE)
      for (const chunk of mgChunks) {
        const { data: mgRows } = await safeQuery(
          () => supabase.from('muscle_groups').select('id, name').in('id', chunk),
          'muscle_groups'
        )
        ;(mgRows || []).forEach((mg: { id: string; name: string }) => {
          muscleGroupNameById.set(mg.id, mg.name)
        })
      }
    }

    const exercisesMap = new Map<string, any>()
    ;(exercisesData || []).forEach((ex: any) => {
      const primary_muscle_group = ex.primary_muscle_group_id
        ? muscleGroupNameById.get(ex.primary_muscle_group_id) ?? null
        : null
      exercisesMap.set(ex.id, { ...ex, primary_muscle_group })
    })

    const exercisesByBlock = new Map<string, any[]>()
    ;(exercisesRes.data || []).forEach((ex: any) => {
      if (!exercisesByBlock.has(ex.set_entry_id)) {
        exercisesByBlock.set(ex.set_entry_id, [])
      }
      const row = { ...ex, exercise: exercisesMap.get(ex.exercise_id) || null }
      exercisesByBlock.get(ex.set_entry_id)!.push(row)
    })

    const allSlotIds = (exercisesRes.data || []).map((ex: any) => ex.id).filter(Boolean)
    const prescriptionsBySlot = await fetchPrescriptionsBySlotIds(supabase, allSlotIds)
    for (const [blockId, slotRows] of exercisesByBlock) {
      exercisesByBlock.set(
        blockId,
        slotRows.map((row: any) => ({
          ...row,
          prescriptions: prescriptionsBySlot.get(row.id) ?? undefined,
        })),
      )
    }

    const enriched = (blocks || []).map((block: any) => {
      const slotRows = exercisesByBlock.get(block.id) || []
      return adaptBlockRowToLegacy(block, slotRows)
    })

    return enriched
  }

  // Create a new workout set entry
  static async createWorkoutBlock(
    templateId: string,
    setType: SetType,
    setOrder: number,
    setEntryData: Partial<WorkoutSetEntry>
  ): Promise<WorkoutSetEntry | null> {
    try {
      const insertData: any = {
        template_id: templateId,
        set_order: setOrder,
        set_type: setType,
      }

      if (setEntryData.set_name) insertData.set_name = setEntryData.set_name
      if (setEntryData.set_notes) insertData.set_notes = setEntryData.set_notes
      if (setEntryData.duration_seconds) insertData.duration_seconds = setEntryData.duration_seconds
      if (setEntryData.rest_seconds) insertData.rest_seconds = setEntryData.rest_seconds
      if (setEntryData.total_sets) insertData.total_sets = setEntryData.total_sets
      if (setEntryData.reps_per_set) insertData.reps_per_set = setEntryData.reps_per_set
      const groupFields = setEntryData as Record<string, unknown>
      if (groupFields.rounds_driver) insertData.rounds_driver = groupFields.rounds_driver
      if (groupFields.interval_seconds != null) insertData.interval_seconds = groupFields.interval_seconds
      if (groupFields.time_cap_seconds != null) insertData.time_cap_seconds = groupFields.time_cap_seconds

      const { data, error } = await supabase
        .from('workout_set_entries')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Full error details:', error)
        if (error.code === 'PGRST204') {
          console.error('Column not found. The workout_set_entries table may be missing a column.')
        }
        throw error
      }
      return data
    } catch (error: any) {
      console.error('Error creating workout set entry:', error)
      return null
    }
  }

  /**
   * Count total exercises across enriched set entries (for display).
   */
  static countExercisesFromBlocks(setEntries: WorkoutSetEntry[]): number {
    if (!setEntries?.length) return 0
    let n = 0
    for (const b of setEntries) {
      if (b.set_type === 'speed_work' || b.set_type === 'endurance') {
        const wsee = b.exercises?.length ?? 0
        n +=
          wsee > 0
            ? wsee
            : (b.speed_sets?.length ?? 0) + (b.endurance_sets?.length ?? 0)
        continue
      }
      n += (b.exercises?.length ?? 0)
      if (b.drop_sets?.length) {
        n += new Set(b.drop_sets.map((d: any) => `${d.exercise_id}:${d.exercise_order}`)).size
      }
      if (b.time_protocols?.length) {
        n += new Set(b.time_protocols.map((t: any) => `${t.exercise_id}:${t.exercise_order}`)).size
      }
      n +=
        (b.cluster_sets?.length ?? 0) +
        (b.rest_pause_sets?.length ?? 0)
    }
    return n
  }

  /** Load blocks from program_instance_workouts when contentId is an instance workout. */
  static async loadInstanceWorkoutBlocksIfAny(contentId: string): Promise<WorkoutSetEntry[]> {
    const { loadWorkoutBlocksByContentId } = await import('./loadWorkoutBlocksByContentId')
    const { data: instanceRow } = await supabase
      .from('program_instance_workouts')
      .select('id')
      .eq('id', contentId)
      .maybeSingle()
    if (!instanceRow?.id) return []
    return loadWorkoutBlocksByContentId(supabase, contentId, { preferInstance: true })
  }

  // Get all set entries for a workout template
  static async getWorkoutBlocks(templateId: string, options?: { lite?: boolean }): Promise<WorkoutSetEntry[]> {
    const getBlocksRunId = this.nextRunId()
    try {
      const lite = options?.lite === true
      const cached = this.getCachedBlocks(templateId, lite)
      if (cached) return cached
      if (process.env.NODE_ENV !== 'production') console.time(`[WorkoutSetEntryService] getWorkoutBlocks ${getBlocksRunId}`)
      const { ensureAuthenticated } = await import('./supabase')
      await ensureAuthenticated()

      const { data: blocks, error } = await supabase
        .from('workout_set_entries')
        .select('*')
        .eq('template_id', templateId)
        .order('set_order')

      if (error) throw error
      if (!blocks || blocks.length === 0) {
        const instanceBlocks = await WorkoutSetEntryService.loadInstanceWorkoutBlocksIfAny(
          templateId,
        )
        if (instanceBlocks.length > 0) {
          this.setCachedBlocks(templateId, lite, instanceBlocks)
          if (process.env.NODE_ENV !== 'production') {
            console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocks ${getBlocksRunId}`)
          }
          return instanceBlocks
        }
        if (process.env.NODE_ENV !== 'production') console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocks ${getBlocksRunId}`)
        return []
      }

      const enriched = await this.buildBlocksForTemplates(blocks, options)
      this.setCachedBlocks(templateId, lite, enriched)
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocks ${getBlocksRunId}`)
        console.log('[WorkoutSetEntryService] getWorkoutBlocks set entries:', blocks.length, 'enriched:', enriched?.length ?? 0)
      }
      return enriched
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocks ${getBlocksRunId}`)
      console.error('Error fetching workout set entries:', error)
      return []
    }
  }

  static async getWorkoutBlocksForTemplates(templateIds: string[], options?: { lite?: boolean }): Promise<Map<string, WorkoutSetEntry[]>> {
    const result = new Map<string, WorkoutSetEntry[]>()
    const uniqueIds = Array.from(new Set(templateIds.filter(Boolean)))
    if (uniqueIds.length === 0) return result

    const lite = options?.lite === true
    const uncachedTemplateIds: string[] = []
    uniqueIds.forEach((templateId) => {
      const cached = this.getCachedBlocks(templateId, lite)
      if (cached) {
        result.set(templateId, cached)
      } else {
        uncachedTemplateIds.push(templateId)
      }
    })

    if (uncachedTemplateIds.length === 0) return result

    if (process.env.NODE_ENV !== 'production') {
      console.log('[getWorkoutBlocksForTemplates] fetching blocks for', uncachedTemplateIds.length, 'templates:', uncachedTemplateIds.slice(0, 5).join(', ') + (uncachedTemplateIds.length > 5 ? '...' : ''))
    }
    const forTemplatesRunId = this.nextRunId()
    try {
      if (process.env.NODE_ENV !== 'production') console.time(`[WorkoutSetEntryService] getWorkoutBlocksForTemplates ${forTemplatesRunId}`)
      const { ensureAuthenticated } = await import('./supabase')
      await ensureAuthenticated()

      if (process.env.NODE_ENV !== 'production') console.time(`[getWorkoutBlocksForTemplates] workout_set_entries ${forTemplatesRunId}`)
      const { data: blocks, error } = await supabase
        .from('workout_set_entries')
        .select('*')
        .in('template_id', uncachedTemplateIds)
        .order('set_order')
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd(`[getWorkoutBlocksForTemplates] workout_set_entries ${forTemplatesRunId}`)
        console.log('[getWorkoutBlocksForTemplates] workout_set_entries rows=', (blocks || []).length)
      }
      if (error) throw error

      if (process.env.NODE_ENV !== 'production') console.time(`[getWorkoutBlocksForTemplates] buildBlocksForTemplates ${forTemplatesRunId}`)
      const enriched = await this.buildBlocksForTemplates(blocks || [], options)
      if (process.env.NODE_ENV !== 'production') console.timeEnd(`[getWorkoutBlocksForTemplates] buildBlocksForTemplates ${forTemplatesRunId}`)
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocksForTemplates ${forTemplatesRunId}`)
        console.log('[WorkoutSetEntryService] getWorkoutBlocksForTemplates templates:', uncachedTemplateIds.length, 'set entries:', (blocks || []).length)
      }
      const blocksByTemplate = new Map<string, WorkoutSetEntry[]>()
      ;(enriched || []).forEach((block: any) => {
        const templateId = block.template_id
        if (!blocksByTemplate.has(templateId)) {
          blocksByTemplate.set(templateId, [])
        }
        blocksByTemplate.get(templateId)!.push(block)
      })

      uncachedTemplateIds.forEach((templateId) => {
        const templateBlocks = (blocksByTemplate.get(templateId) || []).sort(
          (a, b) => (a.set_order ?? 0) - (b.set_order ?? 0)
        )
        this.setCachedBlocks(templateId, lite, templateBlocks)
        result.set(templateId, templateBlocks)
      })

      await Promise.all(
        uncachedTemplateIds.map(async (templateId) => {
          const current = result.get(templateId) ?? []
          if (current.length > 0) return
          const instanceBlocks = await this.loadInstanceWorkoutBlocksIfAny(templateId)
          if (instanceBlocks.length > 0) {
            this.setCachedBlocks(templateId, lite, instanceBlocks)
            result.set(templateId, instanceBlocks)
          }
        }),
      )

      return result
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.timeEnd(`[WorkoutSetEntryService] getWorkoutBlocksForTemplates ${forTemplatesRunId}`)
      console.error('Error fetching workout set entries (batched):', error)
      uncachedTemplateIds.forEach((templateId) => {
        result.set(templateId, [])
      })
      return result
    }
  }

  // Add exercise to a set entry
  static async addExerciseToBlock(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    exerciseData: Partial<WorkoutSetEntryExercise>
  ): Promise<WorkoutSetEntryExercise | null> {
    try {
      const insertData: any = {
        set_entry_id: setEntryId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
      }

      if (exerciseData.exercise_letter !== undefined && exerciseData.exercise_letter !== null) {
        insertData.exercise_letter = exerciseData.exercise_letter
      }
      if (exerciseData.sets !== undefined && exerciseData.sets !== null) {
        insertData.sets = exerciseData.sets
      }
      if (exerciseData.reps !== undefined && exerciseData.reps !== null && exerciseData.reps !== '') {
        insertData.reps = exerciseData.reps
      }
      if (exerciseData.weight_kg !== undefined && exerciseData.weight_kg !== null) {
        insertData.weight_kg = exerciseData.weight_kg
      }
      // Column `rir` stores prescribed RPE (1–10), not reps in reserve.
      if (exerciseData.rir !== undefined && exerciseData.rir !== null) {
        insertData.rir = exerciseData.rir
      }
      if (exerciseData.tempo !== undefined && exerciseData.tempo !== null && exerciseData.tempo !== '') {
        insertData.tempo = exerciseData.tempo
      }
      if (exerciseData.rest_seconds !== undefined && exerciseData.rest_seconds !== null) {
        insertData.rest_seconds = exerciseData.rest_seconds
      }
      if (exerciseData.notes !== undefined && exerciseData.notes !== null && exerciseData.notes !== '') {
        insertData.notes = exerciseData.notes
      }
      if (exerciseData.load_percentage !== undefined && exerciseData.load_percentage !== null) {
        insertData.load_percentage = exerciseData.load_percentage
      }

      const queryPromise = supabase
        .from('workout_set_entry_exercises')
        .insert(insertData)
        .select(`
          *,
          exercise:exercises(*)
        `)
        .single()

      const result = await Promise.race([
        queryPromise,
        new Promise<{ data: null; error: { code: string; message: string } }>((resolve) =>
          setTimeout(() => resolve({
            data: null,
            error: { code: '57014', message: 'Query timeout - database may be under heavy load' }
          }), 10000)
        )
      ])

      const { data, error } = result

      if (error) {
        console.error('Error adding exercise to set entry - Full error:', error)
        if (error.code === 'PGRST204') {
          console.error('Column not found. Please check that the workout_set_entry_exercises table has all required columns.')
          console.error('Required columns: set_entry_id, exercise_id, exercise_order')
          console.error('Optional columns: exercise_letter, sets, reps, weight_kg, rir, tempo, rest_seconds, notes')
        }
        if (error.code === '57014' || error.message?.includes('timeout')) {
          console.warn('Database timeout - the special set tables may need indexes.')
        }
        throw error
      }
      return data
    } catch (error: any) {
      console.error('Error adding exercise to set entry:', error)
      if (error?.code === 'PGRST204') {
        console.error('Database schema issue: The workout_set_entry_exercises table may be missing required columns.')
      }
      return null
    }
  }

  // Create drop set configuration
  static async createDropSet(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    dropOrder: number,
    weightKg: number | null | undefined,
    reps: string,
    loadPercentage?: number | null | undefined,
    dropPercentage?: number | null | undefined
  ): Promise<WorkoutDropSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_drop_sets')
        .insert({
          set_entry_id: setEntryId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          drop_order: dropOrder,
          weight_kg: weightKg ?? null,
          load_percentage: loadPercentage ?? null,
          drop_percentage: dropPercentage ?? null,
          reps: reps
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating drop set:', error)
      return null
    }
  }

  // Create cluster set configuration
  static async createClusterSet(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    repsPerCluster: number,
    clustersPerSet: number,
    intraClusterRest: number = 15,
    interSetRest: number = 120,
    weightKg?: number | null | undefined,
    loadPercentage?: number | null | undefined
  ): Promise<WorkoutClusterSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_cluster_sets')
        .insert({
          set_entry_id: setEntryId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          reps_per_cluster: repsPerCluster,
          clusters_per_set: clustersPerSet,
          intra_cluster_rest: intraClusterRest,
          inter_set_rest: interSetRest,
          weight_kg: weightKg ?? null,
          load_percentage: loadPercentage ?? null
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating cluster set:', error)
      return null
    }
  }

  // Create rest-pause set configuration
  static async createRestPauseSet(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    weightKg: number | null | undefined,
    restPauseDuration: number = 15,
    maxRestPauses: number = 3,
    loadPercentage?: number | null | undefined
  ): Promise<WorkoutRestPauseSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_rest_pause_sets')
        .insert({
          set_entry_id: setEntryId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          weight_kg: weightKg ?? null,
          load_percentage: loadPercentage ?? null,
          rest_pause_duration: restPauseDuration,
          max_rest_pauses: maxRestPauses
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating rest-pause set:', error)
      return null
    }
  }

  // Create time protocol configuration (one per exercise)
  static async createTimeProtocol(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    protocolType: 'amrap' | 'emom' | 'for_time' | 'tabata',
    protocolData: Partial<WorkoutTimeProtocol>
  ): Promise<WorkoutTimeProtocol | null> {
    try {
      const insertData: any = {
        set_entry_id: setEntryId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        protocol_type: protocolType,
      }

      if (protocolData.total_duration_minutes !== undefined) insertData.total_duration_minutes = protocolData.total_duration_minutes
      if (protocolData.work_seconds !== undefined) insertData.work_seconds = protocolData.work_seconds
      if (protocolData.rest_seconds !== undefined) insertData.rest_seconds = protocolData.rest_seconds
      if (protocolData.rest_after_set !== undefined) insertData.rest_after_set = protocolData.rest_after_set
      if (protocolData.rounds !== undefined) insertData.rounds = protocolData.rounds
      if (protocolData.reps_per_round !== undefined) insertData.reps_per_round = protocolData.reps_per_round
      if (protocolData.set !== undefined) insertData.set = protocolData.set
      insertData.weight_kg = protocolData.weight_kg ?? null
      insertData.load_percentage = protocolData.load_percentage ?? null

      if ((protocolType === 'for_time' || protocolType === 'amrap') && protocolData.target_reps !== undefined && protocolData.target_reps !== null) {
        insertData.target_reps = protocolData.target_reps
      }
      if (protocolType === 'for_time' && protocolData.time_cap_minutes !== undefined) {
        insertData.time_cap_minutes = protocolData.time_cap_minutes
      }
      if (protocolType === 'emom' && protocolData.emom_mode !== undefined) {
        insertData.emom_mode = protocolData.emom_mode
      }

      const { data, error } = await supabase
        .from('workout_time_protocols')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating time protocol:', error)
      return null
    }
  }

  static async createSpeedSet(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    data: Partial<WorkoutSpeedSet>
  ): Promise<WorkoutSpeedSet | null> {
    try {
      const insertData: Record<string, unknown> = {
        set_entry_id: setEntryId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        intervals: data.intervals ?? 1,
        distance_meters: data.distance_meters ?? 0,
        rest_seconds: data.rest_seconds ?? 120,
      }
      if (data.load_pct_bw != null) insertData.load_pct_bw = data.load_pct_bw
      if (data.target_speed_pct != null) insertData.target_speed_pct = data.target_speed_pct
      if (data.target_hr_pct != null) insertData.target_hr_pct = data.target_hr_pct
      if (data.notes != null) insertData.notes = data.notes

      const { data: row, error } = await supabase
        .from('workout_speed_sets')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return row as WorkoutSpeedSet
    } catch (error) {
      console.error('Error creating speed set:', error)
      return null
    }
  }

  static async createEnduranceSet(
    setEntryId: string,
    exerciseId: string,
    exerciseOrder: number,
    data: Partial<WorkoutEnduranceSet>
  ): Promise<WorkoutEnduranceSet | null> {
    try {
      const insertData: Record<string, unknown> = {
        set_entry_id: setEntryId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        target_distance_meters: data.target_distance_meters ?? 0,
      }
      if (data.target_time_seconds != null) insertData.target_time_seconds = data.target_time_seconds
      if (data.target_pace_seconds_per_km != null) insertData.target_pace_seconds_per_km = data.target_pace_seconds_per_km
      if (data.hr_zone != null) insertData.hr_zone = data.hr_zone
      if (data.target_hr_pct != null) insertData.target_hr_pct = data.target_hr_pct
      if (data.notes != null) insertData.notes = data.notes

      const { data: row, error } = await supabase
        .from('workout_endurance_sets')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return row as WorkoutEnduranceSet
    } catch (error) {
      console.error('Error creating endurance set:', error)
      return null
    }
  }

  // Update workout set entry
  static async updateWorkoutBlock(
    setEntryId: string,
    updates: Partial<WorkoutSetEntry>
  ): Promise<WorkoutSetEntry | null> {
    try {
      const { data, error } = await supabase
        .from('workout_set_entries')
        .update(updates)
        .eq('id', setEntryId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating workout set entry:', error)
      return null
    }
  }

  private static async deleteChildTableStrict(
    setEntryId: string,
    table: string,
  ): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('set_entry_id', setEntryId)
    if (error) {
      console.error(`Error deleting from ${table}:`, error)
      throw error
    }
  }

  /** Clears all child tables sequentially (avoids RPC statement timeout on hosted Supabase). */
  static async deleteAllChildTablesSequential(setEntryId: string): Promise<void> {
    const { data: slots } = await supabase
      .from('workout_set_entry_exercises')
      .select('id')
      .eq('set_entry_id', setEntryId)
    const slotIds = (slots ?? []).map((s) => s.id)
    if (slotIds.length > 0) {
      const { error: rxErr } = await supabase
        .from('workout_set_prescriptions')
        .delete()
        .in('slot_id', slotIds)
      if (rxErr) throw rxErr
    }
    for (const table of ALL_SET_ENTRY_CHILD_TABLES) {
      await this.deleteChildTableStrict(setEntryId, table)
    }
  }

  /** Insert Group-model slots after child tables are cleared (unique exercise_id per group). */
  static async persistGroupModelSlots(
    setEntryId: string,
    slots: GroupModelSlotWrite[],
  ): Promise<void> {
    const seen = new Set<string>()
    const deduped = slots
      .filter((slot) => {
        if (seen.has(slot.exercise_id)) return false
        seen.add(slot.exercise_id)
        return true
      })
      .map((slot, index) => ({ ...slot, exercise_order: index + 1 }))

    for (const slot of deduped) {
      const insertData: Record<string, unknown> = {
        set_entry_id: setEntryId,
        exercise_id: slot.exercise_id,
        exercise_order: slot.exercise_order,
        measurement: slot.measurement,
        technique: slot.technique,
      }
      const optionalFields: (keyof GroupModelSlotWrite)[] = [
        'exercise_letter',
        'sets',
        'reps',
        'weight_kg',
        'load_percentage',
        'rir',
        'tempo',
        'rest_seconds',
        'notes',
        'work_seconds',
        'distance_meters',
        'target_time_seconds',
        'target_pace_seconds_per_km',
        'target_speed_pct',
        'hr_zone',
        'target_hr_pct',
        'drop_percentage',
        'max_drops',
        'reps_per_cluster',
        'clusters_per_set',
        'intra_cluster_rest_seconds',
        'rest_pause_seconds',
        'max_rest_pauses',
      ]
      for (const key of optionalFields) {
        const val = slot[key]
        if (val !== undefined && val !== null && val !== '') {
          insertData[key] = val
        }
      }
      const { error } = await supabase.from('workout_set_entry_exercises').insert(insertData)
      if (error) throw error
    }
  }

  /**
   * Before re-inserting block data on template save.
   * Same set type → only relevant table(s). Type change → all child tables (sequential).
   */
  static async clearChildRowsForSave(
    setEntryId: string,
    newSetType: string,
    previousSetType?: string | null,
  ): Promise<void> {
    const typeChanged =
      previousSetType != null &&
      previousSetType !== '' &&
      previousSetType !== newSetType

    const tables = typeChanged
      ? [...ALL_SET_ENTRY_CHILD_TABLES]
      : childTablesForSetType(newSetType)

    for (const table of tables) {
      await this.deleteChildTableStrict(setEntryId, table)
    }
  }

  /**
   * @deprecated Prefer clearChildRowsForSave or deleteAllChildTablesSequential — RPC hits statement timeout.
   */
  static async deleteAllRelatedDataForSetEntryStrict(setEntryId: string): Promise<void> {
    await this.deleteAllChildTablesSequential(setEntryId)
  }

  // Delete all special table data for a set entry (helper for updates)
  static async deleteBlockSpecialData(setEntryId: string, setType?: string): Promise<void> {
    const safeDelete = async (table: string) => {
      try {
        await Promise.race([
          supabase.from(table).delete().eq('set_entry_id', setEntryId),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Delete timeout: ${table}`)), 8000))
        ])
      } catch (error: any) {
        if (error?.message?.includes('timeout') || error?.code === '57014') {
          console.warn(`Delete timeout for ${table} (set_entry_id=${setEntryId}) - continuing...`)
        }
      }
    }

    if (setType) {
      if (['straight_set', 'superset', 'giant_set', 'pre_exhaustion', 'timed_set'].includes(setType)) {
        await safeDelete('workout_set_entry_exercises')
      } else if (setType === 'drop_set') {
        await safeDelete('workout_drop_sets')
      } else if (setType === 'cluster_set') {
        await safeDelete('workout_cluster_sets')
      } else if (setType === 'rest_pause') {
        await safeDelete('workout_rest_pause_sets')
      } else if (['amrap', 'emom', 'for_time', 'tabata'].includes(setType)) {
        await safeDelete('workout_time_protocols')
      } else if (setType === 'speed_work') {
        await safeDelete('workout_speed_sets')
      } else if (setType === 'endurance') {
        await safeDelete('workout_endurance_sets')
      }
      return
    }

    await Promise.all([
      safeDelete('workout_set_entry_exercises'),
      safeDelete('workout_drop_sets'),
      safeDelete('workout_cluster_sets'),
      safeDelete('workout_rest_pause_sets'),
      safeDelete('workout_time_protocols'),
      safeDelete('workout_speed_sets'),
      safeDelete('workout_endurance_sets'),
    ])
  }

  // Delete workout set entry (and all related special table data)
  static async deleteWorkoutBlock(setEntryId: string): Promise<boolean> {
    try {
      await this.deleteAllChildTablesSequential(setEntryId)

      const { error } = await supabase
        .from('workout_set_entries')
        .delete()
        .eq('id', setEntryId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting workout set entry:', error)
      return false
    }
  }

  // Reorder workout set entries
  static async reorderWorkoutBlocks(
    templateId: string,
    blockOrders: { blockId: string; newOrder: number }[]
  ): Promise<boolean> {
    try {
      const updates = blockOrders.map(({ blockId, newOrder }) =>
        supabase
          .from('workout_set_entries')
          .update({ set_order: newOrder })
          .eq('id', blockId)
          .eq('template_id', templateId)
      )

      await Promise.all(updates)
      return true
    } catch (error) {
      console.error('Error reordering workout set entries:', error)
      return false
    }
  }

  // Get set type specific configuration
  static getBlockTypeConfig(setType: SetType) {
    const configs = {
      straight_set: {
        name: 'Straight Set',
        description: 'Traditional sets with rest between each set',
        icon: '📋',
        color: 'blue',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      superset: {
        name: 'Superset',
        description: 'Two exercises performed back-to-back with rest after the pair',
        icon: '⚡',
        color: 'orange',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: true,
        supportsClusterSets: true,
        supportsRestPause: false
      },
      giant_set: {
        name: 'Giant Set',
        description: 'Three or more exercises performed back-to-back',
        icon: '🔥',
        color: 'red',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      drop_set: {
        name: 'Drop Set',
        description: 'Reduce weight and continue without rest',
        icon: '📉',
        color: 'purple',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: true,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      cluster_set: {
        name: 'Cluster Set',
        description: 'Short rests between clusters within a set',
        icon: '🔗',
        color: 'indigo',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: true,
        supportsRestPause: false
      },
      rest_pause: {
        name: 'Rest-Pause Set',
        description: 'Brief rest-pause between efforts with same weight',
        icon: '⏸️',
        color: 'teal',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: true
      },
      pre_exhaustion: {
        name: 'Pre-Exhaustion',
        description: 'Isolation exercise followed by compound movement',
        icon: '🎯',
        color: 'pink',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      amrap: {
        name: 'AMRAP',
        description: 'As Many Rounds As Possible in given time',
        icon: '🚀',
        color: 'yellow',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      emom: {
        name: 'EMOM',
        description: 'Every Minute On the Minute protocol',
        icon: '⏰',
        color: 'cyan',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      tabata: {
        name: 'Tabata',
        description: '20 seconds work, 10 seconds rest protocol',
        icon: '⚡',
        color: 'amber',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      },
      for_time: {
        name: 'For Time',
        description: 'Complete all exercises as fast as possible',
        icon: '🏃',
        color: 'rose',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsRestPause: false
      }
    }

    return configs[setType as keyof typeof configs] || configs.straight_set
  }

  // Validate set entry configuration
  static validateBlockConfiguration(
    setType: SetType,
    setEntryData: Partial<WorkoutSetEntry>,
    exercises: WorkoutSetEntryExercise[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const config = this.getBlockTypeConfig(setType)

    if (config.requiresMultipleExercises && exercises.length < 2) {
      errors.push(`${config.name} requires at least 2 exercises`)
    }

    if (config.supportsTimeProtocols && !setEntryData.duration_seconds) {
      errors.push(`${config.name} requires duration to be specified`)
    }

    switch (setType) {
      case 'superset':
        if (exercises.length !== 2) {
          errors.push('Superset must have exactly 2 exercises')
        }
        break
      case 'giant_set':
        if (exercises.length < 3) {
          errors.push('Giant set must have at least 3 exercises')
        }
        break
      case 'tabata':
        if (setEntryData.duration_seconds !== 240) {
          errors.push('Tabata must be exactly 4 minutes (8 rounds)')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
