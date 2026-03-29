/**

 * Server-side exercise counts per workout template (all set types).

 * Prefer DB RPC `count_exercises_by_template_ids` (one query); this module is the fallback when RPC is missing.

 *

 * Fallback uses parallel chunk queries (sequential chunks were stacking into multi-minute requests and statement timeouts).

 */



const CHUNK = 25



function chunkArray<T>(arr: T[], size: number): T[][] {

  const out: T[][] = []

  for (let i = 0; i < arr.length; i += size) {

    out.push(arr.slice(i, i + size))

  }

  return out

}



/**

 * Returns map template_id -> total exercise count (straight + drop + cluster + rest_pause + time protocols).

 * `supabase` is untyped so route handlers can pass createSupabaseServerClient() without TS2589 depth errors.

 */

export async function computeExerciseCountsByTemplateIds(

  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  supabase: any,

  templateIds: string[]

): Promise<Record<string, number>> {

  const counts: Record<string, number> = {}

  const ids = Array.from(new Set(templateIds.filter(Boolean)))

  ids.forEach((id) => {

    counts[id] = 0

  })

  if (ids.length === 0) return counts



  const allBlocks: { id: string; template_id: string; set_type: string }[] = []

  const templateChunks = chunkArray(ids, CHUNK)

  const blockResults = await Promise.all(

    templateChunks.map(async (idChunk) => {

      const { data, error } = await supabase

        .from('workout_set_entries')

        .select('id, template_id, set_type')

        .in('template_id', idChunk)

      if (error) {

        console.error('[computeExerciseCountsByTemplateIds] workout_set_entries:', error.message)

        return [] as typeof allBlocks

      }

      if (!Array.isArray(data)) return []

      return (data as typeof allBlocks).filter((row) => row?.id && row?.template_id)

    })

  )

  for (const part of blockResults) {

    allBlocks.push(...part)

  }



  if (allBlocks.length === 0) return counts



  const blockToTemplate = new Map<string, string>()

  const blockIdsByType = {

    usesBlockExercises: [] as string[],

    usesDropSets: [] as string[],

    usesClusterSets: [] as string[],

    usesRestPause: [] as string[],

    usesTimeProtocols: [] as string[],

  }



  for (const block of allBlocks) {

    blockToTemplate.set(block.id, block.template_id)

    const blockType = block.set_type

    if (['straight_set', 'superset', 'giant_set', 'pre_exhaustion'].includes(blockType)) {

      blockIdsByType.usesBlockExercises.push(block.id)

    } else if (blockType === 'drop_set') {

      blockIdsByType.usesDropSets.push(block.id)

    } else if (blockType === 'cluster_set') {

      blockIdsByType.usesClusterSets.push(block.id)

    } else if (blockType === 'rest_pause') {

      blockIdsByType.usesRestPause.push(block.id)

    } else if (['amrap', 'emom', 'for_time', 'tabata'].includes(blockType)) {

      blockIdsByType.usesTimeProtocols.push(block.id)

    }

  }



  const queryInChunksParallel = async (

    table: string,

    select: string,

    blockIds: string[]

  ): Promise<{ set_entry_id?: string; exercise_id?: string; exercise_order?: number; id?: string }[]> => {

    if (blockIds.length === 0) return []

    const chunks = chunkArray(blockIds, CHUNK)

    const parts = await Promise.all(

      chunks.map(async (idChunk) => {

        const { data, error } = await supabase.from(table).select(select).in('set_entry_id', idChunk)

        if (error) {

          console.error(`[computeExerciseCountsByTemplateIds] ${table}:`, error.message)

          return [] as { set_entry_id?: string; exercise_id?: string; exercise_order?: number; id?: string }[]

        }

        return Array.isArray(data)
          ? (data as {
              set_entry_id?: string
              exercise_id?: string
              exercise_order?: number
              id?: string
            }[])
          : []


      })

    )

    return parts.flat()

  }



  const [rowsStraight, rowsDrop, rowsCluster, rowsRp, rowsTp] = await Promise.all([

    queryInChunksParallel('workout_set_entry_exercises', 'id, set_entry_id', blockIdsByType.usesBlockExercises),

    queryInChunksParallel(

      'workout_drop_sets',

      'set_entry_id, exercise_id, exercise_order',

      blockIdsByType.usesDropSets

    ),

    queryInChunksParallel(

      'workout_cluster_sets',

      'set_entry_id, exercise_id, exercise_order',

      blockIdsByType.usesClusterSets

    ),

    queryInChunksParallel(

      'workout_rest_pause_sets',

      'set_entry_id, exercise_id, exercise_order',

      blockIdsByType.usesRestPause

    ),

    queryInChunksParallel(

      'workout_time_protocols',

      'set_entry_id, exercise_id, exercise_order',

      blockIdsByType.usesTimeProtocols

    ),

  ])



  for (const row of rowsStraight) {

    const tid = row.set_entry_id ? blockToTemplate.get(row.set_entry_id) : undefined

    if (tid) counts[tid] = (counts[tid] || 0) + 1

  }



  const uniqDrop = new Set<string>()

  for (const row of rowsDrop) {

    const tid = row.set_entry_id ? blockToTemplate.get(row.set_entry_id) : undefined

    if (!tid || row.exercise_id == null || row.exercise_order == null) continue

    const key = `${tid}:${row.exercise_id}:${row.exercise_order}`

    if (!uniqDrop.has(key)) {

      uniqDrop.add(key)

      counts[tid] = (counts[tid] || 0) + 1

    }

  }



  const uniqCluster = new Set<string>()

  for (const row of rowsCluster) {

    const tid = row.set_entry_id ? blockToTemplate.get(row.set_entry_id) : undefined

    if (!tid || row.exercise_id == null || row.exercise_order == null) continue

    const key = `${tid}:${row.exercise_id}:${row.exercise_order}`

    if (!uniqCluster.has(key)) {

      uniqCluster.add(key)

      counts[tid] = (counts[tid] || 0) + 1

    }

  }



  const uniqRp = new Set<string>()

  for (const row of rowsRp) {

    const tid = row.set_entry_id ? blockToTemplate.get(row.set_entry_id) : undefined

    if (!tid || row.exercise_id == null || row.exercise_order == null) continue

    const key = `${tid}:${row.exercise_id}:${row.exercise_order}`

    if (!uniqRp.has(key)) {

      uniqRp.add(key)

      counts[tid] = (counts[tid] || 0) + 1

    }

  }



  const uniqTp = new Set<string>()

  for (const row of rowsTp) {

    const tid = row.set_entry_id ? blockToTemplate.get(row.set_entry_id) : undefined

    if (!tid || row.exercise_id == null || row.exercise_order == null) continue

    const key = `${tid}:${row.exercise_id}:${row.exercise_order}`

    if (!uniqTp.has(key)) {

      uniqTp.add(key)

      counts[tid] = (counts[tid] || 0) + 1

    }

  }



  return counts

}


