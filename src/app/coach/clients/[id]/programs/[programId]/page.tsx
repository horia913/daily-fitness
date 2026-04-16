'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { useCoachClient } from '@/contexts/CoachClientContext'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Target,
  Users,
  Star,
  Edit,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  SkipForward,
  X,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import ClientProgressionEditor from '@/components/coach/client-views/ClientProgressionEditor'
import { WeekReviewModal } from '@/components/coach/WeekReviewModal'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  getAssignmentSchedule,
  getProgramScheduleSlotsForAssignment,
  getCompletedSlots,
  type AssignmentScheduleSlot,
} from '@/lib/programStateService'
import {
  diffCalendarDaysYmd,
  normalizeClientTimezone,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
} from '@/lib/clientZonedCalendar'

interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  coach_id: string
  start_date: string
  status: string
  total_days: number
  created_at: string
  progression_mode?: string
  coach_unlocked_week?: number | null
  pause_status?: string | null
  paused_at?: string | null
  pause_reason?: string | null
  pause_accumulated_days?: number | null
  workout_programs?: {
    id: string
    name: string
    description?: string
    difficulty_level: string
    duration_weeks: number
    target_audience: string
  }
}

interface CoachTemplateOption {
  id: string
  name: string
  estimated_duration?: number | null
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function ClientProgramDetailsContent() {
  const params = useParams()
  const { clientName: contextClientName } = useCoachClient()
  const { addToast } = useToast()
  
  const clientId = params.id as string
  const programId = params.programId as string
  
  const [assignment, setAssignment] = useState<ProgramAssignment | null>(null)
  /** Per-client snapshot rows (canonical schedule). */
  const [snapshotRows, setSnapshotRows] = useState<AssignmentScheduleSlot[]>([])
  /** program_day_assignments.id → program_schedule.id (for completions + skip-day). */
  const [scheduleIdByPdaId, setScheduleIdByPdaId] = useState<Record<string, string>>({})
  const [snapshotTemplateNames, setSnapshotTemplateNames] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // Skip-day state
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set())
  const [skippedScheduleIds, setSkippedScheduleIds] = useState<Set<string>>(new Set())
  const [skipReason, setSkipReason] = useState('')
  const [skipLoading, setSkipLoading] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [clientTz, setClientTz] = useState('UTC')
  const [pauseModalOpen, setPauseModalOpen] = useState(false)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)
  const [pauseReasonDraft, setPauseReasonDraft] = useState('')
  const [pauseBusy, setPauseBusy] = useState(false)

  const [snapshotEditorOpen, setSnapshotEditorOpen] = useState(false)
  const [editingSnapshot, setEditingSnapshot] = useState<AssignmentScheduleSlot | null>(null)
  const [coachTemplates, setCoachTemplates] = useState<CoachTemplateOption[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [snapshotSaveBusy, setSnapshotSaveBusy] = useState(false)
  const [masterHasOptionalDays, setMasterHasOptionalDays] = useState(false)

  const difficultyColors: Record<string, string> = {
    'beginner': 'fc-text-success',
    'intermediate': 'fc-text-warning',
    'advanced': 'fc-text-error'
  }

  const targetAudienceLabels: Record<string, string> = {
    'general_fitness': 'General Fitness',
    'weight_loss': 'Weight Loss',
    'muscle_gain': 'Muscle Gain',
    'strength': 'Strength',
    'endurance': 'Endurance',
    'athletic_performance': 'Athletic Performance'
  }

  const statusColors: Record<string, string> = {
    'active': 'fc-text-success',
    'paused': 'fc-text-warning',
    'completed': 'fc-text-trust',
    'cancelled': 'fc-text-error'
  }

  const programDetailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (programDetailTimeoutRef.current) clearTimeout(programDetailTimeoutRef.current)
    programDetailTimeoutRef.current = setTimeout(() => {
      programDetailTimeoutRef.current = null
      setLoading(false)
    }, 20_000)
    loadData().finally(() => {
      if (programDetailTimeoutRef.current) {
        clearTimeout(programDetailTimeoutRef.current)
        programDetailTimeoutRef.current = null
      }
    })
    return () => {
      if (programDetailTimeoutRef.current) {
        clearTimeout(programDetailTimeoutRef.current)
        programDetailTimeoutRef.current = null
      }
    }
  }, [clientId, programId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load program assignment with program details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('program_assignments')
        .select('*, workout_programs(*)')
        .eq('client_id', clientId)
        .eq('program_id', programId)
        .single()

      if (assignmentError) {
        console.error('Error loading assignment:', assignmentError)
      } else if (assignmentData) {
        setAssignment(assignmentData)
      }

      const { data: profTz } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', clientId)
        .maybeSingle()
      setClientTz(normalizeClientTimezone((profTz as { timezone?: string | null } | null)?.timezone))

      if (assignmentData?.id) {
        const [snaps, slots, completedList, progressData, completionsData, psOptional] =
          await Promise.all([
            getAssignmentSchedule(supabase, assignmentData.id),
            getProgramScheduleSlotsForAssignment(supabase, programId, assignmentData.id),
            getCompletedSlots(supabase, assignmentData.id),
            supabase
              .from('program_progress')
              .select('*')
              .eq('program_assignment_id', assignmentData.id)
              .maybeSingle()
              .then((r) => r.data),
            supabase
              .from('program_day_completions')
              .select('program_schedule_id, notes')
              .eq('program_assignment_id', assignmentData.id)
              .then((r) => r.data ?? []),
            supabase
              .from('program_schedule')
              .select('is_optional')
              .eq('program_id', programId)
              .then((r) => r.data ?? []),
          ])

        setSnapshotRows(snaps)

        const idMap: Record<string, string> = {}
        for (const snap of snaps) {
          const slot = slots.find(
            (s) => s.week_number === snap.week_number && s.day_number === snap.program_day
          )
          if (slot) idMap[snap.id] = slot.id
        }
        setScheduleIdByPdaId(idMap)

        const completedFromLogs = new Set(
          completedList.map((c) => c.program_schedule_id).filter(Boolean)
        )
        setCompletedScheduleIds(completedFromLogs)

        const skippedIds = new Set<string>()
        completionsData.forEach((c: { program_schedule_id: string; notes?: string | null }) => {
          if (c.notes?.startsWith('Skipped by coach')) {
            skippedIds.add(c.program_schedule_id)
          }
        })
        setSkippedScheduleIds(skippedIds)

        if (progressData) setProgress(progressData)

        const anyOptional = (psOptional as { is_optional?: boolean }[]).some((r) => r.is_optional === true)
        setMasterHasOptionalDays(anyOptional)

        const tmplIds = [...new Set(snaps.map((s) => s.workout_template_id).filter(Boolean) as string[])]
        const nameById: Record<string, string> = {}
        if (tmplIds.length > 0) {
          const { data: tmplRows } = await supabase
            .from('workout_templates')
            .select('id, name')
            .in('id', tmplIds)
          for (const t of tmplRows ?? []) {
            const row = t as { id: string; name: string | null }
            nameById[row.id] = row.name ?? 'Workout'
          }
        }
        setSnapshotTemplateNames(nameById)

        if (assignmentData.coach_id) {
          const { data: coachTpl } = await supabase
            .from('workout_templates')
            .select('id, name, estimated_duration')
            .eq('coach_id', assignmentData.coach_id)
            .order('name', { ascending: true })
            .limit(200)
          setCoachTemplates((coachTpl ?? []) as CoachTemplateOption[])
        } else {
          setCoachTemplates([])
        }
      } else {
        setSnapshotRows([])
        setScheduleIdByPdaId({})
        setCompletedScheduleIds(new Set())
        setSkippedScheduleIds(new Set())
        setSnapshotTemplateNames({})
        setCoachTemplates([])
        setMasterHasOptionalDays(false)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!assignment) return
    
    try {
      const { error } = await supabase
        .from('program_assignments')
        .update({ status: newStatus })
        .eq('id', assignment.id)

      if (error) throw error
      
      setAssignment({ ...assignment, status: newStatus })
      addToast({ title: `Program status updated to ${newStatus}`, variant: 'default' })
    } catch (error) {
      console.error('Error updating status:', error)
      addToast({ title: 'Failed to update program status', variant: 'destructive' })
    }
  }

  const handleSkipDay = async (scheduleId: string) => {
    if (!assignment) return
    setSkipLoading(true)
    try {
      const res = await fetch('/api/coach/program-assignments/skip-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programAssignmentId: assignment.id,
          programScheduleId: scheduleId,
          reason: skipReason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast({ title: data.error || 'Failed to skip day', variant: 'destructive' })
        return
      }
      setSkippedScheduleIds((prev) => new Set([...prev, scheduleId]))
      setSkipReason('')
      await loadData()
    } catch (err) {
      console.error('Error skipping day:', err)
      addToast({ title: 'Unexpected error — please try again', variant: 'destructive' })
    } finally {
      setSkipLoading(false)
    }
  }

  const reviewWeekNumber =
    progress?.current_week_number ??
    (progress?.current_week_index != null ? progress.current_week_index + 1 : 1)

  const pausedDaysSoFar =
    assignment?.paused_at && clientTz
      ? Math.max(
          0,
          diffCalendarDaysYmd(
            zonedYmdFromIsoTimestamp(assignment.paused_at, clientTz),
            zonedCalendarDateString(new Date(), clientTz)
          )
        )
      : 0

  const submitPause = async () => {
    if (!assignment) return
    setPauseBusy(true)
    try {
      const res = await fetch(`/api/coach/program-assignments/${assignment.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: pauseReasonDraft.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Pause failed')
      addToast({ title: 'Program paused', variant: 'default' })
      setPauseModalOpen(false)
      setPauseReasonDraft('')
      await loadData()
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : 'Pause failed',
        variant: 'destructive',
      })
    } finally {
      setPauseBusy(false)
    }
  }

  const submitResume = async () => {
    if (!assignment) return
    setPauseBusy(true)
    try {
      const res = await fetch(`/api/coach/program-assignments/${assignment.id}/pause`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Resume failed')
      addToast({ title: 'Program resumed', variant: 'default' })
      setResumeModalOpen(false)
      await loadData()
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : 'Resume failed',
        variant: 'destructive',
      })
    } finally {
      setPauseBusy(false)
    }
  }

  const program = assignment?.workout_programs
  const clientName = contextClientName || 'Client'

  const gridWeeks = React.useMemo(
    () => [...new Set(snapshotRows.map((s) => s.week_number))].sort((a, b) => a - b),
    [snapshotRows]
  )

  const workoutDayCount = React.useMemo(
    () => snapshotRows.filter((s) => s.day_type === 'workout').length,
    [snapshotRows]
  )

  const openSnapshotEditor = (snap: AssignmentScheduleSlot) => {
    setEditingSnapshot(snap)
    setTemplateSearch('')
    setSnapshotEditorOpen(true)
  }

  const runSnapshotPatch = async (body: Record<string, unknown>) => {
    if (!assignment || !editingSnapshot) return
    setSnapshotSaveBusy(true)
    try {
      const res = await fetch(
        `/api/coach/clients/${clientId}/program-assignments/${assignment.id}/snapshot/${editingSnapshot.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Save failed')
      addToast({ title: 'Schedule updated', variant: 'default' })
      setSnapshotEditorOpen(false)
      setEditingSnapshot(null)
      await loadData()
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : 'Save failed',
        variant: 'destructive',
      })
    } finally {
      setSnapshotSaveBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="fc-page max-w-7xl mx-auto w-full">
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 rounded-xl bg-[color:var(--fc-glass-highlight)] w-1/3"></div>
            <div className="h-4 rounded-xl bg-[color:var(--fc-glass-highlight)] w-2/3"></div>
            <div className="h-64 rounded-xl bg-[color:var(--fc-glass-highlight)]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!assignment || !program) {
    return (
      <div className="fc-page max-w-7xl mx-auto w-full">
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 fc-text-error" />
          <h2 className="text-xl font-bold fc-text-primary mb-2">Program Not Found</h2>
          <p className="fc-text-dim mb-4">This program assignment could not be found.</p>
          <Link
            href={`/coach/clients/${clientId}`}
            className="inline-flex p-3 rounded-xl border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)] mx-auto"
            aria-label="Back to client hub"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
      <div className="fc-page flex flex-col w-full max-w-7xl mx-auto" style={{ gap: "var(--fc-gap-sections)" }}>
        {/* Back */}
        <Link
          href={`/coach/clients/${clientId}`}
          className="fc-surface inline-flex p-2.5 rounded-xl border border-[color:var(--fc-surface-card-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-highlight)]/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]"
          aria-label="Back to client hub"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>

        {/* Header */}
        <div className="fc-card-shell p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="fc-icon-tile fc-icon-workouts w-14 h-14">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="fc-pill fc-pill-glass fc-text-workouts">Program Assignment</span>
                  <span className={`fc-pill fc-pill-glass ${statusColors[assignment.status] || 'fc-text-subtle'}`}>
                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold fc-text-primary">
                  {program.name}
                </h1>
                <p className="fc-text-dim mt-1">
                  Assigned to <span className="fc-text-primary font-medium">{clientName}</span>
                </p>
                <p className="text-sm fc-text-subtle mt-1">
                  Started {new Date(assignment.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {assignment.status === 'active' && (
                <Button 
                  variant="outline" 
                  className="fc-btn fc-btn-secondary"
                  onClick={() => handleStatusChange('paused')}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              {assignment.status === 'paused' && (
                <Button 
                  className="fc-btn fc-btn-primary"
                  onClick={() => handleStatusChange('active')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {assignment.status !== 'completed' && (
                <Button 
                  variant="outline"
                  className="fc-btn fc-btn-ghost fc-text-success"
                  onClick={() => handleStatusChange('completed')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              <Link href={`/coach/programs/${program.id}/edit`}>
                <Button variant="outline" className="fc-btn fc-btn-secondary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Program
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Program Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">{program.duration_weeks}</p>
                <p className="text-sm fc-text-dim">Weeks</p>
              </div>
            </div>
          </div>

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">{workoutDayCount}</p>
                <p className="text-sm fc-text-dim">Workout days</p>
              </div>
            </div>
          </div>

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-habits w-10 h-10">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold fc-text-primary">
                  {targetAudienceLabels[program.target_audience] || program.target_audience}
                </p>
                <p className="text-sm fc-text-dim">Target</p>
              </div>
            </div>
          </div>

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-warning w-10 h-10">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-lg font-bold ${difficultyColors[program.difficulty_level] || 'fc-text-primary'}`}>
                  {program.difficulty_level?.charAt(0).toUpperCase() + program.difficulty_level?.slice(1)}
                </p>
                <p className="text-sm fc-text-dim">Level</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="fc-card-shell p-6">
          <h2 className="text-xl font-bold fc-text-primary mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 fc-text-workouts" />
            Client Progress
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim">Current Week</p>
              <p className="text-2xl font-bold fc-text-primary">
                {progress?.current_week_number ??
                  ((progress as { current_week_index?: number } | null)?.current_week_index != null
                    ? (progress as { current_week_index: number }).current_week_index + 1
                    : '—')}
              </p>
            </div>
            <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim">Current Day</p>
              <p className="text-2xl font-bold fc-text-primary">
                {progress?.current_day_number ??
                  ((progress as { current_day_index?: number } | null)?.current_day_index != null
                    ? (progress as { current_day_index: number }).current_day_index + 1
                    : '—')}
              </p>
            </div>
            <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim">Status</p>
              <p
                className={`text-lg font-bold ${
                  progress?.is_completed ? 'fc-text-success' : progress ? 'fc-text-warning' : 'fc-text-dim'
                }`}
              >
                {!progress ? 'Not started' : progress.is_completed ? 'Completed' : 'In Progress'}
              </p>
              {assignment.pause_status === 'paused' && (
                <p className="text-xs fc-text-dim mt-2">Program timeline is paused — client unlock week is frozen.</p>
              )}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)] flex flex-col gap-4">
            {assignment.pause_status === 'paused' ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-sm font-semibold fc-text-primary">Paused</p>
                {assignment.paused_at && (
                  <p className="text-xs fc-text-dim">
                    Since {new Date(assignment.paused_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                <p className="text-xs fc-text-dim">
                  Paused for <strong className="fc-text-primary">{pausedDaysSoFar}</strong> day{pausedDaysSoFar === 1 ? '' : 's'} (client calendar)
                </p>
                {assignment.pause_reason ? (
                  <p className="text-xs fc-text-dim">
                    Reason: <span className="fc-text-primary">{assignment.pause_reason}</span>
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="fc-btn fc-btn-primary w-full sm:w-auto"
                  onClick={() => setResumeModalOpen(true)}
                >
                  Resume program
                </Button>
              </div>
            ) : (
              (assignment.pause_status ?? 'active') === 'active' &&
              assignment.status === 'active' && (
                <Button
                  type="button"
                  variant="outline"
                  className="fc-btn fc-btn-secondary w-full sm:w-auto text-gray-400 border-gray-600 hover:bg-white/5"
                  onClick={() => setPauseModalOpen(true)}
                >
                  <Pause className="w-4 h-4 mr-2 inline" aria-hidden />
                  Pause program
                </Button>
              )
            )}
            {(assignment.status === 'active' || assignment.status === 'paused') && !progress?.is_completed && (
              <Button
                type="button"
                className="fc-btn fc-btn-secondary w-full sm:w-auto"
                onClick={() => setShowReviewModal(true)}
              >
                Review week {reviewWeekNumber}
              </Button>
            )}
          </div>
        </div>

        <ClientProgressionEditor
          programAssignmentId={assignment.id}
          programId={programId}
          clientId={clientId}
          durationWeeks={program.duration_weeks || 1}
          defaultWeek={
            progress?.current_week_number ??
            (progress?.current_week_index != null ? progress.current_week_index + 1 : 1)
          }
        />

        {/* Description */}
        {program.description && (
          <div className="fc-card-shell p-6">
            <h2 className="text-xl font-bold fc-text-primary mb-3">Description</h2>
            <p className="fc-text-dim leading-relaxed">{program.description}</p>
          </div>
        )}

        {/* Client schedule snapshot — Section C3 */}
        <div className="fc-card-shell p-6">
          <h2 className="text-xl font-bold fc-text-primary mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 fc-text-workouts" />
            Client schedule
          </h2>
          <div className="flex items-start gap-2 text-xs text-gray-400 mb-4">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" aria-hidden />
            <p>
              Editing this client&apos;s program affects only{' '}
              <span className="fc-text-primary font-medium">{clientName}</span>. Master template stays unchanged.
            </p>
          </div>

          {gridWeeks.length === 0 ? (
            <p className="text-sm fc-text-dim">No snapshot days found for this assignment.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <div
                className="grid gap-2 text-xs min-w-[720px]"
                style={{
                  gridTemplateColumns: '88px repeat(7, minmax(96px, 1fr))',
                }}
              >
                <div />
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="text-center font-semibold fc-text-dim py-2">
                    {d}
                  </div>
                ))}
                {gridWeeks.map((weekNum) => (
                  <React.Fragment key={weekNum}>
                    <div className="flex items-center font-semibold fc-text-primary pr-2 py-1 border-t border-white/5 pt-2">
                      W{weekNum}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((programDay) => {
                      const snap = snapshotRows.find(
                        (s) => s.week_number === weekNum && s.program_day === programDay
                      )
                      if (!snap) {
                        return (
                          <div
                            key={`${weekNum}-${programDay}`}
                            className="min-h-[76px] rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center fc-text-subtle"
                          >
                            —
                          </div>
                        )
                      }
                      const schedId = scheduleIdByPdaId[snap.id] ?? ''
                      const isCompleted = Boolean(schedId && completedScheduleIds.has(schedId))
                      const isSkipped = Boolean(schedId && skippedScheduleIds.has(schedId))
                      const tplLabel =
                        snap.workout_template_id && snapshotTemplateNames[snap.workout_template_id]
                          ? snapshotTemplateNames[snap.workout_template_id]
                          : snap.workout_template_id
                            ? 'Workout template'
                            : null

                      return (
                        <button
                          type="button"
                          key={snap.id}
                          onClick={() => openSnapshotEditor(snap)}
                          className={cn(
                            'relative rounded-lg border p-2 text-left min-h-[76px] transition-colors',
                            snap.is_customized
                              ? 'border-cyan-500/40 bg-cyan-500/10'
                              : 'border-white/10 bg-white/[0.04]',
                            isCompleted && 'ring-1 ring-emerald-500/20',
                            'hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40'
                          )}
                        >
                          {snap.is_customized && (
                            <span className="absolute top-1 right-1 z-[1] px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300">
                              Edited
                            </span>
                          )}
                          {isCompleted && (
                            <span className="absolute top-1 left-1 z-[1]" title="Completed (client)">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                            </span>
                          )}
                          {isSkipped && !isCompleted && (
                            <span className="absolute bottom-1 right-1 z-[1]" title="Skipped">
                              <SkipForward className="w-3 h-3 text-amber-400" aria-hidden />
                            </span>
                          )}
                          <div
                            className={cn(
                              'font-medium fc-text-primary truncate text-[11px] leading-tight pr-6',
                              (isCompleted || snap.is_customized) && 'pl-4'
                            )}
                          >
                            {snap.name}
                          </div>
                          {snap.day_type === 'workout' && tplLabel ? (
                            <div className="fc-text-subtle text-[10px] truncate mt-1">{tplLabel}</div>
                          ) : (
                            <div className="fc-text-subtle text-[10px] mt-1">Rest</div>
                          )}
                        </button>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

      <ResponsiveModal
        isOpen={snapshotEditorOpen}
        onClose={() => {
          setSnapshotEditorOpen(false)
          setEditingSnapshot(null)
          setTemplateSearch('')
        }}
        title="Edit program day"
        maxWidth="md"
      >
        {editingSnapshot ? (
          <div className="space-y-4">
            {(() => {
              const sid = scheduleIdByPdaId[editingSnapshot.id] ?? ''
              const completedLock = Boolean(sid && completedScheduleIds.has(sid))
              const filtered = coachTemplates.filter((t) =>
                t.name.toLowerCase().includes(templateSearch.trim().toLowerCase())
              )
              return (
                <>
                  <p className="text-xs fc-text-dim">
                    Week {editingSnapshot.week_number} · Day {editingSnapshot.program_day} ·{' '}
                    <span className="fc-text-primary">{editingSnapshot.name}</span>
                  </p>
                  {completedLock ? (
                    <p className="text-sm fc-text-warning border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
                      This day has a completed workout. Snapshot template cannot be changed here.
                    </p>
                  ) : (
                    <>
                      <div>
                        <button
                          type="button"
                          className="w-full text-left text-sm py-2 px-3 rounded-lg border border-white/10 hover:bg-white/5 fc-text-primary mb-2"
                          onClick={() =>
                            void runSnapshotPatch({
                              day_type: 'rest',
                              workout_template_id: null,
                              is_customized: true,
                            })
                          }
                          disabled={snapshotSaveBusy}
                        >
                          Set as rest day
                        </button>
                        {editingSnapshot.is_customized && (
                          <button
                            type="button"
                            className="w-full text-left text-sm py-2 px-3 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-200 mb-2"
                            onClick={() => void runSnapshotPatch({ reset_to_template: true })}
                            disabled={snapshotSaveBusy}
                          >
                            Reset to master template
                          </button>
                        )}
                        {masterHasOptionalDays && (
                          <p className="text-[11px] fc-text-subtle border border-white/5 rounded-lg p-2 mb-2">
                            Optional days are defined on the master program template. Per-client optional flags are
                            not stored on snapshot rows yet.
                          </p>
                        )}
                        <label className="text-xs font-semibold fc-text-dim block mb-1">Search templates</label>
                        <Input
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Filter by name…"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {filtered.slice(0, 40).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left text-sm py-2 px-3 rounded-lg border border-white/10 hover:bg-white/5 fc-text-primary flex justify-between gap-2"
                            disabled={snapshotSaveBusy}
                            onClick={() =>
                              void runSnapshotPatch({
                                workout_template_id: t.id,
                                is_customized: true,
                                day_type: 'workout',
                              })
                            }
                          >
                            <span className="truncate">{t.name}</span>
                            {t.estimated_duration != null && (
                              <span className="shrink-0 fc-text-subtle text-xs">{t.estimated_duration}m</span>
                            )}
                          </button>
                        ))}
                        {filtered.length === 0 && (
                          <p className="text-xs fc-text-subtle py-2">No templates match.</p>
                        )}
                      </div>
                      {sid &&
                        !completedLock &&
                        assignment?.status !== 'completed' &&
                        assignment?.status !== 'cancelled' && (
                          <div className="pt-2 border-t border-white/10">
                            <button
                              type="button"
                              className="text-xs fc-text-subtle hover:fc-text-warning flex items-center gap-1"
                              onClick={async () => {
                                setSnapshotSaveBusy(true)
                                try {
                                  await handleSkipDay(sid)
                                  setSnapshotEditorOpen(false)
                                  setEditingSnapshot(null)
                                } finally {
                                  setSnapshotSaveBusy(false)
                                }
                              }}
                              disabled={skipLoading || snapshotSaveBusy}
                            >
                              <SkipForward className="w-3 h-3" />
                              Mark this day as skipped (client ledger)
                            </button>
                          </div>
                        )}
                    </>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="fc-btn fc-btn-secondary"
                      onClick={() => {
                        setSnapshotEditorOpen(false)
                        setEditingSnapshot(null)
                        setTemplateSearch('')
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        ) : null}
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={pauseModalOpen}
        onClose={() => {
          setPauseModalOpen(false)
          setPauseReasonDraft('')
        }}
        title="Pause program?"
        maxWidth="md"
      >
        <p className="text-sm fc-text-dim mb-3">
          The client&apos;s program week unlock will freeze until you resume. They will see that the program is paused.
        </p>
        <label className="block text-xs font-semibold fc-text-dim mb-1">Reason (optional)</label>
        <textarea
          value={pauseReasonDraft}
          onChange={(e) => setPauseReasonDraft(e.target.value)}
          rows={3}
          className="w-full text-sm fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-3 fc-text-primary bg-transparent mb-4"
          placeholder="e.g. Vacation, injury, deload week…"
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="fc-btn fc-btn-secondary"
            disabled={pauseBusy}
            onClick={() => {
              setPauseModalOpen(false)
              setPauseReasonDraft('')
            }}
          >
            Cancel
          </Button>
          <Button type="button" className="fc-btn fc-btn-primary" disabled={pauseBusy} onClick={() => void submitPause()}>
            {pauseBusy ? 'Pausing…' : 'Confirm pause'}
          </Button>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        title="Resume program?"
        maxWidth="md"
      >
        <p className="text-sm fc-text-dim mb-4">
          The pause will end and accumulated pause days will be added to their timeline so week unlocks stay fair.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="fc-btn fc-btn-secondary"
            disabled={pauseBusy}
            onClick={() => setResumeModalOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="fc-btn fc-btn-primary" disabled={pauseBusy} onClick={() => void submitResume()}>
            {pauseBusy ? 'Resuming…' : 'Confirm resume'}
          </Button>
        </div>
      </ResponsiveModal>

      {assignment && (
        <WeekReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onComplete={() => {
            setShowReviewModal(false)
            loadData()
          }}
          programAssignmentId={assignment.id}
          programId={assignment.program_id}
          weekNumber={reviewWeekNumber}
          clientName={clientName}
        />
      )}
  </div>
  )
}

export default ClientProgramDetailsContent
