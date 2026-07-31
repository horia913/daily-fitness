'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { User, Mail, Dumbbell, Shield, Camera, Save, Pencil, CheckCircle2, Clock, Heart } from 'lucide-react'
import DetailGrid from '@/components/coach/client-detail/DetailGrid'
import ProfilePhotoCard from '@/components/coach/client-detail/ProfilePhotoCard'
import sec from '@/components/coach/client-detail/coachClientDetailUi.module.css'
import { supabase } from '@/lib/supabase'
import { getLatestClientWeight, type LatestClientWeight } from '@/lib/metrics/body'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast-provider'
import ResponsiveModal from '@/components/ui/ResponsiveModal'

interface ClientProfileViewProps {
  clientId: string
  layoutVariant?: 'default' | 'coachV6'
}

function formatVisibilityLabel(raw: string | null): string {
  if (!raw) return 'â€”'
  const s = raw.toLowerCase()
  if (s === 'public') return 'Public'
  if (s === 'private') return 'Private'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatClientTypeLabel(raw: string | null): string {
  if (!raw) return 'â€”'
  const s = raw.toLowerCase().replace(/[-_]/g, ' ')
  if (s === 'online') return 'Online'
  if (s === 'in person' || s === 'inperson') return 'In-person'
  if (s === 'hybrid') return 'Hybrid'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

type ProfileRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  sex: string | null
  client_type: string | null
  leaderboard_visibility: string | null
  role: string | null
  created_at: string | null
  medical_conditions: string | null
  injuries: string | null
}

function displayHealthNote(raw: string | null | undefined): string {
  const t = (raw ?? '').trim()
  return t || 'None noted'
}

const CLIENT_STATUSES = ['active', 'inactive', 'pending'] as const

export default function ClientProfileView({
  clientId,
  layoutVariant = 'default',
}: ClientProfileViewProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [latestWeight, setLatestWeight] = useState<LatestClientWeight | null>(null)
  const [clientStatus, setClientStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    avatar_url: '',
    status: 'active' as string,
  })

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: prof, error: pe } = await supabase
        .from('profiles')
        .select(
          'id, email, first_name, last_name, avatar_url, bio, sex, client_type, leaderboard_visibility, role, created_at, medical_conditions, injuries'
        )
        .eq('id', clientId)
        .maybeSingle()
      if (pe) throw pe

      const [{ data: rel }, weight] = await Promise.all([
        supabase
          .from('clients')
          .select('status')
          .eq('coach_id', user.id)
          .eq('client_id', clientId)
          .maybeSingle(),
        getLatestClientWeight(clientId),
      ])

      if (prof) {
        setProfile(prof as ProfileRow)
        setLatestWeight(weight)
        const st = rel?.status ?? 'active'
        setClientStatus(rel?.status ?? null)
        setDraft({
          first_name: prof.first_name ?? '',
          last_name: prof.last_name ?? '',
          bio: (prof as { bio?: string | null }).bio ?? '',
          avatar_url: prof.avatar_url ?? '',
          status: CLIENT_STATUSES.includes(st as (typeof CLIENT_STATUSES)[number])
            ? st
            : 'active',
        })
      } else {
        setProfile(null)
        setLatestWeight(null)
      }
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not load profile', variant: 'destructive' })
      setProfile(null)
      setLatestWeight(null)
    } finally {
      setLoading(false)
    }
  }, [clientId, user?.id, addToast])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = () => {
    if (!profile) return
    const st = clientStatus ?? 'active'
    setDraft({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      bio: profile.bio ?? '',
      avatar_url: profile.avatar_url ?? '',
      status: CLIENT_STATUSES.includes(st as (typeof CLIENT_STATUSES)[number]) ? st : 'active',
    })
    setEditOpen(true)
  }

  const saveProfile = async () => {
    if (!profile || !user?.id) return
    setSaving(true)
    try {
      const { error: pu } = await supabase
        .from('profiles')
        .update({
          first_name: draft.first_name.trim() || null,
          last_name: draft.last_name.trim() || null,
          bio: draft.bio.trim() || null,
          avatar_url: draft.avatar_url.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
      if (pu) throw pu

      const { error: cu } = await supabase
        .from('clients')
        .update({
          status: draft.status,
          updated_at: new Date().toISOString(),
        })
        .eq('coach_id', user.id)
        .eq('client_id', clientId)
      if (cu) throw cu

      addToast({ title: 'Profile updated', variant: 'default' })
      setEditOpen(false)
      await load()
      await queryClient.invalidateQueries({
        queryKey: ['coach-client', clientId, 'identity'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['coach-clients', user?.id],
      })
      await queryClient.invalidateQueries({
        queryKey: ['coach-client', clientId, 'summary'],
      })
    } catch (e) {
      console.error(e)
      addToast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[color:var(--fc-glass-border)] border-t-[color:var(--fc-domain-workouts)]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 fc-icon-tile fc-icon-neutral w-12 h-12">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold fc-text-primary mb-2">Profile Not Found</h3>
        <p className="fc-text-dim">Unable to load client profile</p>
      </div>
    )
  }

  if (layoutVariant === 'coachV6') {
    const displayName =
      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Client'
    const initialsV6 =
      `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() ||
      profile.email?.[0]?.toUpperCase() ||
      'C'

    return (
      <>
        <section className={sec.section}>
          <div className={sec.sectionHead}>
            <span className={sec.eyebrow}>Personal information</span>
            <button type="button" className={sec.btnEditCyan} onClick={openEdit}>
              <Pencil className="w-[11px] h-[11px]" aria-hidden />
              Edit
            </button>
          </div>
          <ProfilePhotoCard
            name={displayName}
            email={profile.email}
            initials={initialsV6}
            avatarUrl={profile.avatar_url}
            onEditPhoto={openEdit}
          />
        </section>

        <section className={sec.section}>
          <div className={sec.sectionHead}>
            <span className={sec.eyebrow}>Health &amp; injuries</span>
          </div>
          <p className="m-0 text-[11px] leading-snug text-[color:var(--fc-text-subtle)]">
            From the client&apos;s profile â€” use when programming around limitations.
          </p>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]">
                Medical conditions
              </p>
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--fc-text-primary)]">
                {displayHealthNote(profile.medical_conditions)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]">
                Injuries
              </p>
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--fc-text-primary)]">
                {displayHealthNote(profile.injuries)}
              </p>
            </div>
          </div>
        </section>

        <section className={sec.section}>
          <div className={sec.sectionHead}>
            <span className={sec.eyebrow}>Details</span>
          </div>
          <DetailGrid
            rows={[
              {
                icon: User,
                label: 'Name',
                value: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'â€”',
              },
              { icon: Mail, label: 'Email', value: profile.email },
              {
                icon: Dumbbell,
                label: 'Bodyweight',
                value: latestWeight
                  ? `${latestWeight.weightKg} kg Â· ${new Date(
                      latestWeight.measuredDate + 'T12:00:00',
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  : null,
                mutedWhenEmpty: true,
              },
              {
                icon: CheckCircle2,
                label: 'Client type',
                value: formatClientTypeLabel(profile.client_type),
                iconTone: 'action',
              },
              {
                icon: Clock,
                label: 'Leaderboard',
                value: formatVisibilityLabel(profile.leaderboard_visibility),
                iconTone: 'purple',
              },
            ]}
          />
        </section>

        <ResponsiveModal
          isOpen={editOpen}
          onClose={() => !saving && setEditOpen(false)}
          title="Edit personal information"
          maxWidth="md"
          showHeader
        >
          <div className="space-y-4 px-1 pb-2">
            <div>
              <Label className="fc-text-subtle">First name</Label>
              <Input
                className="mt-1 rounded-[11px] border border-[color:var(--fc-glass-border)] bg-transparent"
                value={draft.first_name}
                onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="fc-text-subtle">Last name</Label>
              <Input
                className="mt-1 rounded-[11px] border border-[color:var(--fc-glass-border)] bg-transparent"
                value={draft.last_name}
                onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="fc-text-subtle">Avatar URL</Label>
              <Input
                className="mt-1 rounded-[11px] border border-[color:var(--fc-glass-border)] bg-transparent"
                placeholder="https://â€¦"
                value={draft.avatar_url}
                onChange={(e) => setDraft((d) => ({ ...d, avatar_url: e.target.value }))}
              />
            </div>
            <div>
              <Label className="fc-text-subtle">Bio</Label>
              <Textarea
                className="mt-1 min-h-[88px] rounded-[11px] border border-[color:var(--fc-glass-border)] bg-transparent"
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="fc-text-subtle">Coaching relationship (clients.status)</Label>
              <select
                className="mt-1 w-full h-10 rounded-[11px] border border-[color:var(--fc-glass-border)] bg-transparent px-3 text-sm fc-text-primary"
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              >
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="fc-btn fc-btn-primary gap-2"
                disabled={saving}
                onClick={() => void saveProfile()}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Savingâ€¦' : 'Save'}
              </Button>
            </div>
          </div>
        </ResponsiveModal>
      </>
    )
  }

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: typeof User
    label: string
    value: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 px-2 py-2 border-b border-[color:var(--fc-glass-border)] last:border-b-0">
      <div className="fc-icon-tile fc-icon-workouts">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="fc-text-subtle mb-1 text-xs font-medium">{label}</p>
        <p className="fc-text-primary text-sm font-semibold break-words">{value || 'â€”'}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[color-mix(in_srgb,var(--fc-group-c)_60%,transparent)]">
          Personal information
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-2 text-[color:var(--fc-group-c)] border border-[color-mix(in_srgb,var(--fc-group-c)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--fc-group-c)_10%,transparent)]"
          onClick={openEdit}
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </div>

      <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
        <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Photo</h3>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-24 h-24 rounded-full object-cover border-2 border-[color:var(--fc-glass-border)] shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-[color:var(--fc-glass-border)] shadow-lg bg-transparent flex items-center justify-center text-2xl font-bold fc-text-primary">
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
              </div>
            )}
            <div>
              <h3 className="fc-text-primary mb-1 text-xl font-bold">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="fc-text-dim text-sm">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
        <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold fc-text-primary">Health &amp; injuries</h3>
              <p className="text-xs fc-text-dim">From the client&apos;s profile â€” use when programming</p>
            </div>
          </div>
        </div>
        <div className="px-3 py-3 space-y-3">
          <div>
            <p className="fc-text-subtle mb-1 text-xs font-medium">Medical conditions</p>
            <p className="fc-text-primary text-sm whitespace-pre-wrap">
              {displayHealthNote(profile.medical_conditions)}
            </p>
          </div>
          <div>
            <p className="fc-text-subtle mb-1 text-xs font-medium">Injuries</p>
            <p className="fc-text-primary text-sm whitespace-pre-wrap">
              {displayHealthNote(profile.injuries)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
        <div className="px-3 py-2 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Details</h3>
          </div>
        </div>
        <div className="px-2 py-1">
          <InfoRow
            icon={User}
            label="Name"
            value={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
          />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          {profile.bio ? (
            <InfoRow icon={User} label="Bio" value={profile.bio} />
          ) : null}
          <InfoRow
            icon={Dumbbell}
            label="Bodyweight"
            value={
              latestWeight
                ? `${latestWeight.weightKg} kg Â· ${new Date(
                    latestWeight.measuredDate + 'T12:00:00',
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : null
            }
          />
          <InfoRow icon={Shield} label="Client type" value={profile.client_type} />
          <InfoRow icon={Shield} label="Leaderboard" value={profile.leaderboard_visibility} />
        </div>
      </div>

      <ResponsiveModal
        isOpen={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit personal information"
        maxWidth="md"
        showHeader
      >
        <div className="space-y-4 px-1 pb-2">
          <div>
            <Label className="fc-text-subtle">First name</Label>
            <Input
              className="mt-1"
              value={draft.first_name}
              onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Last name</Label>
            <Input
              className="mt-1"
              value={draft.last_name}
              onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Avatar URL</Label>
            <Input
              className="mt-1"
              placeholder="https://â€¦"
              value={draft.avatar_url}
              onChange={(e) => setDraft((d) => ({ ...d, avatar_url: e.target.value }))}
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Bio</Label>
            <Textarea
              className="mt-1 min-h-[88px]"
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label className="fc-text-subtle">Coaching relationship (clients.status)</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-[color:var(--fc-glass-border)] bg-transparent px-3 text-sm fc-text-primary"
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="fc-btn fc-btn-primary gap-2" disabled={saving} onClick={() => void saveProfile()}>
              <Save className="w-4 h-4" />
              {saving ? 'Savingâ€¦' : 'Save'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
