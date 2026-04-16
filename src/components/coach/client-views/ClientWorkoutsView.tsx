'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Dumbbell,
  Calendar,
  Clock,
  Target,
  X,
  Star,
  Layers,
  Plus,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast-provider'
import WorkoutAssignmentModal from '@/components/WorkoutAssignmentModal'
import { WeekReviewModal } from '@/components/coach/WeekReviewModal'
import ClientProgressionEditor from '@/components/coach/client-views/ClientProgressionEditor'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { useCoachClient } from '@/contexts/CoachClientContext'
import { cn } from '@/lib/utils'
import { getCategoryAccent } from '@/lib/workoutCategoryColors'
import type { AdherenceTier } from '@/lib/coachWorkoutAdherence'

function sessionAdherenceTierClass(tier: AdherenceTier | null | undefined) {
  if (tier === 'green') return 'text-emerald-400'
  if (tier === 'amber') return 'text-amber-400'
  if (tier === 'red') return 'text-red-400'
  return 'text-gray-500'
}

// Data mapping: workout_assignments -> workout_templates -> workout_set_entries ->
// workout_set_entry_exercises -> protocol tables (workout_time_protocols,
// workout_cluster_sets, workout_rest_pause_sets, workout_drop_sets, workout_speed_sets, workout_endurance_sets)
interface ClientWorkoutsViewProps {
  clientId: string
}

interface WorkoutAssignment {
  id: string
  scheduled_date: string | null
  notes?: string | null
  status: string
  created_at: string
  workout_templates?: {
    name: string
    description?: string
    difficulty_level?: string
    estimated_duration?: number
  }
}

interface ProgramAssignment {
  id: string
  program_id: string
  start_date: string
  end_date?: string
  status: string
  created_at: string
  progression_mode?: string | null
  coach_unlocked_week?: number | null
  workout_programs?: {
    id?: string
    name: string
    description?: string
    duration_weeks?: number
  }
}

type WeekDayCell = { dow: number; hasSlot: boolean; done: boolean }

export type WeekScheduleSlot = {
  scheduleId: string
  dayOfWeek: number
  dayNumber: number | null
  templateId: string
  isOptional: boolean
  templateName: string
  isCompleted: boolean
}

type ActiveProgramSummary = {
  assignmentId: string
  programId: string
  programName: string
  progressionMode: string
  coachUnlockedWeek: number | null
  displayWeek: number
  requiredCount: number
  completedCount: number
  durationWeeks: number | null
  weekDays: WeekDayCell[]
  weekScheduleSlots: WeekScheduleSlot[]
}

type CoachTrainingRpcPayload = {
  activeProgram?: {
    assignmentId?: string
    programId?: string
    programName?: string
    durationWeeks?: number | null
    displayWeek?: number
    progressionMode?: string
    coachUnlockedWeek?: number | null
    requiredSlotsThisWeek?: number
    completedRequiredThisWeek?: number
    weekDays?: unknown
    weekSchedule?: unknown
  } | null
  recentSessions?: Array<{
    logId?: string
    completedAt?: string
    workoutName?: string
    durationMinutes?: number | null
    setsCompleted?: number | null
    weightLifted?: number | string | null
    templateId?: string | null
  }>
}

function normalizeWeekDays(raw: unknown): WeekDayCell[] {
  const base: WeekDayCell[] = Array.from({ length: 7 }, (_, i) => ({
    dow: i,
    hasSlot: false,
    done: false,
  }))
  if (!Array.isArray(raw)) return base
  for (const cell of raw) {
    const o = cell as { dow?: number; hasSlot?: boolean; done?: boolean }
    if (typeof o.dow === 'number' && o.dow >= 0 && o.dow <= 6) {
      base[o.dow] = {
        dow: o.dow,
        hasSlot: Boolean(o.hasSlot),
        done: Boolean(o.done),
      }
    }
  }
  return base
}

const SCHEDULE_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function parseWeekSchedule(raw: unknown): WeekScheduleSlot[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => {
      const o = x as Record<string, unknown>
      return {
        scheduleId: String(o.scheduleId ?? ''),
        dayOfWeek: typeof o.dayOfWeek === 'number' ? o.dayOfWeek : -1,
        dayNumber: typeof o.dayNumber === 'number' ? o.dayNumber : null,
        templateId: String(o.templateId ?? ''),
        isOptional: Boolean(o.isOptional),
        templateName:
          typeof o.templateName === 'string' ? o.templateName : 'Workout',
        isCompleted: Boolean(o.isCompleted),
      }
    })
    .filter(
      (s) =>
        s.scheduleId.length > 0 &&
        s.dayOfWeek >= 0 &&
        s.dayOfWeek <= 6
    )
}

