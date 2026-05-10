'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useToast } from '@/components/ui/toast-provider'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { DatabaseService } from '@/lib/database'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Lock,
  LogOut,
  CheckCircle,
  CreditCard,
  Dumbbell,
  Star,
  Heart,
  Target,
  Shield,
  Trophy,
  Crosshair,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { ClientPageShell } from '@/components/client-ui'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { cn } from '@/lib/utils'
import styles from '@/components/client-profile/clientProfileV1.module.css'
import {
  ProfileHero,
  ProfileSection,
  SectionHead,
  ProfileField,
  FieldGroup2,
  ProfileTextInput,
  ProfileTextarea,
  ProfileSelect,
  UnitInput,
  InfoCallout,
  ProfileHubRow,
  AccountRow,
  StickySaveBar,
} from '@/components/client-profile'

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
type FitnessLevel = (typeof FITNESS_LEVELS)[number]

const SEX_OPTIONS: { value: string; label: string }[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
]

const PROFILE_FIELD_LABELS: Record<keyof ProfileForm, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  sex: 'Sex',
  height_cm: 'Height',
  date_of_birth: 'Date of birth',
  fitness_level: 'Fitness level',
  bio: 'Bio',
  medical_conditions: 'Medical conditions',
  injuries: 'Injuries',
  bodyweight: 'Bodyweight',
}

function dirtyKeys(form: ProfileForm, snap: ProfileForm): (keyof ProfileForm)[] {
  return (Object.keys(form) as (keyof ProfileForm)[]).filter((k) => form[k] !== snap[k])
}

