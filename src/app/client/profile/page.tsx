'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useToast } from '@/components/ui/toast-provider'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { DatabaseService } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  User,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Lock,
  LogOut,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Award,
  Target,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { ClientPageShell } from '@/components/client-ui'
import { LogSetButton } from '@/components/client/workout-execution/ui/LogSetButton'
import { cn } from '@/lib/utils'

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
type FitnessLevel = (typeof FITNESS_LEVELS)[number]

const SEX_OPTIONS: { value: string; label: string }[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
]

function normalizeFitnessLevelFromDb(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (v === 'beginner' || v === 'beginning' || v === 'novice') return 'beginner'
  if (v === 'intermediate') return 'intermediate'
  if (v === 'advanced' || v === 'expert') return 'advanced'
  if ((FITNESS_LEVELS as readonly string[]).includes(v)) return v
  return ''
}

type ProfileForm = {
  first_name: string
  last_name: string
  phone: string
  sex: string
  height_cm: string
  date_of_birth: string
  fitness_level: string
  bio: string
  medical_conditions: string
  injuries: string
  bodyweight: string
}

function emptyForm(): ProfileForm {
  return {
    first_name: '',
    last_name: '',
    phone: '',
    sex: '',
    height_cm: '',
    date_of_birth: '',
    fitness_level: '',
    bio: '',
    medical_conditions: '',
    injuries: '',
    bodyweight: '',
  }
}

function profileRowToForm(row: Record<string, unknown> | null): ProfileForm {
  if (!row) return emptyForm()
  const dob = row.date_of_birth
  let dobStr = ''
  if (typeof dob === 'string') {
    dobStr = dob.slice(0, 10)
  }
  const hw = row.height_cm
  const bw = row.bodyweight
  return {
    first_name: String(row.first_name ?? ''),
    last_name: String(row.last_name ?? ''),
    phone: String(row.phone ?? ''),
    sex: normalizeSexFromDb(String(row.sex ?? '')),
    height_cm: hw != null && hw !== '' ? String(hw) : '',
    date_of_birth: dobStr,
    fitness_level: normalizeFitnessLevelFromDb(String(row.fitness_level ?? '')),
    bio: String(row.bio ?? ''),
    medical_conditions: String(row.medical_conditions ?? ''),
    injuries: String(row.injuries ?? ''),
    bodyweight: bw != null && bw !== '' ? String(bw) : '',
  }
}

/** Map DB or legacy string values to M, F, or empty. */
function normalizeSexFromDb(raw: string): string {
  const v = raw.trim()
  if (v === 'M' || v === 'm' || v === 'male' || v === 'Male') return 'M'
  if (v === 'F' || v === 'f' || v === 'female' || v === 'Female') return 'F'
  return ''
}

function formsEqual(a: ProfileForm, b: ProfileForm): boolean {
  return (Object.keys(a) as (keyof ProfileForm)[]).every((k) => a[k] === b[k])
}

function buildUpdatePayload(form: ProfileForm): Record<string, unknown> {
  const trim = (s: string) => s.trim()
  const first = trim(form.first_name)
  const last = trim(form.last_name)
  const phone = trim(form.phone)
  const bio = trim(form.bio)
  const med = trim(form.medical_conditions)
  const inj = trim(form.injuries)

  const heightNum = form.height_cm.trim() === '' ? null : Number(form.height_cm)
  const weightNum = form.bodyweight.trim() === '' ? null : Number(form.bodyweight)

  const payload: Record<string, unknown> = {
    first_name: first || null,
    last_name: last || null,
    phone: phone || null,
    sex: form.sex.trim() ? form.sex.trim() : null,
    height_cm: heightNum != null && !Number.isNaN(heightNum) ? heightNum : null,
    date_of_birth: form.date_of_birth.trim() || null,
    fitness_level: form.fitness_level.trim() || null,
    bio: bio || null,
    medical_conditions: med || null,
    injuries: inj || null,
    bodyweight: weightNum != null && !Number.isNaN(weightNum) ? weightNum : null,
  }

  return payload
}

