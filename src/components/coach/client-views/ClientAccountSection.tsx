'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Clock, User, Handshake } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DetailGrid from '@/components/coach/client-detail/DetailGrid'
import sec from '@/components/coach/client-detail/coachClientDetailUi.module.css'

type Props = { clientId: string; layoutVariant?: 'default' | 'coachV6' }

export default function ClientAccountSection({
  clientId,
  layoutVariant = 'default',
}: Props) {
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
    <div className="flex items-center gap-3 px-2 py-2 border-b border-[color:var(--fc-glass-border)] last:border-b-0">
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

  if (layoutVariant === 'coachV6') {
    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Client'
    const relColor =
      status === 'active'
        ? 'var(--fc-effort-easy)'
        : status === 'pending'
          ? 'var(--fc-effort-medium)'
          : status === 'inactive'
            ? 'var(--fc-effort-max)'
            : 'var(--fc-text-primary)'

    return (
      <section className={sec.section}>
        <span className={sec.eyebrow}>Account information</span>
        <DetailGrid
          rows={[
            { icon: User, label: 'Role', value: roleLabel },
            {
              icon: Handshake,
              label: 'Coaching relationship',
              value: (
                <span style={{ color: relColor }}>{statusLabel}</span>
              ),
              iconTone: 'good',
            },
            ...(createdAt
              ? [
                  {
                    icon: Clock,
                    label: 'Member since',
                    value: new Date(createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    iconTone: 'purple' as const,
                  },
                ]
              : []),
          ]}
        />
      </section>
    )
  }

  return (
    <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
      <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold fc-text-primary">Account information</h3>
        </div>
      </div>
      <div className="px-2 py-1">
        <InfoRow
          label="Role"
          value={role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Client'}
        />
        <InfoRow label="Coaching relationship" value={statusLabel} />
        {createdAt && (
          <div className="flex items-center gap-3 px-2 py-2 border-b border-[color:var(--fc-glass-border)] last:border-b-0">
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
