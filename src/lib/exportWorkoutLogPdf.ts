/**
 * Client workout-log PDF export (jsPDF — same library as coach progress reports).
 */

import type { WorkoutLogFullPayload } from '@/types/workoutLog'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function fmtWeightReps(weight: number | null | undefined, reps: number | null | undefined): string {
  const w = weight != null && Number.isFinite(Number(weight)) ? Number(weight) : null
  const r = reps != null && Number.isFinite(Number(reps)) ? Number(reps) : null
  if (r != null && w != null) return `${r} × ${w} kg`
  if (r != null) return `${r} reps`
  if (w != null) return `${w} kg`
  return '—'
}

export async function exportWorkoutLogPdf(payload: WorkoutLogFullPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  const ensureSpace = (need: number) => {
    const pageH = doc.internal.pageSize.getHeight()
    if (y + need > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const session = payload.session
  const title = session.workoutName?.trim() || 'Workout log'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const meta = [
    `Date: ${fmtDate(session.completedAt || session.startedAt)}`,
    `Duration: ${session.totalDurationMinutes != null ? `${session.totalDurationMinutes} min` : '—'}`,
    `Volume: ${
      session.totalWeightLifted != null
        ? `${Math.round(Number(session.totalWeightLifted)).toLocaleString()} kg`
        : '—'
    }`,
    `Sets: ${session.totalSetsCompleted ?? '—'}`,
  ]
  for (const line of meta) {
    ensureSpace(16)
    doc.text(line, margin, y)
    y += 16
  }

  y += 8
  ensureSpace(20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Exercises', margin, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  for (const block of payload.blocks) {
    const name =
      block.exerciseNames?.filter(Boolean).join(' + ') ||
      block.exerciseIds?.join(', ') ||
      'Exercise'
    ensureSpace(18)
    doc.setFont('helvetica', 'bold')
    const nameLines = doc.splitTextToSize(name, maxW)
    doc.text(nameLines, margin, y)
    y += nameLines.length * 12 + 4
    doc.setFont('helvetica', 'normal')

    block.sets.forEach((set, idx) => {
      const effort = set.rpe != null ? ` · RPE ${set.rpe}` : ''
      const line = `  Set ${idx + 1}: ${fmtWeightReps(set.weight, set.reps)}${effort}`
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 14
    })
    y += 6
  }

  const safeName = title.replace(/[^\w\-]+/g, '_').slice(0, 40)
  const datePart = (session.completedAt || session.startedAt || '')
    .toString()
    .slice(0, 10)
  doc.save(`workout-${safeName}-${datePart || 'log'}.pdf`)
}
