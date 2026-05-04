'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Dumbbell,
  X,
  Star,
  Plus,
  ExternalLink,
  ChevronRight,
  Minus,
  Check,
  Eye,
  Pencil,
  Building2,
  ClipboardList,
} from 'lucide-react'
import ClientDetailHero from '@/components/coach/client-detail/ClientDetailHero'
import tw from './ClientWorkoutsView.module.css'
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
import { computeCurrentProgramWeekForAssignment } from '@/lib/programWeekCalendar'

// Data mapping: workout_assignments -> workout_templates -> workout_set_entries ->
// workout_set_entry_exercises -> protocol tables (workout_time_protocols,
// workout_cluster_sets, workout_rest_pause_sets, workout_drop_sets, workout_speed_sets, workout_endurance_sets)
interface ClientWorkoutsViewProps {
  clientId: string
}

interface WorkoutAssignment {
  id: string
  name?: string
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
  pause_status?: string | null
  paused_at?: string | null
  pause_accumulated_days?: number | null
  timezone_snapshot?: string | null
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

function mondayFirstDow(d = new Date()) {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

type DayPillState = 'empty' | 'assigned' | 'done'

function dayPillStateForDow(dow: number, slots: WeekScheduleSlot[]): DayPillState {
  const daySlots = slots.filter((s) => s.dayOfWeek === dow)
  if (daySlots.length === 0) return 'empty'
  const required = daySlots.filter((s) => !s.isOptional)
  const check = required.length > 0 ? required : daySlots
  return check.every((s) => s.isCompleted) ? 'done' : 'assigned'
}

type StandaloneGroup = { key: string; sortKey: number; items: WorkoutAssignment[] }

function buildStandaloneGroups(workouts: WorkoutAssignment[]): StandaloneGroup[] {
  const map = new Map<string, { sortKey: number; items: WorkoutAssignment[] }>()
  for (const w of workouts) {
    const dateStr = w.scheduled_date ?? w.created_at?.slice(0, 10) ?? ''
    const t = dateStr ? new Date(`${dateStr}T12:00:00`).getTime() : 0
    const mmm = dateStr
      ? new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })
      : '—'
    const tpl =
      w.workout_templates?.name?.trim() || w.name?.trim() || 'Workout'
    const key = `${mmm} — ${tpl}`
    const g = map.get(key) ?? { sortKey: t, items: [] as WorkoutAssignment[] }
    g.items.push(w)
    g.sortKey = Math.max(g.sortKey, t)
    map.set(key, g)
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, sortKey: v.sortKey, items: v.items }))
    .sort((a, b) => b.sortKey - a.sortKey)
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
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [totalCompletedLogs, setTotalCompletedLogs] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const loadTrainingData = useCallback(async () => {
    setLoading(true)
    setActiveProgramSummary(null)
    setRecentLogs([])

    try {
      const [waRes, paRes, logCountRes] = await Promise.all([
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
        supabase
          .from('workout_logs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .not('completed_at', 'is', null),
      ])
      setTotalCompletedLogs(logCountRes.count ?? 0)

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
              ap.coachUnlockedWeek ?? null,
            displayWeek: dw,
            requiredCount: ap.requiredSlotsThisWeek ?? 0,
            completedCount: ap.completedRequiredThisWeek ?? 0,
            durationWeeks:
              ap.durationWeeks ?? active.workout_programs?.duration_weeks ?? null,
            weekDays: normalizeWeekDays(ap.weekDays),
            weekScheduleSlots: slots,
          })
        } else {
          const [schedRes, compRes] = await Promise.all([
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
          const displayWeek = computeCurrentProgramWeekForAssignment(
            {
              start_date: active.start_date ?? null,
              pause_accumulated_days: active.pause_accumulated_days ?? 0,
              pause_status: active.pause_status ?? null,
              paused_at: active.paused_at ?? null,
              timezone_snapshot: active.timezone_snapshot ?? null,
              duration_weeks: active.workout_programs?.duration_weeks ?? null,
            },
            active.timezone_snapshot ?? 'UTC'
          ).week

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
            coachUnlockedWeek: null,
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
      setTotalCompletedLogs(0)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadTrainingData()
  }, [loadTrainingData])

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

  const standaloneGroups = useMemo(
    () => buildStandaloneGroups(workouts),
    [workouts]
  )

  const todayDowMonday = useMemo(() => mondayFirstDow(), [])

  const weekSlots = activeProgramSummary?.weekScheduleSlots ?? []

  const heroEyebrow = activeProgramSummary
    ? `Active program · W${activeProgramSummary.displayWeek} / ${activeProgramSummary.durationWeeks ?? '—'}`
    : 'Training'

  const heroTitle = activeProgramSummary?.programName ?? 'No active program'

  const heroSubtitle = activeProgramSummary
    ? `${overallProgramPct}% complete · Active program, session history, and assignments`
    : 'Assign a program to get started'

  const heroStats = [
    { num: recentLogs.length, label: 'recent sessions' },
    {
      num: activeProgramSummary ? programs.length : 0,
      label: 'programs',
    },
    { num: totalCompletedLogs, label: 'workouts' },
  ]

  const requiredSlotsRight =
    activeProgramSummary && activeProgramSummary.requiredCount === 0
      ? 'No required slots'
      : activeProgramSummary
        ? `${Math.max(0, activeProgramSummary.requiredCount - activeProgramSummary.completedCount)} remaining`
        : ''

  return (
    <>
    <div className="space-y-4">
      <ClientDetailHero
        eyebrow={heroEyebrow}
        title={heroTitle}
        subtitle={heroSubtitle}
        stats={heroStats}
        accent="lime"
      />

      {activeProgramSummary && programHubHref ? (
        <div className={tw.activeCard}>
          <div className={tw.activeInner}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[color:var(--fc-set-type-straight)]">
                  Active program
                </span>
                <h3
                  className="max-w-full break-words text-[17px] font-bold leading-tight text-[color:var(--fc-text-primary)]"
                  style={{ fontFamily: 'var(--f-headline, var(--font-geist-sans))' }}
                >
                  {activeProgramSummary.programName}
                </h3>
                <p className="text-[11px] text-[color:var(--fc-text-subtle)]">
                  Week {activeProgramSummary.displayWeek}
                  {activeProgramSummary.durationWeeks != null &&
                  activeProgramSummary.durationWeeks > 0
                    ? ` of ${activeProgramSummary.durationWeeks}`
                    : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="text-[24px] font-extrabold leading-none text-[color:var(--fc-set-type-straight)]"
                  style={{ fontFamily: 'var(--f-display, var(--font-geist-sans))' }}
                >
                  {overallProgramPct}%
                </div>
                <div className="mt-[3px] font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fc-text-subtle)]">
                  Progress
                </div>
              </div>
            </div>

            <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[color:var(--fc-set-type-straight)] to-[color:var(--fc-accent-lime-2)]"
                style={{ width: `${overallProgramPct}%` }}
              />
            </div>

            <div className={tw.metaRow}>
              <span>
                This week · {activeProgramSummary.completedCount}/
                {activeProgramSummary.requiredCount} workouts
              </span>
              <span className={tw.metaRight}>{requiredSlotsRight}</span>
            </div>

            <div className={tw.dayGrid}>
              {SCHEDULE_DAY_LABELS.map((label, dow) => {
                const state = dayPillStateForDow(dow, weekSlots)
                const isToday = dow === todayDowMonday
                const iconCls =
                  state === 'empty'
                    ? tw.iconEmpty
                    : state === 'done'
                      ? tw.iconDone
                      : tw.iconAssigned
                return (
                  <div
                    key={label}
                    className={cn(tw.dayPill, isToday && tw.dayPillToday)}
                    title={label}
                  >
                    <span className={cn(tw.dayLabel, isToday && tw.dayLabelToday)}>{label}</span>
                    <div className={cn(tw.dayIcon, iconCls)}>
                      {state === 'empty' ? (
                        <Minus className="h-3 w-3" aria-hidden />
                      ) : state === 'done' ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : (
                        <Dumbbell className="h-3 w-3" aria-hidden />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={tw.actionGrid3}>
              <button
                type="button"
                className={tw.btnOutlineSm}
                onClick={() => setReviewModalOpen(true)}
              >
                <Eye className="h-[13px] w-[13px]" aria-hidden />
                Review
              </button>
              <button
                type="button"
                className={tw.btnOutlineSm}
                onClick={() => setCustomizeOpen(true)}
              >
                <Pencil className="h-[13px] w-[13px]" aria-hidden />
                Customize
              </button>
              <Link href={programHubHref} className={tw.btnOutlineSm}>
                <ExternalLink className="h-[13px] w-[13px]" aria-hidden />
                Full plan
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(tw.section, 'text-center')}>
          <p className="text-sm text-[color:var(--fc-text-subtle)]">
            No active program · Assign one to schedule weekly workouts
          </p>
          <Button className="fc-btn fc-btn-primary mx-auto mt-4 gap-2" asChild>
            <Link href="/coach/programs">
              <ClipboardList className="w-4 h-4 shrink-0" />
              Assign program
            </Link>
          </Button>
        </div>
      )}

      <div className={tw.section}>
        <div className={tw.sectionHead}>
          <div>
            <h3
              className="text-base font-semibold text-[color:var(--fc-text-primary)]"
              style={{ fontFamily: 'var(--f-headline, var(--font-geist-sans))' }}
            >
              Recent sessions
            </h3>
            <p className="mt-0.5 font-mono text-[10px] text-[color:var(--fc-text-quaternary)]">
              Last completed
            </p>
          </div>
          <Link
            href={`/coach/clients/${clientId}/workout-logs`}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color:var(--fc-set-type-straight)]"
          >
            View all
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Dumbbell}
            title="No completed sessions yet"
            description="Finished workouts will appear here."
          />
        ) : (
          recentLogs.map((log) => (
            <Link
              key={log.id}
              href={`/coach/clients/${clientId}/workout-logs/${log.id}`}
              className={tw.sessionRow}
            >
              <div className={tw.sessionIcon} aria-hidden>
                <Dumbbell className="h-[13px] w-[13px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-[color:var(--fc-text-primary)]">
                  <b>{log.workoutName}</b>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-[color:var(--fc-text-subtle)]">
                  {formatSessionDate(log.completed_at)} ·{' '}
                  {log.total_duration_minutes != null ? `${log.total_duration_minutes}min` : '—'} ·{' '}
                  {log.total_sets_completed != null ? `${log.total_sets_completed} sets` : '—'} ·{' '}
                  {formatWeight(log.total_weight_lifted)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-[color:var(--fc-set-type-straight)]">
                Open
                <ChevronRight className="h-2.5 w-2.5" aria-hidden />
              </span>
            </Link>
          ))
        )}
      </div>

      {otherPrograms.length > 0 && (
        <div className={tw.section}>
          <div className={tw.sectionHead}>
            <div>
              <div className={tw.eyebrowCyan}>Programs · {otherPrograms.length}</div>
              <h3
                className="mt-1 text-[15px] font-semibold text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: 'var(--f-headline, var(--font-geist-sans))' }}
              >
                Other assignments
              </h3>
            </div>
            <span className={tw.countPill}>{otherPrograms.length}</span>
          </div>
          {otherPrograms.map((program) => {
            const badgeCls =
              program.status === 'completed'
                ? tw.badgeDone
                : program.status === 'active' || program.status === 'paused'
                  ? tw.badgeProg
                  : tw.badgeAssigned
            const badgeText =
              program.status === 'completed'
                ? 'Done'
                : program.status === 'active' || program.status === 'paused'
                  ? 'In progress'
                  : 'Assigned'
            return (
              <div
                key={program.id}
                role="button"
                tabIndex={0}
                onClick={() => handleProgramClick(program)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleProgramClick(program)
                  }
                }}
                className={tw.programRow}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                  style={{
                    background: 'var(--fc-set-type-straight-soft)',
                    color: 'var(--fc-set-type-straight)',
                  }}
                >
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                </div>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[color:var(--fc-text-primary)]">
                  {program.workout_programs?.name || 'Program'}
                </span>
                <span className={cn(tw.badge, badgeCls)}>{badgeText}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAsActiveProgram(program.id)
                  }}
                  className="fc-btn fc-btn-ghost fc-press h-7 w-7 shrink-0 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                  title="Set as Active Program"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnassignProgram(program.id)
                  }}
                  className="fc-btn fc-btn-ghost fc-press h-7 w-7 shrink-0 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                  title="Unassign Program"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {workouts.length > 0 && (
        <div className={tw.section}>
          <div className={tw.sectionHead}>
            <div>
              <div className={tw.eyebrowCyan}>Workouts · {workouts.length}</div>
              <h3
                className="mt-1 text-[15px] font-semibold text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: 'var(--f-headline, var(--font-geist-sans))' }}
              >
                Standalone assignments
              </h3>
            </div>
            <span className={tw.countPill}>{workouts.length}</span>
          </div>
          {standaloneGroups.map((group) => {
            const expanded = expandedGroups[group.key] === true
            const limit = 3
            const rows = expanded ? group.items : group.items.slice(0, limit)
            const hidden = group.items.length - rows.length
            return (
              <div key={group.key} className="mb-3">
                <div className={tw.groupHead}>
                  <div className={tw.groupTitle}>{group.key}</div>
                  <span className={tw.countPill}>{group.items.length} sessions</span>
                </div>
                {rows.map((workout) => {
                  const wBadge =
                    workout.status === 'completed'
                      ? { t: 'Done', c: tw.badgeDone }
                      : workout.status === 'in_progress'
                        ? { t: 'In progress', c: tw.badgeProg }
                        : { t: 'Assigned', c: tw.badgeAssigned }
                  const dateStr = workout.scheduled_date
                    ? new Date(workout.scheduled_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'
                  return (
                    <React.Fragment key={workout.id}>
                      <div
                        data-workout-id={workout.id}
                        className={tw.groupRow}
                        onClick={() => handleWorkoutClick(workout)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleWorkoutClick(workout)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--fc-text-subtle)',
                          }}
                        >
                          <Dumbbell className="h-3.5 w-3.5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="truncate text-[12px] font-medium text-[color:var(--fc-text-primary)]">
                            {workout.workout_templates?.name || workout.name || 'Workout'}
                          </span>
                          {workout.workout_templates?.difficulty_level ? (
                            <span className="text-[10px] text-[color:var(--fc-text-subtle)]">
                              {' '}
                              · {workout.workout_templates.difficulty_level}
                            </span>
                          ) : null}
                          <div className="mt-0.5 font-mono text-[9.5px] text-[color:var(--fc-text-subtle)]">
                            {dateStr}
                          </div>
                        </div>
                        <span className={cn(tw.badge, wBadge.c)}>{wBadge.t}</span>
                        <button
                          type="button"
                          onClick={(e) => startEditWorkoutMeta(workout, e)}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 shrink-0 p-0 border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-subtle)]"
                          title="Edit date & notes"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAsActiveWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 shrink-0 p-0 fc-text-warning border border-[color:var(--fc-status-warning)]"
                          title="Set as Today's Workout"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignWorkout(workout.id)
                          }}
                          className="fc-btn fc-btn-ghost fc-press h-7 w-7 shrink-0 p-0 fc-text-error border border-[color:var(--fc-status-error)]"
                          title="Unassign Workout"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {editWorkoutId === workout.id ? (
                        <div
                          className="mt-2 space-y-3 rounded-[11px] border border-[color:var(--fc-divider)] p-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <label className="mb-1 block text-xs text-[color:var(--fc-text-subtle)]">
                              Scheduled date
                            </label>
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[color:var(--fc-text-subtle)]">
                              Notes
                            </label>
                            <Input
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Optional notes for this assignment"
                            />
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
                              onClick={() => setEditWorkoutId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </React.Fragment>
                  )
                })}
                {!expanded && hidden > 0 ? (
                  <button
                    type="button"
                    className={tw.expandBtn}
                    onClick={() =>
                      setExpandedGroups((m) => ({ ...m, [group.key]: true }))
                    }
                  >
                    Show all in {group.key.split(' — ')[0] ?? 'group'} ({hidden} more)
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div className={tw.bottomGrid}>
        <button type="button" className={tw.btnOutline} onClick={() => setAssignWorkoutOpen(true)}>
          <Plus className="h-[13px] w-[13px]" aria-hidden />
          Assign workout
        </button>
        <Link href="/coach/programs" className={tw.btnCyan}>
          <ClipboardList className="h-[13px] w-[13px]" aria-hidden />
          Assign program
        </Link>
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