function truncateLabel(s: string, max = 20) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** One cell per Mon–Sun from flat week schedule rows. */
function buildScheduleStripCells(slots: WeekScheduleSlot[]) {
  return SCHEDULE_DAY_LABELS.map((label, dow) => {
    const daySlots = slots.filter((s) => s.dayOfWeek === dow)
    if (daySlots.length === 0) {
      return {
        dayLabel: label,
        symbol: 'dash' as const,
        line: '',
        title: 'Rest day',
      }
    }
    const names = [...new Set(daySlots.map((s) => s.templateName))].join(' · ')
    const required = daySlots.filter((s) => !s.isOptional)
    let done: boolean
    if (required.length > 0) {
      done = required.every((s) => s.isCompleted)
    } else {
      done = daySlots.every((s) => s.isCompleted)
    }
    return {
      dayLabel: label,
      symbol: done ? ('check' as const) : ('circle' as const),
      line: truncateLabel(names),
      title: names,
    }
  })
}

async function fetchWeekScheduleSlotsClient(
  programId: string,
  assignmentId: string,
  displayWeek: number
): Promise<WeekScheduleSlot[]> {
  const [{ data: rows, error: rErr }, { data: comps }] = await Promise.all([
    supabase
      .from('program_schedule')
      .select(
        `
        id,
        day_of_week,
        day_number,
        is_optional,
        template_id,
        workout_templates ( name )
      `
      )
      .eq('program_id', programId)
      .eq('week_number', displayWeek),
    supabase
      .from('program_day_completions')
      .select('program_schedule_id, notes')
      .eq('program_assignment_id', assignmentId),
  ])
  if (rErr || !rows?.length) return []
  const completedIds = new Set(
    (comps || [])
      .filter(
        (c: { notes?: string | null }) =>
          !String(c.notes || '').startsWith('Skipped by coach')
      )
      .map((c: { program_schedule_id: string }) => c.program_schedule_id)
  )
  return rows.map((r: Record<string, unknown>) => {
    const wt = r.workout_templates as { name?: string } | null | undefined
    const dow =
      typeof r.day_of_week === 'number' && r.day_of_week >= 0 && r.day_of_week <= 6
        ? r.day_of_week
        : 0
    return {
      scheduleId: String(r.id),
      dayOfWeek: dow,
      dayNumber: typeof r.day_number === 'number' ? r.day_number : null,
      templateId: String(r.template_id ?? ''),
      isOptional: Boolean(r.is_optional),
      templateName: wt?.name?.trim() || 'Workout',
      isCompleted: completedIds.has(String(r.id)),
    }
  })
}

type RecentWorkoutLogRow = {
  id: string
  started_at: string
  completed_at: string | null
  total_duration_minutes: number | null
  total_sets_completed: number | null
  total_weight_lifted: number | string | null
  workout_assignment_id: string | null
  workoutName: string
  templateId: string | null
  /** workout_templates.category text when known */
  templateCategory?: string | null
  topExerciseNames: string[]
}

async function enrichRecentLogsTemplateCategories(
  logs: RecentWorkoutLogRow[]
): Promise<RecentWorkoutLogRow[]> {
  const ids = [...new Set(logs.map((l) => l.templateId).filter(Boolean))] as string[]
  if (ids.length === 0) return logs
  const { data } = await supabase
    .from('workout_templates')
    .select('id, category')
    .in('id', ids)
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const r = row as { id?: string; category?: string | null }
    if (r.id) map.set(r.id, String(r.category ?? ''))
  }
  return logs.map((l) => ({
    ...l,
    templateCategory: l.templateId ? map.get(l.templateId) ?? null : null,
  }))
}

