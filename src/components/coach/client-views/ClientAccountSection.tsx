'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Props = { clientId: string }

export default function ClientAccountSection({ clientId }: Props) {
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, created_at')
        .eq('id', clientId)
        .maybeSingle()

      const { data: rel } = await supabase
        .from('clients')
        .select('status')
        .eq('coach_id', user.id)
        .eq('client_id', clientId)
        .maybeSingle()

      setRole(prof?.role ?? null)
      setCreatedAt(prof?.created_at ?? null)
      setStatus(rel?.status ?? null)
    } finally {
      setLoading(false)
    }
  }, [clientId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const statusLabel =
    status === 'inactive'
      ? 'Inactive'
      : status === 'pending'
        ? 'Pending'
        : status === 'active'
          ? 'Active'
          : status ?? '—'

  const InfoRow = ({
    label,
    value,
  }: {
    label: string
    value: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
      <div className="fc-icon-tile fc-icon-workouts">
        <Shield className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="fc-text-subtle mb-1 text-xs font-medium">{label}</p>
        <p className="fc-text-primary text-sm font-semibold break-words">{value || '—'}</p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[color:var(--fc-glass-border)] border-t-[color:var(--fc-domain-workouts)]" />
      </div>
    )
  }

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary">Account information</h3>
        </div>
      </div>
      <div className="space-y-3 p-6 pt-0">
        <InfoRow
          label="Role"
          value={role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Client'}
        />
        <InfoRow label="Coaching relationship" value={statusLabel} />
        {createdAt && (
          <div className="flex items-center gap-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="fc-text-subtle mb-1 text-xs font-medium">Member since</p>
              <p className="fc-text-primary text-sm font-semibold">
                {new Date(createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
