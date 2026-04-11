'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { GlassCard } from '@/components/ui/GlassCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckCircle2, CreditCard, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CoachClientSubscriptionSectionProps = {
  clientId: string
}

type SubscriptionRow = {
  id: string
  start_date: string
  end_date: string
  is_active: boolean | null
  plan_duration_months: number | null
  amount_paid: number | string | null
  subscription_notes: string | null
  subscription_status: string | null
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

function addMonthsYmd(startYmd: string, months: number): string {
  const [y, m, d] = startYmd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

function daysRemainingFromEnd(endYmd: string): number {
  const end = new Date(endYmd + 'T12:00:00Z').getTime()
  const start = new Date(todayYmd() + 'T12:00:00Z').getTime()
  return Math.ceil((end - start) / 86400000)
}

function planLabelFromMonths(n: number): string {
  return `${n} Month${n === 1 ? '' : 's'} Coaching`
}

function isRowActiveSubscription(row: SubscriptionRow): boolean {
  if (!row.is_active) return false
  const st = String(row.subscription_status || '').toLowerCase()
  if (st === 'cancelled' || st === 'expired') return false
  return row.end_date >= todayYmd()
}

const PRESET_MONTHS = [1, 3, 6, 12] as const

export default function CoachClientSubscriptionSection({
  clientId,
}: CoachClientSubscriptionSectionProps) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SubscriptionRow[]>([])
  const [coachId, setCoachId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [planPreset, setPlanPreset] = useState<(typeof PRESET_MONTHS)[number] | 'custom'>(
    3
  )
  const [customMonths, setCustomMonths] = useState('3')
  const [startDate, setStartDate] = useState(todayYmd())
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [editing, setEditing] = useState<SubscriptionRow | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editMonths, setEditMonths] = useState('3')
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [renewRow, setRenewRow] = useState<SubscriptionRow | null>(null)
  const [renewPreset, setRenewPreset] = useState<(typeof PRESET_MONTHS)[number] | 'custom'>(3)
  const [renewCustomMonths, setRenewCustomMonths] = useState('3')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setCoachId(null)
        setRows([])
        return
      }
      setCoachId(user.id)

      const { data: rel, error: relErr } = await supabase
        .from('clients')
        .select('id')
        .eq('coach_id', user.id)
        .eq('client_id', clientId)
        .maybeSingle()

      if (relErr || !rel) {
        setRows([])
        return
      }

      const { data, error } = await supabase
        .from('clipcards')
        .select(
          'id, start_date, end_date, is_active, plan_duration_months, amount_paid, subscription_notes, subscription_status'
        )
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setRows([])
        return
      }
      setRows((data || []) as SubscriptionRow[])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const active = rows.find(isRowActiveSubscription) ?? null

  const resolvedCreateMonths = (): number | null => {
    if (planPreset === 'custom') {
      const n = parseInt(customMonths, 10)
      if (!Number.isFinite(n) || n < 1 || n > 120) return null
      return n
    }
    return planPreset
  }

  const deactivateOtherActives = async () => {
    await supabase
      .from('clipcards')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('is_active', true)
  }

  const handleCreate = async () => {
    const months = resolvedCreateMonths()
    if (months == null) {
      addToast({
        title: 'Enter a valid number of months (1–120).',
        variant: 'destructive',
      })
      return
    }
    if (!coachId) return

    const end = addMonthsYmd(startDate, months)
    const amountVal = amount.trim() === '' ? null : Number(amount)
    if (amount.trim() !== '' && (amountVal == null || Number.isNaN(amountVal))) {
      addToast({ title: 'Amount must be a number.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      await deactivateOtherActives()

      const { error } = await supabase.from('clipcards').insert({
        coach_id: coachId,
        client_id: clientId,
        clipcard_type_id: null,
        sessions_total: 0,
        sessions_used: 0,
        start_date: startDate,
        end_date: end,
        is_active: true,
        plan_duration_months: months,
        amount_paid: amountVal,
        subscription_notes: notes.trim() || null,
        subscription_status: 'active',
      })

      if (error) throw error
      addToast({ title: 'Subscription created', variant: 'success' })
      setCreateOpen(false)
      setPlanPreset(3)
      setCustomMonths('3')
      setStartDate(todayYmd())
      setAmount('')
      setNotes('')
      await load()
    } catch (e) {
      console.error(e)
      addToast({
        title: 'Could not create subscription. Check DB migration (clipcard_type_id nullable).',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row: SubscriptionRow) => {
    setEditing(row)
    setEditStart(row.start_date)
    setEditEnd(row.end_date)
    setEditMonths(String(row.plan_duration_months ?? 1))
    setEditAmount(
      row.amount_paid != null && String(row.amount_paid).trim() !== ''
        ? String(row.amount_paid)
        : ''
    )
    setEditNotes(row.subscription_notes ?? '')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    const months = parseInt(editMonths, 10)
    if (!Number.isFinite(months) || months < 1 || months > 120) {
      addToast({ title: 'Plan months must be 1–120.', variant: 'destructive' })
      return
    }
    const amountVal = editAmount.trim() === '' ? null : Number(editAmount)
    if (editAmount.trim() !== '' && (amountVal == null || Number.isNaN(amountVal))) {
      addToast({ title: 'Amount must be a number.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('clipcards')
        .update({
          start_date: editStart,
          end_date: editEnd,
          plan_duration_months: months,
          amount_paid: amountVal,
          subscription_notes: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id)

      if (error) throw error
      addToast({ title: 'Subscription updated', variant: 'default' })
      setEditOpen(false)
      setEditing(null)
      await load()
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not update subscription', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openRenew = (row: SubscriptionRow) => {
    setRenewRow(row)
    setRenewPreset(3)
    setRenewCustomMonths('3')
    setRenewOpen(true)
  }

  const renewMonths = (): number | null => {
    if (renewPreset === 'custom') {
      const n = parseInt(renewCustomMonths, 10)
      if (!Number.isFinite(n) || n < 1 || n > 120) return null
      return n
    }
    return renewPreset
  }

  const handleRenew = async () => {
    if (!renewRow || !coachId) return
    const m = renewMonths()
    if (m == null) {
      addToast({ title: 'Enter valid months (1–120).', variant: 'destructive' })
      return
    }
    const start = todayYmd()
    const end = addMonthsYmd(start, m)

    setSaving(true)
    try {
      await deactivateOtherActives()

      const { error } = await supabase.from('clipcards').insert({
        coach_id: coachId,
        client_id: clientId,
        clipcard_type_id: null,
        sessions_total: 0,
        sessions_used: 0,
        start_date: start,
        end_date: end,
        is_active: true,
        plan_duration_months: m,
        amount_paid: null,
        subscription_notes: renewRow.subscription_notes,
        subscription_status: 'active',
      })

      if (error) throw error

      await supabase
        .from('clipcards')
        .update({
          subscription_status: 'expired',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', renewRow.id)

      addToast({ title: 'Subscription renewed', variant: 'success' })
      setRenewOpen(false)
      setRenewRow(null)
      await load()
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not renew', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSubscription = async (row: SubscriptionRow) => {
    if (!confirm('Cancel this subscription for the client?')) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clipcards')
        .update({
          is_active: false,
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (error) throw error
      addToast({ title: 'Subscription cancelled', variant: 'default' })
      await load()
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not cancel', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  type PlanChoice = (typeof PRESET_MONTHS)[number] | 'custom'

  /** Button rows instead of <input type="radio"> — iOS CSS strips radio appearance (invisible controls). */
  const renderPlanDurationPicker = (
    value: PlanChoice,
    onChange: (v: PlanChoice) => void,
    custom: string,
    onCustom: (s: string) => void,
    groupLabelId: string
  ) => (
    <div className="space-y-2">
      <Label id={groupLabelId} className="fc-text-subtle">
        Plan duration
      </Label>
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        className="flex flex-col gap-2"
      >
        {PRESET_MONTHS.map((mo) => {
          const selected = value === mo
          return (
            <button
              key={mo}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mo)}
              className={cn(
                'w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                'min-h-[48px] flex items-center gap-3',
                selected
                  ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]/12 text-[color:var(--fc-text-primary)] ring-1 ring-[color:var(--fc-accent)]/40'
                  : 'border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-text-dim)]'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 rounded-full border-2 items-center justify-center',
                  selected
                    ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]'
                    : 'border-[color:var(--fc-glass-border)] bg-transparent'
                )}
                aria-hidden
              >
                {selected ? (
                  <span className="h-2 w-2 rounded-full bg-white" />
                ) : null}
              </span>
              {mo} month{mo === 1 ? '' : 's'}
            </button>
          )
        })}
        <div
          className={cn(
            'rounded-xl border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap',
            value === 'custom'
              ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]/12 ring-1 ring-[color:var(--fc-accent)]/40'
              : 'border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)]'
          )}
        >
          <button
            type="button"
            role="radio"
            aria-checked={value === 'custom'}
            onClick={() => onChange('custom')}
            className="flex items-center gap-3 text-sm font-medium fc-text-primary text-left min-h-[44px] flex-1 min-w-0"
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 rounded-full border-2 items-center justify-center',
                value === 'custom'
                  ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]'
                  : 'border-[color:var(--fc-glass-border)]'
              )}
              aria-hidden
            >
              {value === 'custom' ? (
                <span className="h-2 w-2 rounded-full bg-white" />
              ) : null}
            </span>
            Custom
          </button>
          <div className="flex items-center gap-2 pl-8 sm:pl-0 flex-wrap">
            <Input
              type="number"
              min={1}
              max={120}
              className="w-24 h-10"
              disabled={value !== 'custom'}
              value={custom}
              onChange={(e) => onCustom(e.target.value)}
              onFocus={() => onChange('custom')}
            />
            <span className="text-sm text-[color:var(--fc-text-dim)]">months</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <GlassCard elevation={1} className="fc-card-shell p-6 animate-pulse">
        <div className="h-24 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard
        elevation={2}
        className={cn(
          'p-3 sm:p-4 border border-[color:var(--fc-glass-border)] border-l-2 rounded-xl',
          !active
            ? ''
            : active && daysRemainingFromEnd(active.end_date) <= 14
              ? 'border-l-red-500'
              : 'border-l-cyan-500'
        )}
      >
        {!active ? (
          <div className="space-y-3">
            <EmptyState
              icon={CreditCard}
              title="No active subscription"
              description="Add a coaching plan with a start date and duration."
            />
            <Button
              type="button"
              className="fc-btn fc-btn-primary gap-2"
              onClick={() => {
                setPlanPreset(3)
                setCustomMonths('3')
                setStartDate(todayYmd())
                setAmount('')
                setNotes('')
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Add Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[color:var(--fc-text-success)]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-semibold">Active</span>
            </div>
            <div className="text-sm rounded-lg border border-[color:var(--fc-glass-border)]">
              <p className="fc-text-primary px-2 py-2 border-b border-[color:var(--fc-glass-border)]">
                <span className="text-[color:var(--fc-text-dim)]">Plan: </span>
                <span className="font-medium">
                  {planLabelFromMonths(active.plan_duration_months ?? 1)}
                </span>
              </p>
              <p className="fc-text-dim px-2 py-2 border-b border-[color:var(--fc-glass-border)]">
                Status:{' '}
                <span className="fc-text-primary font-medium">
                  {String(active.subscription_status || 'active').replace(/_/g, ' ')}
                </span>
              </p>
              <p className="fc-text-dim px-2 py-2 border-b border-[color:var(--fc-glass-border)]">
                Started:{' '}
                {new Date(active.start_date + 'T12:00:00Z').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="fc-text-primary px-2 py-2 border-b border-[color:var(--fc-glass-border)]">
                Expires:{' '}
                {new Date(active.end_date + 'T12:00:00Z').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {(() => {
                  const dr = daysRemainingFromEnd(active.end_date)
                  if (dr < 0) return ' (expired)'
                  return ` (${dr} day${dr === 1 ? '' : 's'} remaining)`
                })()}
              </p>
              {active.amount_paid != null && String(active.amount_paid).trim() !== '' && (
                <p className="fc-text-dim px-2 py-2 border-b border-[color:var(--fc-glass-border)]">
                  Amount: {Number(active.amount_paid).toLocaleString()}
                </p>
              )}
              {active.subscription_notes && (
                <p className="fc-text-dim text-xs px-2 py-2 whitespace-pre-wrap">
                  {active.subscription_notes}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="fc-btn fc-btn-secondary"
                disabled={saving}
                onClick={() => openRenew(active)}
              >
                Renew
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="fc-btn fc-btn-ghost text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
                disabled={saving}
                onClick={() => openEdit(active)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="fc-btn fc-btn-secondary"
                disabled={saving}
                onClick={() => void handleCancelSubscription(active)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      <ResponsiveModal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="New subscription"
        maxWidth="md"
        showHeader
      >
        <div className="space-y-4 px-1 pb-2">
          {renderPlanDurationPicker(
            planPreset,
            setPlanPreset,
            customMonths,
            setCustomMonths,
            'subscription-plan-duration-create'
          )}
          <div>
            <Label className="fc-text-subtle">Start date</Label>
            <Input
              type="date"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Amount (optional)</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="mt-1"
              placeholder="e.g. 199"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Notes (optional)</Label>
            <Textarea
              className="mt-1 min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="fc-btn fc-btn-primary"
              disabled={saving}
              onClick={() => void handleCreate()}
            >
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit subscription"
        maxWidth="md"
      >
        <div className="space-y-4 px-1 pb-2">
          <div>
            <Label className="fc-text-subtle">Start date</Label>
            <Input
              type="date"
              className="mt-1"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">End date</Label>
            <Input
              type="date"
              className="mt-1"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Plan duration (months)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              className="mt-1"
              value={editMonths}
              onChange={(e) => setEditMonths(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Amount (optional)</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="mt-1"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Notes (optional)</Label>
            <Textarea
              className="mt-1 min-h-[80px]"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="fc-btn fc-btn-primary"
              disabled={saving}
              onClick={() => void handleSaveEdit()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={renewOpen}
        onClose={() => !saving && setRenewOpen(false)}
        title="Renew subscription"
        maxWidth="md"
      >
        <div className="space-y-4 px-1 pb-2">
          <p className="text-sm fc-text-dim">
            Starts a new subscription period today. The previous record will be marked expired.
          </p>
          {renderPlanDurationPicker(
            renewPreset,
            setRenewPreset,
            renewCustomMonths,
            setRenewCustomMonths,
            'subscription-plan-duration-renew'
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setRenewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="fc-btn fc-btn-primary"
              disabled={saving}
              onClick={() => void handleRenew()}
            >
              {saving ? 'Saving…' : 'Renew'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  )
}