export default function ClientWorkoutsView({ clientId }: ClientWorkoutsViewProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const { clientName } = useCoachClient()
  const [workouts, setWorkouts] = useState<WorkoutAssignment[]>([])
  const [programs, setPrograms] = useState<ProgramAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [editWorkoutId, setEditWorkoutId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingWorkoutMeta, setSavingWorkoutMeta] = useState(false)
  const [activeProgramSummary, setActiveProgramSummary] =
    useState<ActiveProgramSummary | null>(null)
  const [recentLogs, setRecentLogs] = useState<RecentWorkoutLogRow[]>([])
  const [sessionAdherence, setSessionAdherence] = useState<
    Record<
      string,
      { adherencePercent: number | null; tier: AdherenceTier | null }
    >
  >({})
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const getWorkoutStatusMeta = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'fc-text-success' }
      case 'in_progress':
        return { label: 'In progress', color: 'fc-text-warning' }
      case 'skipped':
        return { label: 'Skipped', color: 'fc-text-error' }
      case 'assigned':
      default:
        return { label: 'Assigned', color: 'fc-text-subtle' }
    }
  }

  const getProgramStatusMeta = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'fc-text-warning' }
      case 'paused':
        return { label: 'Paused', color: 'fc-text-subtle' }
      case 'completed':
        return { label: 'Completed', color: 'fc-text-success' }
      case 'cancelled':
        return { label: 'Cancelled', color: 'fc-text-error' }
      default:
        return { label: status, color: 'fc-text-subtle' }
    }
  }

  const loadTrainingData = useCallback(async () => {
    setLoading(true)
    setActiveProgramSummary(null)
    setRecentLogs([])

    try {
      const [waRes, paRes] = await Promise.all([
        supabase
          .from('workout_assignments')
          .select(`*, workout_templates(*)`)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('program_assignments')
          .select(`*, workout_programs(*)`)
          .eq('client_id', clientId)
          .order('start_date', { ascending: false }),
      ])

      const waData = waRes.data
      const waErr = waRes.error
      if (waErr || !waData) {
        setWorkouts([])
      } else {
        const uniqueWorkouts =
          waData.filter(
            (workout, index, self) =>
              index === self.findIndex((w) => w.id === workout.id)
          ) || []
        setWorkouts(uniqueWorkouts as WorkoutAssignment[])
      }

      const paData = paRes.data
      const paErr = paRes.error
      const programRows = (!paErr && paData ? paData : []) as ProgramAssignment[]
      setPrograms(programRows)

      const active = programRows.find((p) => p.status === 'active')

      const { data: rpcRaw, error: rpcErr } = await supabase.rpc(
        'get_coach_client_training',
        { p_client_id: clientId }
      )
      const rpc = (rpcRaw as CoachTrainingRpcPayload | null) ?? null

      let usedRpcRecent = false
      if (!rpcErr && rpc != null && Array.isArray(rpc.recentSessions)) {
        usedRpcRecent = true
        const fromRpc: RecentWorkoutLogRow[] = rpc.recentSessions
          .map((s) => ({
            id: String(s.logId ?? ''),
            started_at: s.completedAt ?? '',
            completed_at: s.completedAt ?? null,
            total_duration_minutes: s.durationMinutes ?? null,
            total_sets_completed: s.setsCompleted ?? null,
            total_weight_lifted: s.weightLifted ?? null,
            workout_assignment_id: null,
            workoutName: s.workoutName || 'Workout',
            templateId: s.templateId ? String(s.templateId) : null,
            topExerciseNames: [] as string[],
          }))
          .filter((r) => r.id.length > 0)
        setRecentLogs(await enrichRecentLogsTemplateCategories(fromRpc))
      }

      if (active?.id && active.program_id) {
        const ap = rpc?.activeProgram
        const rpcMatch =
          !rpcErr &&
          ap &&
          ap.assignmentId === active.id &&
          ap.programId === active.program_id

        if (rpcMatch) {
          const dw = ap.displayWeek ?? 1
          let slots = parseWeekSchedule(ap.weekSchedule)
          if (slots.length === 0) {
            slots = await fetchWeekScheduleSlotsClient(
              active.program_id,
              active.id,
              dw
            )
          }
          setActiveProgramSummary({
            assignmentId: active.id,
            programId: active.program_id,
            programName:
              (ap.programName && String(ap.programName)) ||
              active.workout_programs?.name ||
              'Program',
            progressionMode:
              ap.progressionMode ?? active.progression_mode ?? 'auto',
            coachUnlockedWeek:
              ap.coachUnlockedWeek ?? active.coach_unlocked_week ?? null,
            displayWeek: dw,
            requiredCount: ap.requiredSlotsThisWeek ?? 0,
            completedCount: ap.completedRequiredThisWeek ?? 0,
            durationWeeks:
              ap.durationWeeks ?? active.workout_programs?.duration_weeks ?? null,
            weekDays: normalizeWeekDays(ap.weekDays),
            weekScheduleSlots: slots,
          })
        } else {
          const [progRes, schedRes, compRes] = await Promise.all([
            supabase
              .from('program_progress')
              .select('current_week_number')
              .eq('program_assignment_id', active.id)
              .maybeSingle(),
            supabase
              .from('program_schedule')
              .select('id, week_number, is_optional, day_of_week')
              .eq('program_id', active.program_id),
            supabase
              .from('program_day_completions')
              .select('program_schedule_id, notes')
              .eq('program_assignment_id', active.id),
          ])

          const mode = active.progression_mode ?? 'auto'
          const progressWeek =
            (progRes.data as { current_week_number?: number } | null)
              ?.current_week_number ?? null
          const unlocked = active.coach_unlocked_week ?? null
          const displayWeek =
            mode === 'coach_managed' && unlocked != null
              ? unlocked
              : progressWeek ?? 1

          const schedule = (schedRes.data || []) as {
            id: string
            week_number: number
            is_optional: boolean | null
            day_of_week?: number | null
          }[]
          const weekSlots = schedule.filter(
            (s) =>
              s.week_number === displayWeek && !(s.is_optional ?? false)
          )
          const requiredScheduleIds = new Set(weekSlots.map((s) => s.id))
          const completions = (compRes.data || []) as {
            program_schedule_id: string
            notes: string | null
          }[]
          const completedForWeek = completions.filter(
            (c) =>
              requiredScheduleIds.has(c.program_schedule_id) &&
              !String(c.notes || '').startsWith('Skipped by coach')
          )
          const completedIds = new Set(
            completedForWeek.map((c) => c.program_schedule_id)
          )
          const completedCount = weekSlots.filter((s) =>
            completedIds.has(s.id)
          ).length

          const requiredByDay: Record<number, string[]> = {}
          for (const s of weekSlots) {
            const dow =
              typeof s.day_of_week === 'number' &&
              s.day_of_week >= 0 &&
              s.day_of_week <= 6
                ? s.day_of_week
                : 0
            if (!requiredByDay[dow]) requiredByDay[dow] = []
            requiredByDay[dow].push(s.id)
          }
          const weekDays: WeekDayCell[] = Array.from({ length: 7 }, (_, dow) => {
            const ids = requiredByDay[dow] || []
            const hasSlot = ids.length > 0
            const done =
              hasSlot && ids.every((id) => completedIds.has(id))
            return { dow, hasSlot, done }
          })

          const weekScheduleSlots = await fetchWeekScheduleSlotsClient(
            active.program_id,
            active.id,
            displayWeek
          )

          setActiveProgramSummary({
            assignmentId: active.id,
            programId: active.program_id,
            programName: active.workout_programs?.name || 'Program',
            progressionMode: mode,
            coachUnlockedWeek: unlocked,
            displayWeek,
            requiredCount: weekSlots.length,
            completedCount,
            durationWeeks: active.workout_programs?.duration_weeks ?? null,
            weekDays,
            weekScheduleSlots,
          })
        }
      }

      if (!usedRpcRecent) {
      const { data: rawLogs, error: logsErr } = await supabase
        .from('workout_logs')
        .select(
          `
          id,
          started_at,
          completed_at,
          total_duration_minutes,
          total_sets_completed,
          total_weight_lifted,
          workout_assignment_id,
          workout_assignments (
            workout_template_id,
            workout_templates ( id, name, category )
          ),
          workout_set_logs (
            exercise_id,
            exercises ( id, name )
          )
        `
        )
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5)

      if (logsErr) {
        const { data: flatLogs, error: flatErr } = await supabase
          .from('workout_logs')
          .select(
            `id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_weight_lifted, workout_assignment_id`
          )
          .eq('client_id', clientId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(5)

        if (flatErr || !flatLogs?.length) {
          setRecentLogs([])
        } else {
          const assignmentIds = [
            ...new Set(
              flatLogs
                .map((l) => l.workout_assignment_id)
                .filter(Boolean) as string[]
            ),
          ]
          let assignmentById = new Map<
            string,
            { name: string; templateId: string | null; templateCategory: string | null }
          >()
          if (assignmentIds.length > 0) {
            const { data: assigns } = await supabase
              .from('workout_assignments')
              .select(
                `id, workout_template_id, workout_templates ( id, name, category )`
              )
              .in('id', assignmentIds)
            ;(assigns || []).forEach((a: any) => {
              const t = a.workout_templates
              assignmentById.set(a.id, {
                name: t?.name || 'Workout',
                templateId: t?.id ?? null,
                templateCategory: t?.category ?? null,
              })
            })
          }

          const logIds = flatLogs.map((l) => l.id)
          const setsByLog = new Map<string, { exercise_id?: string | null }[]>()
          const { data: allSets } = await supabase
            .from('workout_set_logs')
            .select(`workout_log_id, exercise_id`)
            .in('workout_log_id', logIds)
            .eq('client_id', clientId)
          ;(allSets || []).forEach((s: any) => {
            const lid = s.workout_log_id
            if (!setsByLog.has(lid)) setsByLog.set(lid, [])
            setsByLog.get(lid)!.push(s)
          })

          const exerciseIds = [
            ...new Set(
              (allSets || [])
                .map((s: any) => s.exercise_id)
                .filter(Boolean) as string[]
            ),
          ]
          const exerciseNameById = new Map<string, string>()
          if (exerciseIds.length > 0) {
            const { data: exRows } = await supabase
              .from('exercises')
              .select('id, name')
              .in('id', exerciseIds)
            ;(exRows || []).forEach((ex: any) => {
              if (ex?.name) exerciseNameById.set(ex.id, ex.name)
            })
          }

          const mappedFb: RecentWorkoutLogRow[] = flatLogs.map((row) => {
            const meta = row.workout_assignment_id
              ? assignmentById.get(row.workout_assignment_id)
              : undefined
            const sets = setsByLog.get(row.id) || []
            const nameCount = new Map<string, number>()
            for (const s of sets) {
              const n = s.exercise_id
                ? exerciseNameById.get(s.exercise_id)
                : null
              if (n) nameCount.set(n, (nameCount.get(n) || 0) + 1)
            }
            const topExerciseNames = [...nameCount.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n]) => n)
            return {
              id: row.id,
              started_at: row.started_at,
              completed_at: row.completed_at,
              total_duration_minutes: row.total_duration_minutes,
              total_sets_completed: row.total_sets_completed,
              total_weight_lifted: row.total_weight_lifted,
              workout_assignment_id: row.workout_assignment_id,
              workoutName: meta?.name || 'Workout',
              templateId: meta?.templateId ?? null,
              templateCategory: meta?.templateCategory ?? null,
              topExerciseNames,
            }
          })
          setRecentLogs(mappedFb)
        }
      } else if (!rawLogs?.length) {
        setRecentLogs([])
      } else {
        const mapped: RecentWorkoutLogRow[] = (rawLogs as any[]).map(
          (row) => {
            const wa = row.workout_assignments
            const tpl = wa?.workout_templates
            const sets = (row.workout_set_logs || []) as {
              exercise_id?: string | null
              exercises?: { name?: string | null } | null
            }[]
            const nameCount = new Map<string, number>()
            for (const s of sets) {
              const n = s.exercises?.name?.trim()
              if (n) nameCount.set(n, (nameCount.get(n) || 0) + 1)
            }
            const topExerciseNames = [...nameCount.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n]) => n)

            return {
              id: row.id,
              started_at: row.started_at,
              completed_at: row.completed_at,
              total_duration_minutes: row.total_duration_minutes,
              total_sets_completed: row.total_sets_completed,
              total_weight_lifted: row.total_weight_lifted,
              workout_assignment_id: row.workout_assignment_id,
              workoutName: tpl?.name || 'Workout',
              templateId: tpl?.id ?? null,
              templateCategory: tpl?.category ?? null,
              topExerciseNames,
            }
          }
        )
        setRecentLogs(mapped)
      }
      }
    } catch {
      setWorkouts([])
      setPrograms([])
      setActiveProgramSummary(null)
      setRecentLogs([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadTrainingData()
  }, [loadTrainingData])

  useEffect(() => {
    if (recentLogs.length === 0) {
      setSessionAdherence({})
      return
    }
    const ids = recentLogs.map((l) => l.id).filter(Boolean)
    if (ids.length === 0) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `/api/coach/clients/${clientId}/workout-logs/adherence-batch?logIds=${encodeURIComponent(ids.join(','))}`
        )
        if (!res.ok) return
        const json = (await res.json()) as {
          byLogId?: Record<
            string,
            { adherencePercent: number | null; tier: AdherenceTier | null }
          >
        }
        if (cancelled) return
        setSessionAdherence(json.byLogId ?? {})
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [recentLogs, clientId])

  const scheduleStrip = useMemo(
    () =>
      buildScheduleStripCells(activeProgramSummary?.weekScheduleSlots ?? []),
    [activeProgramSummary?.weekScheduleSlots]
  )

  const startEditWorkoutMeta = (w: WorkoutAssignment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditWorkoutId(w.id)
    const sd = w.scheduled_date
    setEditDate(sd ? String(sd).slice(0, 10) : '')
    setEditNotes(w.notes ?? '')
  }

  const saveWorkoutMeta = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavingWorkoutMeta(true)
    try {
      const { error } = await supabase
        .from('workout_assignments')
        .update({
          scheduled_date: editDate || null,
          notes: editNotes.trim() ? editNotes.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId)
      if (error) throw error
      addToast({ title: 'Assignment updated', variant: 'default' })
      setEditWorkoutId(null)
      await loadTrainingData()
    } catch (err) {
      console.error(err)
      addToast({ title: 'Could not save changes', variant: 'destructive' })
    } finally {
      setSavingWorkoutMeta(false)
    }
  }

  const handleUnassignWorkout = async (workoutId: string) => {
    if (!confirm('Are you sure you want to unassign this workout?')) return

    try {
      const { error } = await supabase
        .from('workout_assignments')
        .delete()
        .eq('id', workoutId)

      if (error) throw error

      await loadTrainingData()
    } catch (error) {
      console.error('Error unassigning workout:', error)
      addToast({ title: "Couldn't unassign workout. Please try again.", variant: "destructive" })
    }
  }

  const setAsActiveWorkout = async (workoutId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: deactivateWorkoutsError } = await supabase
        .from('workout_assignments')
        .update({ status: 'assigned' })
        .eq('client_id', clientId)
        .neq('id', workoutId)

      if (deactivateWorkoutsError) {
        console.error('Error deactivating workouts:', deactivateWorkoutsError)
      }

      const { error: deactivateProgramsError } = await supabase
        .from('program_assignments')
        .update({ status: 'paused' })
        .eq('client_id', clientId)

      if (deactivateProgramsError) {
        console.error('Error deactivating programs:', deactivateProgramsError)
      }

      const { error } = await supabase
        .from('workout_assignments')
        .update({ 
          status: 'in_progress',
          scheduled_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', workoutId)

      if (error) throw error

      addToast({ title: "This workout is now the only in-progress workout for this client.", variant: "success" })
      await loadTrainingData()
    } catch (error) {
      console.error('Error setting active workout:', error)
      addToast({ title: "Couldn't set active workout. Please try again.", variant: "destructive" })
    }
  }

  const handleUnassignProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to unassign this program?')) return

    try {
      const { error } = await supabase
        .from('program_assignments')
        .delete()
        .eq('id', programId)

      if (error) throw error

      await loadTrainingData()
    } catch (error) {
      console.error('Error unassigning program:', error)
      addToast({ title: "Couldn't unassign program. Please try again.", variant: "destructive" })
    }
  }

  const setAsActiveProgram = async (programId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, deactivate ALL workouts for this client
      const { error: deactivateWorkoutsError } = await supabase
        .from('workout_assignments')
        .update({ status: 'assigned' })
        .eq('client_id', clientId)

      if (deactivateWorkoutsError) {
        console.error('Error deactivating workouts:', deactivateWorkoutsError)
      }

      // Deactivate ALL programs for this client (use 'paused' as it's allowed)
      const { error: deactivateProgramsError } = await supabase
        .from('program_assignments')
        .update({ status: 'paused' })
        .eq('client_id', clientId)
        .neq('id', programId) // Don't update the one we're about to activate

      if (deactivateProgramsError) {
        console.error('Error deactivating programs:', deactivateProgramsError)
      }

      // Then, activate this specific program (preserve original start_date)
      const { error } = await supabase
        .from('program_assignments')
        .update({ 
          status: 'active'
        })
        .eq('id', programId)

      if (error) throw error

      addToast({ title: "This program is now the only active program for this client.", variant: "success" })
      await loadTrainingData()
    } catch (error) {
      console.error('Error setting active program:', error)
      addToast({ title: "Couldn't set active program. Please try again.", variant: "destructive" })
    }
  }

  // Navigation handlers - navigate to client-specific detail pages
  const handleWorkoutClick = (workout: any) => {
    if (!workout?.workout_templates?.id) {
      addToast({ title: "Workout template data not available", variant: "destructive" })
      return
    }
    // Navigate to the workout template details page
    router.push(`/coach/workouts/templates/${workout.workout_templates.id}`)
  }

  const handleProgramClick = (program: any) => {
    if (!program?.workout_programs?.id) {
      addToast({ title: "Program data not available", variant: "destructive" })
      return
    }
    // Navigate to the CLIENT-SPECIFIC program details page
    router.push(`/coach/clients/${clientId}/programs/${program.workout_programs.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6"></div>
          </div>
        ))}
      </div>
    )
  }

  const programHubHref = activeProgramSummary
    ? `/coach/clients/${clientId}/programs/${activeProgramSummary.programId}`
    : null

  const formatWeight = (v: number | string | null) => {
    if (v == null || v === '') return '—'
    const n = Number(v)
    if (Number.isNaN(n)) return '—'
    return `${Math.round(n)} kg`
  }

  const overallProgramPct =
    activeProgramSummary &&
    activeProgramSummary.durationWeeks != null &&
    activeProgramSummary.durationWeeks > 0
      ? Math.min(
          100,
          Math.round(
            (activeProgramSummary.displayWeek / activeProgramSummary.durationWeeks) *
              100
          )
        )
      : 0

  const reviewWeekNumber =
    activeProgramSummary != null
      ? activeProgramSummary.coachUnlockedWeek ?? activeProgramSummary.displayWeek
      : 1

  const otherPrograms = activeProgramSummary
    ? programs.filter((p) => p.id !== activeProgramSummary.assignmentId)
    : programs

  const formatSessionDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest fc-text-dim">
          Training
        </h2>
      </div>

      {activeProgramSummary && programHubHref ? (
        <div className="fc-card-shell rounded-3xl border border-[color:var(--fc-glass-border)] border-l-2 border-l-cyan-500 shadow-lg shadow-cyan-500/10 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 bg-gradient-to-br from-cyan-500/5 to-transparent">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <span className="fc-pill fc-pill-glass fc-text-workouts text-[10px] font-bold uppercase tracking-wider">
                  Active program
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold fc-text-primary leading-tight break-words">
                  {activeProgramSummary.programName}
                </h3>
                <p className="text-sm fc-text-dim">
                  Week {activeProgramSummary.displayWeek}
                  {activeProgramSummary.durationWeeks != null &&
                    activeProgramSummary.durationWeeks > 0 &&
                    ` of ${activeProgramSummary.durationWeeks}`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs fc-text-dim">
                <span>Program progress</span>
                <span className="font-mono">{overallProgramPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                  style={{ width: `${overallProgramPct}%` }}
                />
              </div>
            </div>

            <p className="text-base fc-text-primary">
              <span className="font-semibold">This week:</span>{' '}
              <span className="font-bold tabular-nums">
                {activeProgramSummary.completedCount}/
                {activeProgramSummary.requiredCount}
              </span>{' '}
              workouts completed
              {activeProgramSummary.requiredCount === 0 && (
                <span className="block text-xs fc-text-dim mt-2 font-normal">
                  No required slots scheduled for this program week (check the
                  program builder).
                </span>
              )}
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider fc-text-dim">
                Schedule
              </p>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex gap-2 sm:gap-3 min-w-0 justify-between">
                  {scheduleStrip.map((cell) => {
                    const sym =
                      cell.symbol === 'dash'
                        ? '—'
                        : cell.symbol === 'check'
                          ? '✓'
                          : '○'
                    const isDash = cell.symbol === 'dash'
                    const isCheck = cell.symbol === 'check'
                    return (
                      <div
                        key={cell.dayLabel}
                        className="flex-1 min-w-[3rem] max-w-[5.5rem] text-center"
                        title={cell.title}
                      >
                        <div
                          className={`mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold ${
                            isDash
                              ? 'bg-slate-700 border-slate-600 text-slate-300'
                              : isCheck
                                ? 'border-cyan-500 bg-cyan-500 text-white'
                                : 'border-cyan-500/50 bg-transparent text-cyan-200/90'
                          }`}
                        >
                          {sym}
                        </div>
                        <p className="text-[10px] sm:text-xs font-semibold fc-text-subtle">
                          {cell.dayLabel}
                        </p>
                        {cell.line ? (
                          <p className="text-[9px] sm:text-[10px] leading-tight fc-text-dim mt-0.5 line-clamp-2 break-words px-0.5">
                            {cell.line}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                className="fc-btn fc-btn-secondary"
                onClick={() => setReviewModalOpen(true)}
              >
                Review week
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="fc-btn fc-btn-ghost text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
                onClick={() => setCustomizeOpen(true)}
              >
                Customize
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="fc-btn fc-btn-ghost text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
                asChild
              >
                <Link href={programHubHref}>
                  View full program
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fc-card-shell rounded-3xl border border-[color:var(--fc-glass-border)] p-8 sm:p-10 text-center space-y-6">
          <div className="fc-icon-tile fc-icon-workouts mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold fc-text-primary">
              No active program
            </h3>
            <p className="text-sm fc-text-dim mt-2 max-w-md mx-auto">
              Assign a program to get started. You can still add one-off workouts
              anytime.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="fc-btn fc-btn-primary gap-2" asChild>
              <Link href="/coach/programs">
                <Layers className="w-4 h-4 shrink-0" />
                Assign program
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="fc-btn fc-btn-ghost gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
              onClick={() => setAssignWorkoutOpen(true)}
            >
              <Plus className="w-4 h-4 shrink-0" />
              Assign workout
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
        <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold fc-text-primary">
              Recent sessions
            </h3>
            <p className="text-xs fc-text-dim mt-0.5">
              Last completed workouts (from session logs).
            </p>
          </div>
          <Link
            href={`/coach/clients/${clientId}/workout-logs`}
            className="inline-flex items-center gap-1 text-sm font-medium fc-text-workouts hover:underline"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex flex-col border-t border-white/5 px-2 py-1">
          {recentLogs.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={Dumbbell}
              title="No completed sessions yet"
              description="Finished workouts will appear here."
            />
          ) : (
            recentLogs.map((log) => {
              const accent = getCategoryAccent(log.templateCategory || '')
              const ad = sessionAdherence[log.id]
              return (
                <Link
                  key={log.id}
                  href={`/coach/clients/${clientId}/workout-logs/${log.id}`}
                  className={cn(
                    'block border-b border-white/5 py-3 pl-2 transition-colors last:border-b-0 hover:bg-white/[0.02] border-l-2',
                    accent.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2 shrink-0',
                        accent.iconBg
                      )}
                      aria-hidden
                    >
                      <Dumbbell className={cn('w-4 h-4', accent.text)} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0 flex-1">
                      <div className="min-w-0">
                        <p className="text-sm fc-text-dim">
                          {formatSessionDate(log.completed_at)}{' '}
                          <span className="fc-text-dim">—</span>{' '}
                          <span className="font-semibold fc-text-primary">
                            {log.workoutName}
                          </span>
                        </p>
                        <p className="text-xs fc-text-subtle mt-1">
                          {log.total_duration_minutes != null
                            ? `${log.total_duration_minutes} min`
                            : '—'}{' '}
                          ·{' '}
                          {log.total_sets_completed != null
                            ? `${log.total_sets_completed} sets`
                            : '—'}{' '}
                          · {formatWeight(log.total_weight_lifted)} volume
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {ad?.adherencePercent != null && (
                          <span
                            className={cn(
                              'text-xs font-semibold tabular-nums',
                              sessionAdherenceTierClass(ad.tier)
                            )}
                          >
                            {Math.round(ad.adherencePercent)}% on target
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-xs font-medium inline-flex items-center gap-0.5',
                            accent.text
                          )}
                        >
                          Open log
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* Programs Section */}
      {otherPrograms.length > 0 && (
        <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
          <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Programs
                </span>
                <h3 className="text-lg font-semibold fc-text-primary mt-2">
                  Other program assignments
                </h3>
              </div>
              <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
                {otherPrograms.length}
              </span>
            </div>
          </div>
          <div className="px-2 py-1">
            {otherPrograms.map((program) => {
              const programStatus = getProgramStatusMeta(program.status)
              return (
                <div
                  key={program.id}
                  onClick={() => handleProgramClick(program)}
                  className={`border-b border-[color:var(--fc-glass-border)] px-2 py-3 transition-colors w-full cursor-pointer last:border-b-0 ${
                    program.status === 'active' ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="fc-icon-tile fc-icon-workouts">
                        <Target className="w-6 h-6" />
                      </div>

                      {/* Title */}
                      <h4 className="fc-text-primary break-words leading-tight flex-1 min-w-0 text-lg font-semibold">
                        {program.workout_programs?.name || 'Program'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAsActiveProgram(program.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                          title="Set as Active Program"
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        {/* Unassign Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignProgram(program.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                          title="Unassign Program"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                        <span className="fc-text-subtle font-medium">
                          {new Date(program.start_date).toLocaleDateString()}
                        </span>
                      </div>

                      {program.workout_programs?.duration_weeks && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {program.workout_programs.duration_weeks}w
                          </span>
                        </div>
                      )}

                      <span className={`fc-pill fc-pill-glass text-xs ${programStatus.color}`}>
                        {programStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Standalone workout assignments */}
      {workouts.length > 0 && (
      <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
        <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Workouts
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Standalone workout assignments
              </h3>
              <p className="text-xs fc-text-dim mt-1">
                One-off assignments outside the active program calendar.
              </p>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
              {workouts.length}
            </span>
          </div>
        </div>
        <div className="px-2 py-1">
            {workouts.map((workout) => {
              const workoutStatus = getWorkoutStatusMeta(workout.status)
              return (
                <div 
                  key={workout.id} 
                  data-workout-id={workout.id}
                  onClick={() => handleWorkoutClick(workout)}
                  className={`border-b border-[color:var(--fc-glass-border)] px-2 py-3 transition-colors w-full cursor-pointer last:border-b-0 ${
                    workout.status === 'in_progress' ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                    {/* Row 1: Icon, Title, Button */}
                    <div className="flex items-center gap-4 w-full">
                      {/* Icon */}
                      <div className="fc-icon-tile fc-icon-workouts">
                        <Dumbbell className="w-6 h-6" />
                      </div>

                      {/* Title */}
                      <h4 className="fc-text-primary break-words leading-tight flex-1 min-w-0 text-lg font-semibold">
                        {workout.workout_templates?.name || 'Workout'}
                      </h4>

                      {/* Action Buttons - Right Side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Set as Active Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAsActiveWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                          title="Set as Today's Workout"
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        {/* Unassign Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                          title="Unassign Workout"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Details - Mobile: Full width, Desktop: Side */}
                    <div className="flex items-center gap-2 text-xs sm:ml-0 sm:flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                        <span className="fc-text-subtle font-medium">
                          {workout.scheduled_date
                            ? new Date(workout.scheduled_date).toLocaleDateString()
                            : 'No date'}
                        </span>
                      </div>

                      {workout.workout_templates?.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 fc-text-workouts flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {workout.workout_templates.estimated_duration}m
                          </span>
                        </div>
                      )}

                      {workout.workout_templates?.difficulty_level && (
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 fc-text-warning flex-shrink-0" />
                          <span className="fc-text-subtle font-medium">
                            {workout.workout_templates.difficulty_level}
                          </span>
                        </div>
                      )}

                      <span className={`fc-pill fc-pill-glass text-xs ${workoutStatus.color}`}>
                        {workoutStatus.label}
                      </span>
                    </div>
                  </div>

                  {editWorkoutId === workout.id && (
                    <div
                      className="mt-4 pt-4 border-t border-[color:var(--fc-glass-border)] space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="text-xs fc-text-dim block mb-1">Scheduled date</label>
                        <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs fc-text-dim block mb-1">Notes</label>
                        <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes for this assignment" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="fc-btn fc-btn-primary"
                          disabled={savingWorkoutMeta}
                          onClick={(e) => saveWorkoutMeta(workout.id, e)}
                        >
                          {savingWorkoutMeta ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="fc-btn fc-btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditWorkoutId(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start pt-2 border-t border-[color:var(--fc-glass-border)]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="fc-btn fc-btn-ghost gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
          onClick={() => setAssignWorkoutOpen(true)}
        >
          <Plus className="w-4 h-4 shrink-0" />
          Assign workout
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="fc-btn fc-btn-ghost gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
          asChild
        >
          <Link href="/coach/programs">
            <Layers className="w-4 h-4 shrink-0" />
            Assign program
          </Link>
        </Button>
      </div>
    </div>

    {activeProgramSummary && (
      <>
        <WeekReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          onComplete={() => {
            setReviewModalOpen(false)
            void loadTrainingData()
          }}
          programAssignmentId={activeProgramSummary.assignmentId}
          programId={activeProgramSummary.programId}
          weekNumber={reviewWeekNumber}
          clientName={clientName || 'Client'}
        />
        <ResponsiveModal
          isOpen={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          title="Customize progression"
          subtitle="Per-client loads, reps, and swaps for this program."
          maxWidth="5xl"
        >
          <div className="max-h-[min(80vh,720px)] overflow-y-auto pr-1">
            <ClientProgressionEditor
              programAssignmentId={activeProgramSummary.assignmentId}
              programId={activeProgramSummary.programId}
              clientId={clientId}
              durationWeeks={
                activeProgramSummary.durationWeeks != null &&
                activeProgramSummary.durationWeeks > 0
                  ? activeProgramSummary.durationWeeks
                  : 1
              }
              defaultWeek={activeProgramSummary.displayWeek}
              initialOpen
            />
          </div>
        </ResponsiveModal>
      </>
    )}

    <WorkoutAssignmentModal
      isOpen={assignWorkoutOpen}
      onClose={() => setAssignWorkoutOpen(false)}
      onSuccess={() => {
        void loadTrainingData()
      }}
      preselectedClientProfileId={clientId}
    />
    </>
  )
}