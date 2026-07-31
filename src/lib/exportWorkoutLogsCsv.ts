/**
 * Export client workout history as CSV (one row per set).
 */

import { supabase } from '@/lib/supabase'

export type WorkoutLogTimeFilter = 'all' | 'this_month' | 'this_week'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function filterStartIso(filter: WorkoutLogTimeFilter): string | null {
  const now = new Date()
  if (filter === 'this_week') {
    const start = new Date(now)
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return start.toISOString()
  }
  if (filter === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    return start.toISOString()
  }
  return null
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Query full filtered range (no 100-row list cap) and download CSV.
 */
export async function exportWorkoutLogsCsv(
  clientId: string,
  timeFilter: WorkoutLogTimeFilter,
): Promise<{ rowCount: number }> {
  let query = supabase
    .from('workout_logs')
    .select(
      `
      id,
      completed_at,
      started_at,
      workout_assignment_id
    `,
    )
    .eq('client_id', clientId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  const startIso = filterStartIso(timeFilter)
  if (startIso) {
    query = query.gte('completed_at', startIso)
  }

  const { data: logs, error } = await query
  if (error) throw new Error(error.message)
  if (!logs?.length) {
    downloadCsv('workout-history.csv', 'date,workout_name,exercise,set_number,reps,weight_kg,rpe\n')
    return { rowCount: 0 }
  }

  const assignmentIds = [
    ...new Set(
      logs.map((l) => l.workout_assignment_id).filter(Boolean) as string[],
    ),
  ]
  const nameByAssignment = new Map<string, string>()
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabase
      .from('workout_assignments')
      .select('id, workout_templates ( name )')
      .in('id', assignmentIds)
    for (const a of assignments ?? []) {
      const tpl = a.workout_templates as { name?: string } | { name?: string }[] | null
      const name = Array.isArray(tpl) ? tpl[0]?.name : tpl?.name
      nameByAssignment.set(a.id, name?.trim() || 'Workout')
    }
  }

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from('workout_set_logs')
    .select(
      `
      workout_log_id,
      set_number,
      reps,
      weight,
      rpe,
      exercise_id,
      exercises ( id, name )
    `,
    )
    .in('workout_log_id', logIds)
    .eq('client_id', clientId)
    .order('set_number', { ascending: true })

  if (setsError) throw new Error(setsError.message)

  const logMeta = new Map(
    logs.map((l) => [
      l.id,
      {
        date: (l.completed_at || l.started_at || '').toString().slice(0, 10),
        name:
          (l.workout_assignment_id &&
            nameByAssignment.get(l.workout_assignment_id)) ||
          'Workout',
      },
    ]),
  )

  const header = 'date,workout_name,exercise,set_number,reps,weight_kg,rpe'
  const rows: string[] = [header]
  for (const set of sets ?? []) {
    const meta = logMeta.get(set.workout_log_id)
    if (!meta) continue
    const ex = set.exercises as { name?: string } | { name?: string }[] | null
    const exerciseName = Array.isArray(ex) ? ex[0]?.name : ex?.name
    rows.push(
      [
        csvEscape(meta.date),
        csvEscape(meta.name),
        csvEscape(exerciseName || 'Exercise'),
        csvEscape(set.set_number ?? ''),
        csvEscape(set.reps ?? ''),
        csvEscape(set.weight ?? ''),
        csvEscape(set.rpe ?? ''),
      ].join(','),
    )
  }

  const filterLabel =
    timeFilter === 'this_week'
      ? 'this-week'
      : timeFilter === 'this_month'
        ? 'this-month'
        : 'all-time'
  downloadCsv(`workout-history-${filterLabel}.csv`, rows.join('\n') + '\n')
  return { rowCount: rows.length - 1 }
}