function dirtySummaryLine(keys: (keyof ProfileForm)[]): string {
  if (keys.length === 0) return ''
  const names = keys.map((k) => PROFILE_FIELD_LABELS[k])
  const shown = names.slice(0, 3)
  const rest = names.length - 3
  let s = shown.join(' · ')
  if (rest > 0) s += ` + ${rest} more`
  return s
}

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
  const router = useRouter()
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})

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
        setFieldErrors({})
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

  const dirtyKeyList = useMemo(
    () => (canEdit ? dirtyKeys(formData, savedSnapshot) : []),
    [canEdit, formData, savedSnapshot]
  )

  const dirtySummary = useMemo(() => dirtySummaryLine(dirtyKeyList), [dirtyKeyList])

  const patchForm = useCallback((patch: Partial<ProfileForm>) => {
    setFormData((p) => ({ ...p, ...patch }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(patch) as (keyof ProfileForm)[]) {
        delete next[k]
      }
      return next
    })
  }, [])

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

    const nextErrors: Partial<Record<keyof ProfileForm, string>> = {}
    if (!formData.first_name.trim()) {
      nextErrors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      nextErrors.last_name = 'Last name is required'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})

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

  const handleDiscard = () => {
    if (!canEdit) return
    const keys = dirtyKeys(formData, savedSnapshot)
    if (keys.length >= 3) {
      const ok = window.confirm(`Discard changes to ${keys.length} fields?`)
      if (!ok) return
    }
    setFormData(savedSnapshot)
    setFieldErrors({})
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 flex items-center justify-center min-h-[50vh]">
            <div className="p-4 max-w-md w-full text-center space-y-3 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
              <p className="text-sm fc-text-dim">{loadError}</p>
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="form" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null
  const createdAt = profile?.created_at
  const memberSince =
    typeof createdAt === 'string'
      ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : null

  const fieldDirty = (k: keyof ProfileForm) => formData[k] !== savedSnapshot[k]

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell
          className={cn(
            'max-w-lg mx-auto px-4 pt-6 overflow-x-hidden',
            canEdit
              ? 'pb-[calc(var(--fc-bottom-safe-area)+3rem)]'
              : 'pb-[var(--fc-bottom-safe-area)]',
          )}
        >
          <div className={styles.root}>
            <div className={styles.sectionStack}>
              <ProfileHero
                avatarUrl={avatarUrl}
                avatarUrlKey={avatarUrlKey}
                firstName={formData.first_name}
                lastName={formData.last_name}
                displayEmail={displayEmail}
                memberSinceLabel={memberSince}
                coachingState={null}
                canEdit={canEdit}
                uploadingImage={uploadingImage}
                onPhotoChange={handleImageUpload}
              />

              {subscriptionLine && (
                <div className={styles.subscriptionNote}>
                  <CreditCard className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80" aria-hidden />
                  <span>{subscriptionLine}</span>
                </div>
              )}

              <ProfileSection>
                <SectionHead
                  tone="cyan"
                  title="Personal info"
                  description="Identity and contact details"
                  icon={<User size={14} strokeWidth={2} aria-hidden />}
                />
                <FieldGroup2>
                  <ProfileField label="First name" required error={fieldErrors.first_name}>
                    <ProfileTextInput
                      value={formData.first_name}
                      onChange={(v) => patchForm({ first_name: v })}
                      disabled={!canEdit}
                      dirty={fieldDirty('first_name')}
                      error={fieldErrors.first_name}
                    />
                  </ProfileField>
                  <ProfileField label="Last name" required error={fieldErrors.last_name}>
                    <ProfileTextInput
                      value={formData.last_name}
                      onChange={(v) => patchForm({ last_name: v })}
                      disabled={!canEdit}
                      dirty={fieldDirty('last_name')}
                      error={fieldErrors.last_name}
                    />
                  </ProfileField>
                </FieldGroup2>
                <ProfileField label="Phone" optional>
                  <ProfileTextInput
                    type="tel"
                    value={formData.phone}
                    onChange={(v) => patchForm({ phone: v })}
                    disabled={!canEdit}
                    dirty={fieldDirty('phone')}
                  />
                </ProfileField>
                <FieldGroup2>
                  <ProfileField label="Date of birth">
                    <ProfileTextInput
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(v) => patchForm({ date_of_birth: v })}
                      disabled={!canEdit}
                      dirty={fieldDirty('date_of_birth')}
                    />
                  </ProfileField>
                  <ProfileField label="Sex">
                    <ProfileSelect
                      value={formData.sex}
                      onChange={(v) => patchForm({ sex: v })}
                      disabled={!canEdit}
                      ariaLabel="Sex"
                      dirty={fieldDirty('sex')}
                    >
                      <option value="">Select</option>
                      {SEX_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </ProfileSelect>
                  </ProfileField>
                </FieldGroup2>
              </ProfileSection>

              <ProfileSection>
                <SectionHead
                  tone="purple"
                  title="Body stats"
                  description={
                    <>
                      Profile baseline · history under{' '}
                      <Link href="/client/progress" className={styles.cyanLink}>
                        Progress
                      </Link>
                    </>
                  }
                  icon={<Dumbbell size={14} strokeWidth={2} aria-hidden />}
                />
                <InfoCallout>
                  <>
                    Updates your profile weight for your coach. Body metrics history lives under{' '}
                    <Link href="/client/progress" className={styles.cyanLink}>
                      Progress
                    </Link>
                    .
                  </>
                </InfoCallout>
                <FieldGroup2>
                  <ProfileField label="Height">
                    <UnitInput
                      value={formData.height_cm}
                      onChange={(v) => patchForm({ height_cm: v })}
                      disabled={!canEdit}
                      unit="cm"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      dirty={fieldDirty('height_cm')}
                    />
                  </ProfileField>
                  <ProfileField label="Bodyweight">
                    <UnitInput
                      value={formData.bodyweight}
                      onChange={(v) => patchForm({ bodyweight: v })}
                      disabled={!canEdit}
                      unit="kg"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      dirty={fieldDirty('bodyweight')}
                    />
                  </ProfileField>
                </FieldGroup2>
              </ProfileSection>

              <ProfileSection>
                <SectionHead
                  tone="warn"
                  title="Training"
                  description="How you train and what your coach should know"
                  icon={<Star size={14} strokeWidth={2} aria-hidden />}
                />
                <ProfileField label="Fitness level">
                  <ProfileSelect
                    value={formData.fitness_level}
                    onChange={(v) => patchForm({ fitness_level: v })}
                    disabled={!canEdit}
                    ariaLabel="Fitness level"
                    dirty={fieldDirty('fitness_level')}
                  >
                    <option value="">Select</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </ProfileSelect>
                </ProfileField>
                <ProfileField label="Bio" optional>
                  <ProfileTextarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Tell your coach a bit about yourself (optional)"
                    value={formData.bio}
                    onChange={(v) => patchForm({ bio: v })}
                    disabled={!canEdit}
                    dirty={fieldDirty('bio')}
                  />
                </ProfileField>
              </ProfileSection>

              <ProfileSection>
                <SectionHead
                  tone="rose"
                  title="Health"
                  description="Safety context for programming and check-ins"
                  icon={<Heart size={14} strokeWidth={2} aria-hidden />}
                />
                <ProfileField label="Medical conditions" optional>
                  <ProfileTextarea
                    rows={3}
                    placeholder="Anything your coach should know about your health"
                    value={formData.medical_conditions}
                    onChange={(v) => patchForm({ medical_conditions: v })}
                    disabled={!canEdit}
                    dirty={fieldDirty('medical_conditions')}
                  />
                </ProfileField>
                <ProfileField label="Injuries" optional>
                  <ProfileTextarea
                    rows={3}
                    placeholder="Past or current injuries"
                    value={formData.injuries}
                    onChange={(v) => patchForm({ injuries: v })}
                    disabled={!canEdit}
                    dirty={fieldDirty('injuries')}
                  />
                </ProfileField>
              </ProfileSection>

              <ProfileSection>
                <SectionHead
                  tone="lime"
                  title="Profile hub"
                  description="Achievements and goals live on their own screens"
                  icon={<Target size={14} strokeWidth={2} aria-hidden />}
                />
                <div className={styles.hubStack}>
                  <ProfileHubRow
                    icon={<Trophy size={15} strokeWidth={2} aria-hidden />}
                    iconClassName={styles.hubIconWarn}
                    title="Achievements"
                    subtitle="Milestones and badges earned"
                    onClick={() => router.push('/client/progress/achievements')}
                  />
                  <ProfileHubRow
                    icon={<Crosshair size={15} strokeWidth={2} aria-hidden />}
                    iconClassName={styles.hubIconGood}
                    title="Goal history"
                    subtitle="Active targets and completed goals"
                    onClick={() => router.push('/client/goals/history')}
                  />
                </div>
              </ProfileSection>

              {canEdit && (
                <ProfileSection>
                  <SectionHead
                    tone="cyan"
                    title="Account"
                    description="Security and session"
                    icon={<Shield size={14} strokeWidth={2} aria-hidden />}
                  />
                  <div className={styles.accountStack}>
                    <AccountRow
                      variant="neutral"
                      icon={<Lock size={14} strokeWidth={2} aria-hidden />}
                      label="Change password"
                      onClick={() => setShowPasswordModal(true)}
                    />
                    <AccountRow
                      variant="danger"
                      icon={<LogOut size={14} strokeWidth={2} aria-hidden />}
                      label="Sign out"
                      onClick={() => void handleSignOut()}
                    />
                  </div>
                </ProfileSection>
              )}
            </div>

            <StickySaveBar
              visible={canEdit}
              isDirty={isDirty}
              dirtyCount={dirtyKeyList.length}
              dirtySummaryLine={dirtySummary}
              saving={saving}
              onSave={() => {
                if (saving) return
                void handleSave()
              }}
              onDiscard={handleDiscard}
              discardDisabled={saving}
            />
          </div>
        </ClientPageShell>

        <Dialog
          open={showPasswordModal}
          onOpenChange={(open) => {
            setShowPasswordModal(open)
            if (!open) {
              setPasswordData({ newPassword: '', confirmPassword: '' })
              setPasswordError('')
              setPasswordSuccess(false)
            }
          }}
        >
          <DialogContent className="max-w-md border border-[color:var(--fc-glass-border)]">
            <DialogHeader>
              <DialogTitle className="fc-text-primary">Change password</DialogTitle>
            </DialogHeader>

            {passwordSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-14 h-14 mx-auto mb-3 fc-text-success" aria-hidden />
                <p className="text-base font-semibold fc-text-success">Password changed successfully!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newPassword" className="text-xs fc-text-dim">
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
                  <Label htmlFor="confirmPassword" className="text-xs fc-text-dim">
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
                  <div className="p-2.5 rounded-lg border border-[color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-error)_12%,transparent)] fc-text-error text-sm">
                    {passwordError}
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-lg sm:flex-1"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordData({ newPassword: '', confirmPassword: '' })
                      setPasswordError('')
                      setPasswordSuccess(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-11 rounded-lg fc-btn fc-btn-primary sm:flex-1"
                    onClick={() => void handlePasswordChange()}
                    disabled={changingPassword}
                  >
                    {changingPassword ? 'Changing…' : 'Change password'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
