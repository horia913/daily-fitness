'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateMeasurement,
  upsertMeasurement,
  type BodyMeasurement,
} from '@/lib/measurementService'
import { Loader2 } from 'lucide-react'

export type BodyMeasurementFormValues = {
  measured_date: string
  weight_kg: number
  body_fat_percentage?: number
  waist_circumference?: number
  notes?: string
}

export type BodyMeasurementFormProps = {
  clientId: string
  coachId: string
  /** When set, updates this row instead of upserting by date */
  initial?: BodyMeasurement | null
  submitLabel?: string
  cancelLabel?: string
  onSuccess: (saved: BodyMeasurement) => void
  onCancel?: () => void
  className?: string
}

/**
 * Single coach measurement form — used by AddClientCheckInModal and the testing hub.
 * Fields match the existing check-in surface (weight, optional BF%, waist, notes).
 */
export function BodyMeasurementForm({
  clientId,
  coachId,
  initial = null,
  submitLabel = 'Save measurement',
  cancelLabel = 'Cancel',
  onSuccess,
  onCancel,
  className,
}: BodyMeasurementFormProps) {
  const [measuredDate, setMeasuredDate] = useState(
    () => initial?.measured_date ?? new Date().toISOString().split('T')[0],
  )
  const [weight, setWeight] = useState(
    () => (initial?.weight_kg != null ? String(initial.weight_kg) : ''),
  )
  const [bodyFat, setBodyFat] = useState(
    () =>
      initial?.body_fat_percentage != null
        ? String(initial.body_fat_percentage)
        : '',
  )
  const [waist, setWaist] = useState(
    () =>
      initial?.waist_circumference != null
        ? String(initial.waist_circumference)
        : '',
  )
  const [notes, setNotes] = useState(() => initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initial) return
    setMeasuredDate(initial.measured_date)
    setWeight(initial.weight_kg != null ? String(initial.weight_kg) : '')
    setBodyFat(
      initial.body_fat_percentage != null
        ? String(initial.body_fat_percentage)
        : '',
    )
    setWaist(
      initial.waist_circumference != null
        ? String(initial.waist_circumference)
        : '',
    )
    setNotes(initial.notes ?? '')
  }, [initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const weightNum = weight.trim() ? parseFloat(weight) : NaN
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        measured_date: measuredDate,
        weight_kg: weightNum,
        body_fat_percentage: bodyFat.trim()
          ? parseFloat(bodyFat)
          : undefined,
        waist_circumference: waist.trim() ? parseFloat(waist) : undefined,
        notes: notes.trim() || undefined,
        coach_id: coachId,
      }

      let result: BodyMeasurement | null
      if (initial?.id) {
        result = await updateMeasurement(initial.id, payload)
      } else {
        result = await upsertMeasurement({
          client_id: clientId,
          ...payload,
        })
      }

      if (!result) {
        setError('Failed to save measurement.')
        return
      }
      onSuccess(result)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className ?? 'space-y-4'}>
      <div>
        <Label className="mb-2 block text-sm font-medium fc-text-primary">
          Date
        </Label>
        <Input
          type="date"
          value={measuredDate}
          onChange={(e) => setMeasuredDate(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium fc-text-primary">
          Weight (kg) *
        </Label>
        <Input
          type="number"
          step="0.1"
          min="30"
          max="300"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 78.5"
          required
          className="w-full"
        />
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium fc-text-primary">
          Body fat (%) — optional
        </Label>
        <Input
          type="number"
          step="0.1"
          min="3"
          max="60"
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          placeholder="e.g. 17.8"
          className="w-full"
        />
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium fc-text-primary">
          Waist (cm) — optional
        </Label>
        <Input
          type="number"
          step="0.1"
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
          placeholder="e.g. 83"
          className="w-full"
        />
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium fc-text-primary">
          Notes
        </Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes..."
          rows={3}
          className="w-full resize-none rounded-xl border border-[color:var(--fc-glass-border)] px-4 py-3 text-sm fc-glass-soft fc-text-primary"
        />
      </div>
      {error && <p className="text-sm fc-text-error">{error}</p>}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 fc-btn fc-btn-secondary"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 fc-btn fc-btn-primary"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
