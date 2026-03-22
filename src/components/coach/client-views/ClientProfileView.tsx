'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Mail, Dumbbell, Shield, Camera, Save, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast-provider'
import ResponsiveModal from '@/components/ui/ResponsiveModal'

interface ClientProfileViewProps {
  clientId: string
}

type ProfileRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  sex: string | null
  bodyweight: number | string | null
  client_type: string | null
  leaderboard_visibility: string | null
  role: string | null
  created_at: string | null
}

const CLIENT_STATUSES = ['active', 'inactive', 'pending'] as const

export default function ClientProfileView({ clientId }: ClientProfileViewProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
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
          'id, email, first_name, last_name, avatar_url, bio, sex, bodyweight, client_type, leaderboard_visibility, role, created_at'
        )
        .eq('id', clientId)
        .maybeSingle()
      if (pe) throw pe

      const { data: rel } = await supabase
        .from('clients')
        .select('status')
        .eq('coach_id', user.id)
        .eq('client_id', clientId)
        .maybeSingle()

      if (prof) {
        setProfile(prof as ProfileRow)
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
      }
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not load profile', variant: 'destructive' })
      setProfile(null)
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

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: typeof User
    label: string
    value: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
      <div className="fc-icon-tile fc-icon-workouts">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="fc-text-subtle mb-1 text-xs font-medium">{label}</p>
        <p className="fc-text-primary text-sm font-semibold break-words">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
          Personal information
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
          onClick={openEdit}
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </div>

      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Photo</h3>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-24 h-24 rounded-full object-cover border-2 border-[color:var(--fc-glass-border)] shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-[color:var(--fc-glass-border)] shadow-lg fc-glass-soft flex items-center justify-center text-2xl font-bold fc-text-primary">
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

      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Details</h3>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0">
          <InfoRow
            icon={User}
            label="Name"
            value={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
          />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          {profile.bio ? (
            <InfoRow icon={User} label="Bio" value={profile.bio} />
          ) : null}
          <InfoRow icon={Dumbbell} label="Bodyweight" value={profile.bodyweight != null ? `${profile.bodyweight} kg` : null} />
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
              placeholder="https://…"
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
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