export default function ClientProfilePage() {
  const { user, signOut } = useAuth()
  const { addToast } = useToast()
  const { performanceSettings } = useTheme()
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null)
  const PROFILE_LOAD_TIMEOUT_MS = 30000
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [avatarUrlKey, setAvatarUrlKey] = useState(0)
  const profileUserIdRef = useRef<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [formData, setFormData] = useState<ProfileForm>(emptyForm())
  /** Last saved baseline; dirty when formData differs (client-only; viewAs ignores). */
  const [savedSnapshot, setSavedSnapshot] = useState<ProfileForm>(emptyForm())

  const [subscriptionLine, setSubscriptionLine] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewAs = params.get('viewAs')
    if (viewAs) setViewAsUserId(viewAs)
  }, [])

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setLoadError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }
    profileUserIdRef.current = userId
    setLoadError(null)
    setLoading(true)
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), PROFILE_LOAD_TIMEOUT_MS)
      )
      const data = await Promise.race([
        DatabaseService.getProfile(userId),
        timeoutPromise,
      ])
      if (data) {
        const row = data as unknown as Record<string, unknown>
        setProfile(row)
        const next = profileRowToForm(row)
        setFormData(next)
        setSavedSnapshot(next)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoadError(
        error instanceof Error && error.message === 'timeout'
          ? 'Loading took too long. Check your connection.'
          : 'Could not load profile.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const profileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const userId = viewAsUserId || user?.id
    if (!userId) return
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current)
    profileTimeoutRef.current = setTimeout(() => {
      profileTimeoutRef.current = null
      setLoading(false)
      setLoadError('Loading took too long. Tap Retry to try again.')
    }, 20_000)
    loadProfile(userId).finally(() => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current)
        profileTimeoutRef.current = null
      }
    })
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current)
        profileTimeoutRef.current = null
      }
    }
  }, [user?.id, viewAsUserId, loadProfile])

  useEffect(() => {
    const uid = viewAsUserId || user?.id
    if (!uid) {
      setSubscriptionLine(null)
      return
    }
    void (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('clipcards')
        .select(
          'subscription_plan_label, start_date, end_date, subscription_status, is_active'
        )
        .eq('client_id', uid)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) {
        setSubscriptionLine(null)
        return
      }
      const rows = (data || []) as Array<{
        subscription_plan_label: string | null
        start_date: string
        end_date: string
        subscription_status: string | null
        is_active: boolean | null
      }>
      const row = rows.find((r) => {
        if (!r.is_active) return false
        const st = String(r.subscription_status || '').toLowerCase()
        if (st === 'cancelled' || st === 'expired') return false
        return r.end_date >= today
      })
      if (!row) {
        setSubscriptionLine(null)
        return
      }
      const start = new Date(row.start_date + 'T12:00:00Z').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const end = new Date(row.end_date + 'T12:00:00Z').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      setSubscriptionLine(
        `${row.subscription_plan_label || 'Active subscription'} · ${start} – ${end}`
      )
    })()
  }, [user?.id, viewAsUserId])

  const effectiveUserId = viewAsUserId || user?.id
  const canEdit = !viewAsUserId
  const isDirty = useMemo(
    () => canEdit && !formsEqual(formData, savedSnapshot),
    [canEdit, formData, savedSnapshot]
  )

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    if (!file.type.startsWith('image/')) {
      addToast({ title: 'Please select an image file', variant: 'default' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: 'Image size should be less than 5MB', variant: 'default' })
      return
    }

    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)

      if (uploadError) {
        console.error('Profile picture upload error:', uploadError)
        const msg = uploadError.message || ''
        const friendlyMessage = msg.includes('row-level security policy')
          ? 'Storage is not set up for profile photos yet. Your coach can configure it.'
          : msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('network')
            ? "Couldn't upload photo. Check your connection and try again. If it keeps failing, ask your coach to check storage setup."
            : `Upload failed: ${msg}`
        addToast({ title: friendlyMessage, variant: 'destructive' })
        setUploadingImage(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile picture update error:', updateError)
        addToast({
          title: updateError.message || 'Photo uploaded but profile could not be updated.',
          variant: 'destructive',
        })
        setUploadingImage(false)
        return
      }

      if (updatedProfile) {
        setProfile((prev) =>
          prev
            ? { ...prev, avatar_url: (updatedProfile as { avatar_url?: string }).avatar_url }
            : (updatedProfile as unknown as Record<string, unknown>)
        )
      } else {
        setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev))
      }
      setAvatarUrlKey(Date.now())
      addToast({ title: 'Profile picture updated successfully', variant: 'success' })
    } catch (error) {
      console.error('Profile picture upload exception:', error)
      addToast({ title: "Couldn't upload photo. Check your connection and try again.", variant: 'destructive' })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!effectiveUserId || !canEdit) return

    const fl = formData.fitness_level.trim()
    if (fl && !FITNESS_LEVELS.includes(fl as FitnessLevel)) {
      addToast({
        title: 'Fitness level must be Beginner, Intermediate, or Advanced.',
        variant: 'destructive',
      })
      return
    }

    const heightNum = formData.height_cm.trim() === '' ? null : Number(formData.height_cm)
    if (formData.height_cm.trim() !== '' && (Number.isNaN(heightNum) || heightNum! < 0)) {
      addToast({ title: 'Height must be a valid number (cm).', variant: 'destructive' })
      return
    }

    const weightNum = formData.bodyweight.trim() === '' ? null : Number(formData.bodyweight)
    if (formData.bodyweight.trim() !== '' && (Number.isNaN(weightNum) || weightNum! < 0)) {
      addToast({ title: 'Bodyweight must be a valid number (kg).', variant: 'destructive' })
      return
    }

    const payload = buildUpdatePayload(formData)

    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', effectiveUserId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        addToast({
          title: error.message || "Couldn't update profile. Please try again.",
          variant: 'destructive',
        })
        return
      }

      if (data) {
        const row = data as unknown as Record<string, unknown>
        setProfile(row)
        const next = profileRowToForm(row)
        setFormData(next)
        setSavedSnapshot(next)
      }
      addToast({ title: 'Profile saved', variant: 'success' })
    } catch (error) {
      console.error('Error updating profile:', error)
      addToast({
        title: error instanceof Error ? error.message : "Couldn't update profile. Please try again.",
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    try {
      setChangingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) {
        setPasswordError(error.message)
        return
      }

      setPasswordSuccess(true)
      setPasswordData({ newPassword: '', confirmPassword: '' })

      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess(false)
      }, 2000)
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const displayEmail =
    (typeof profile?.email === 'string' && profile.email) || user?.email || '—'

  if (loadError && !loading) {
    const retryUserId = profileUserIdRef.current || viewAsUserId || user?.id
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 flex items-center justify-center min-h-[50vh]">
            <div className="p-4 max-w-md w-full text-center space-y-3 rounded-xl border border-white/10 bg-black/20">
              <p className="text-sm text-gray-400">{loadError}</p>
              <Button
                onClick={() => {
                  if (retryUserId) loadProfile(retryUserId)
                  else loadProfile(user?.id)
                }}
                className="fc-btn fc-btn-primary"
              >
                Retry
              </Button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-16 rounded-lg bg-white/5" />
              <div className="h-10 rounded-lg bg-white/5" />
              <div className="h-40 rounded-lg bg-white/5" />
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null
  const createdAt = profile?.created_at
  const memberSince =
    typeof createdAt === 'string'
      ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : null

  const inputClass = 'h-11 rounded-lg fc-input'
  const labelClass = 'text-xs uppercase tracking-wider text-gray-400 mb-1 block'
  const sectionTitleClass = 'text-sm uppercase tracking-wider text-cyan-300/70 mb-2'

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell
          className={cn(
            'max-w-lg mx-auto px-4 pt-6 overflow-x-hidden',
            isDirty && canEdit ? 'pb-48' : 'pb-32'
          )}
        >
          {/* 1. Header */}
          <header className="flex items-start gap-3 mb-6 pb-6 border-b border-white/5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full border border-white/10 overflow-hidden bg-white/5">
                {avatarUrl ? (
                  <img
                    key={`${avatarUrl}-${avatarUrlKey}`}
                    src={`${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${avatarUrlKey || 0}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                )}
              </div>
              {canEdit && (
                <label className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[color:var(--fc-domain-workouts)] flex items-center justify-center border-2 border-[color:var(--fc-bg-deep)] shadow cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-white truncate">
                    {[formData.first_name, formData.last_name].filter(Boolean).join(' ') ||
                      displayEmail.split('@')[0] ||
                      'Profile'}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{displayEmail}</p>
                  {memberSince && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      Member since {memberSince}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* 2. Subscription */}
          {subscriptionLine && (
            <div className="mb-6 pb-6 border-b border-white/5 flex items-center gap-2 text-xs text-gray-400">
              <CreditCard className="w-3.5 h-3.5 shrink-0 text-gray-500" />
              <span className="leading-snug">{subscriptionLine}</span>
            </div>
          )}

          {/* 3. Personal Info */}
          <section className="mb-6 pb-6 border-b border-white/5">
            <h2 className={sectionTitleClass}>Personal Info</h2>
            <div className="space-y-3">
              <div>
                <Label className={labelClass}>First name</Label>
                <Input
                  className={inputClass}
                  value={formData.first_name}
                  onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Last name</Label>
                <Input
                  className={inputClass}
                  value={formData.last_name}
                  onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Phone</Label>
                <Input
                  type="tel"
                  className={inputClass}
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Date of birth</Label>
                <Input
                  type="date"
                  className={inputClass}
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData((p) => ({ ...p, date_of_birth: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Sex</Label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData((p) => ({ ...p, sex: e.target.value }))}
                  disabled={!canEdit}
                  className={cn(
                    inputClass,
                    'w-full min-h-11 px-3 py-2 text-sm text-[color:var(--fc-text-primary)]',
                    canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                  )}
                  aria-label="Sex"
                >
                  <option value="">Select</option>
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 4. Body stats */}
          <section className="mb-6 pb-6 border-b border-white/5">
            <h2 className={sectionTitleClass}>Body stats</h2>
            <p className="text-xs text-gray-500 mb-3">
              Updates your profile weight for your coach. Body metrics history lives under Progress.
            </p>
            <div className="space-y-3">
              <div>
                <Label className={labelClass}>Height (cm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className={inputClass}
                  value={formData.height_cm}
                  onChange={(e) => setFormData((p) => ({ ...p, height_cm: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Bodyweight (kg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className={inputClass}
                  value={formData.bodyweight}
                  onChange={(e) => setFormData((p) => ({ ...p, bodyweight: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </section>

          {/* 5. Training */}
          <section className="mb-6 pb-6 border-b border-white/5">
            <h2 className={sectionTitleClass}>Training</h2>
            <div className="space-y-3">
              <div>
                <Label className={labelClass}>Fitness level</Label>
                <select
                  value={formData.fitness_level}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, fitness_level: e.target.value }))
                  }
                  disabled={!canEdit}
                  className={cn(
                    inputClass,
                    'w-full min-h-11 px-3 py-2 text-sm text-[color:var(--fc-text-primary)]',
                    canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                  )}
                  aria-label="Fitness level"
                >
                  <option value="">Select</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <Label className={labelClass}>Bio</Label>
                <Textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Tell your coach a bit about yourself (optional)"
                  className="rounded-lg min-h-[4.5rem] fc-textarea resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </section>

          {/* 6. Health */}
          <section className="mb-6 pb-6 border-b border-white/5">
            <h2 className={sectionTitleClass}>Health</h2>
            <div className="space-y-3">
              <div>
                <Label className={labelClass}>Medical conditions</Label>
                <Textarea
                  rows={3}
                  placeholder="Anything your coach should know about your health"
                  className="rounded-lg min-h-[4.5rem] fc-textarea resize-none"
                  value={formData.medical_conditions}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, medical_conditions: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className={labelClass}>Injuries</Label>
                <Textarea
                  rows={3}
                  placeholder="Past or current injuries"
                  className="rounded-lg min-h-[4.5rem] fc-textarea resize-none"
                  value={formData.injuries}
                  onChange={(e) => setFormData((p) => ({ ...p, injuries: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </section>

          {/* 7. Profile Hub */}
          <section className="mb-6 pb-6 border-b border-white/5">
            <h2 className={sectionTitleClass}>Profile Hub</h2>
            <div className="divide-y divide-white/5 rounded-lg border border-white/5 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => {
                  window.location.href = '/client/progress/achievements'
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <Award className="w-4 h-4 text-amber-400/90 shrink-0" />
                  Achievements
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => {
                  window.location.href = '/client/goals/history'
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <Target className="w-4 h-4 text-emerald-400/90 shrink-0" />
                  Goal History
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              </button>
            </div>
          </section>

          {/* 8. Account */}
          {canEdit && (
            <section className="mb-6">
              <h2 className={sectionTitleClass}>Account</h2>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start rounded-lg border-white/10 text-sm"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <Lock className="w-4 h-4 mr-2 shrink-0" />
                  Change password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start rounded-lg border-white/10 text-sm"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="w-4 h-4 mr-2 shrink-0" />
                  Sign out
                </Button>
              </div>
            </section>
          )}
        </ClientPageShell>

        {isDirty && canEdit && (
          <div
            className="fixed left-0 right-0 z-[10060] p-3 sm:px-4 pointer-events-none bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm border-t border-white/10"
            style={{ bottom: '76px' }}
          >
            <div className="max-w-lg mx-auto w-full pointer-events-auto">
              <LogSetButton
                ready={!saving}
                loading={saving}
                label="Save profile"
                onClick={() => {
                  if (saving) return
                  void handleSave()
                }}
              />
            </div>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="fc-card-shell rounded-2xl p-5 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Change password</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setPasswordError('')
                    setPasswordSuccess(false)
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {passwordSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-14 h-14 mx-auto mb-3 text-emerald-400" />
                  <p className="text-base font-semibold text-emerald-400">Password changed successfully!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newPassword" className="text-xs text-gray-400">
                      New password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="mt-1 h-11 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-xs text-gray-400">
                      Confirm password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="mt-1 h-11 rounded-lg"
                    />
                  </div>

                  {passwordError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-lg"
                      onClick={() => {
                        setShowPasswordModal(false)
                        setPasswordData({ newPassword: '', confirmPassword: '' })
                        setPasswordError('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-11 rounded-lg fc-btn fc-btn-primary"
                      onClick={() => void handlePasswordChange()}
                      disabled={changingPassword}
                    >
                      {changingPassword ? 'Changing…' : 'Change password'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
