'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useToast } from '@/components/ui/toast-provider'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { DatabaseService } from '@/lib/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Calendar, 
  Target, 
  Award, 
  Edit, 
  Save, 
  X,
  Camera,
  Settings,
  Shield,
  Activity,
  Bell,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Globe,
  Palette,
  Users,
  MessageCircle,
  BarChart3,
  Heart,
  Sparkles,
  Dumbbell,
  Clock,
  MapPin,
  Phone,
  Mail as MailIcon,
  UserCheck,
  Trophy,
  Zap,
  Target as TargetIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { ClientPageShell, ClientGlassCard, SectionHeader, SecondaryButton, PrimaryButton } from '@/components/client-ui'

export default function ClientProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()
  const { performanceSettings } = useTheme()
  // Check if we're viewing as another user (for coach view)
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null)
  const PROFILE_LOAD_TIMEOUT_MS = 30000
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [avatarUrlKey, setAvatarUrlKey] = useState(0)
  const profileUserIdRef = useRef<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    coachMessages: true,
    progressUpdates: true,
    weeklyReports: true,
    motivationalTips: true,
    systemUpdates: false
  })
  const [appSettings, setAppSettings] = useState({
    theme: 'light',
    units: 'metric',
    language: 'en'
  })
  const [fitnessPreferences, setFitnessPreferences] = useState({
    workoutTypes: ['strength', 'cardio'],
    timeOfDay: 'morning',
    workoutDuration: '45',
    difficulty: 'intermediate'
  })
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    fitness_level: '',
    goals: [] as string[],
    bio: '',
    phone: '',
    date_of_birth: '',
    height: '',
    weight: '',
    emergency_contact: '',
    medical_conditions: '',
    injuries: ''
  })

  useEffect(() => {
    // Check URL for viewAs parameter
    const params = new URLSearchParams(window.location.search)
    const viewAs = params.get('viewAs')
    if (viewAs) {
      setViewAsUserId(viewAs)
    }
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
        timeoutPromise
      ])
      if (data) {
        setProfile(data)
        const profileData = data as any
        setFormData({
          first_name: profileData?.first_name || '',
          last_name: profileData?.last_name || '',
          email: profileData?.email || '',
          fitness_level: profileData?.fitness_level || '',
          goals: profileData?.goals || [],
          bio: profileData?.bio || '',
          phone: profileData?.phone || '',
          date_of_birth: profileData?.date_of_birth || '',
          height: profileData?.height || '',
          weight: profileData?.weight || '',
          emergency_contact: profileData?.emergency_contact || '',
          medical_conditions: profileData?.medical_conditions || '',
          injuries: profileData?.injuries || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoadError(error instanceof Error && error.message === 'timeout'
        ? 'Loading took too long. Check your connection.'
        : 'Could not load profile.')
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
      setLoadError("Loading took too long. Tap Retry to try again.")
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({ title: 'Please select an image file', variant: 'default' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: 'Image size should be less than 5MB', variant: 'default' })
      return
    }

    try {
      setUploadingImage(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

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

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile picture update error:', updateError)
        addToast({ title: 'Photo uploaded but profile could not be updated. Please try again.', variant: 'destructive' })
        setUploadingImage(false)
        return
      }

      if (updatedProfile) {
        setProfile((prev: any) => (prev ? { ...prev, avatar_url: updatedProfile.avatar_url } : updatedProfile))
      } else {
        setProfile((prev: any) => (prev ? { ...prev, avatar_url: publicUrl } : prev))
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
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user?.id)

      if (error) {
        console.error('Error updating profile:', error)
        addToast({ title: "Couldn't update profile. Please try again.", variant: 'destructive' })
        return
      }

      setProfile({ ...profile, ...formData })
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      addToast({ title: "Couldn't update profile. Please try again.", variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      fitness_level: profile?.fitness_level || '',
      goals: profile?.goals || [],
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      emergency_contact: profile?.emergency_contact || '',
      medical_conditions: profile?.medical_conditions || '',
      injuries: profile?.injuries || ''
    })
    setEditing(false)
  }

  const addGoal = (goal: string) => {
    if (goal && !formData.goals.includes(goal)) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, goal]
      }))
    }
  }

  const removeGoal = (goalToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal !== goalToRemove)
    }))
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
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
        password: passwordData.newPassword
      })

      if (error) {
        setPasswordError(error.message)
        return
      }

      setPasswordSuccess(true)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      
      // Close modal after 2 seconds on success
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess(false)
      }, 2000)
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loadError && !loading) {
    const retryUserId = profileUserIdRef.current || viewAsUserId || user?.id
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-6xl flex items-center justify-center min-h-[60vh]">
            <ClientGlassCard className="p-8 max-w-md w-full text-center space-y-4">
              <p className="fc-text-primary font-medium">{loadError}</p>
              <PrimaryButton
                onClick={() => {
                  if (retryUserId) loadProfile(retryUserId)
                  else loadProfile(user?.id)
                }}
              >
                Retry
              </PrimaryButton>
            </ClientGlassCard>
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
          <ClientPageShell className="max-w-6xl">
            <ClientGlassCard className="p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </ClientGlassCard>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  const displayName = [formData.first_name, formData.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Profile'
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-4xl pb-32" style={{ gap: 'var(--fc-gap-sections)' }}>
          {/* Header: avatar + name + email + joined (mockup layout) */}
          <header className="flex flex-col md:flex-row items-center gap-8 mb-8 mt-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-[color:var(--fc-glass-border)] overflow-hidden fc-glass p-1 group-hover:border-[color:var(--fc-domain-workouts)] transition-colors duration-300">
                {profile?.avatar_url ? (
                  <img
                    key={`${profile.avatar_url}-${avatarUrlKey}`}
                    src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${avatarUrlKey || 0}`}
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[color:var(--fc-glass-soft)] flex items-center justify-center">
                    <User className="w-16 h-16 fc-text-subtle" />
                  </div>
                )}
              </div>
              {!viewAsUserId && (
                <label className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[color:var(--fc-domain-workouts)] flex items-center justify-center border-4 border-[color:var(--fc-bg-deep)] shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                  <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight fc-text-primary mb-2">{displayName}</h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <span className="flex items-center gap-2 text-sm fc-text-dim">
                      <MailIcon className="w-4 h-4" />
                      {formData.email || user?.email || '—'}
                    </span>
                    {joinedDate && (
                      <span className="flex items-center gap-2 text-sm fc-glass-soft px-3 py-1 rounded-full border border-[color:var(--fc-glass-border)] font-mono fc-text-dim">
                        <Calendar className="w-4 h-4" />
                        {joinedDate}
                      </span>
                    )}
                  </div>
                </div>
                {!viewAsUserId && (
                  <div className="flex gap-3 justify-center sm:justify-end">
                    {editing ? (
                      <>
                        <Button variant="outline" onClick={handleCancel} className="fc-btn fc-btn-secondary">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="fc-btn fc-btn-primary">
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setEditing(true)} className="fc-btn fc-btn-primary">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Profile Mini Hub — Achievements, Goal History, Profile Information, Menu */}
          <section>
            <SectionHeader title="Profile Hub" />
            <ClientGlassCard className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button variant="outline" className="fc-btn fc-btn-ghost h-12 rounded-xl justify-start gap-3" onClick={() => router.push("/client/progress/achievements")}>
                <Award className="w-5 h-5 fc-text-warning" />
                <div className="text-left">
                  <span className="font-semibold">Achievements</span>
                  <p className="text-xs fc-text-dim font-normal">All achievements across Training, Nutrition, Lifestyle</p>
                </div>
              </Button>
              <Button variant="outline" className="fc-btn fc-btn-ghost h-12 rounded-xl justify-start gap-3" onClick={() => router.push("/client/goals/history")}>
                <Target className="w-5 h-5 fc-text-success" />
                <div className="text-left">
                  <span className="font-semibold">Goal History</span>
                  <p className="text-xs fc-text-dim font-normal">Track goals across the app</p>
                </div>
              </Button>
            </div>
          </ClientGlassCard>
          </section>

          <div className="grid grid-cols-1 gap-8">
            {/* Preferences | Notifications — two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ClientGlassCard className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-[color:var(--fc-status-success)]/10 flex items-center justify-center border border-[color:var(--fc-status-success)]/20">
                    <Settings className="w-5 h-5 fc-text-success" />
                  </div>
                  <h2 className="text-xl font-semibold fc-text-primary">Preferences</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium fc-text-primary">Units</div>
                      <div className="text-xs fc-text-subtle">Metric (kg) or Imperial (lbs)</div>
                    </div>
                    <div className="flex fc-glass-soft p-1 rounded-xl border border-[color:var(--fc-glass-border)]">
                      <button type="button" onClick={() => setAppSettings(prev => ({ ...prev, units: 'metric' }))} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${appSettings.units === 'metric' ? 'fc-glass border border-[color:var(--fc-glass-border)]' : 'fc-text-dim hover:fc-text-primary'}`}>KG</button>
                      <button type="button" onClick={() => setAppSettings(prev => ({ ...prev, units: 'imperial' }))} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${appSettings.units === 'imperial' ? 'fc-glass border border-[color:var(--fc-glass-border)]' : 'fc-text-dim hover:fc-text-primary'}`}>LB</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold fc-text-subtle uppercase tracking-widest">Language</Label>
                    <Select value={appSettings.language} onValueChange={(v) => setAppSettings(prev => ({ ...prev, language: v }))}>
                      <SelectTrigger className="fc-input rounded-xl py-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ClientGlassCard>

              <ClientGlassCard className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-[color:var(--fc-status-error)]/10 flex items-center justify-center border border-[color:var(--fc-status-error)]/20">
                    <Bell className="w-5 h-5 fc-text-error" />
                  </div>
                  <h2 className="text-xl font-semibold fc-text-primary">Notifications</h2>
                </div>
                <div className="space-y-5">
                  {[
                    { key: 'workoutReminders', label: 'Workout reminders', icon: Dumbbell },
                    { key: 'coachMessages', label: 'Coach messages', icon: MessageCircle },
                    { key: 'progressUpdates', label: 'Progress updates', icon: BarChart3 },
                    { key: 'motivationalTips', label: 'Motivational tips', icon: Star }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="fc-text-primary flex items-center gap-2"><Icon className="w-4 h-4 fc-text-subtle" />{label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={(notifications as any)[key]} onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))} className="sr-only peer" />
                        <div className="relative w-12 h-6 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] peer-checked:bg-[color:var(--fc-status-success)] peer-checked:border-[color:var(--fc-status-success)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-[color:var(--fc-surface)] after:border after:border-[color:var(--fc-glass-border)] after:transition-transform peer-checked:after:translate-x-6" />
                      </label>
                    </div>
                  ))}
                </div>
              </ClientGlassCard>
            </div>

            {/* Account & Privacy — toggles + action buttons */}
            <ClientGlassCard className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg fc-glass-soft flex items-center justify-center border border-[color:var(--fc-glass-border)]">
                  <Shield className="w-5 h-5 fc-text-subtle" />
                </div>
                <h2 className="text-xl font-semibold fc-text-primary">Account & Privacy</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="fc-btn fc-btn-ghost h-12 rounded-xl justify-center gap-2" onClick={() => setShowPasswordModal(true)}>
                  <Lock className="w-4 h-4" />
                  Password
                </Button>
                <Button variant="outline" className="fc-btn fc-btn-ghost h-12 rounded-xl justify-center gap-2">
                  <Globe className="w-4 h-4" />
                  Export Data
                </Button>
                <Button variant="outline" className="fc-btn fc-btn-ghost h-12 rounded-xl justify-center gap-2" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
                <Button variant="outline" className="h-12 rounded-xl justify-center gap-2 border-[color:var(--fc-status-error)] fc-text-error hover:bg-[color:var(--fc-status-error)]/10" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </ClientGlassCard>

          {/* Goals & Preferences */}
          <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <TargetIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Goals & Preferences</CardTitle>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">Your fitness goals and workout preferences</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Preferred Workout Time</Label>
                  <Select value={fitnessPreferences.timeOfDay} onValueChange={(value) => setFitnessPreferences(prev => ({ ...prev, timeOfDay: value }))}>
                    <SelectTrigger className="fc-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 6PM)</SelectItem>
                      <SelectItem value="evening">Evening (6PM - 10PM)</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Workout Duration</Label>
                  <Select value={fitnessPreferences.workoutDuration} onValueChange={(value) => setFitnessPreferences(prev => ({ ...prev, workoutDuration: value }))}>
                    <SelectTrigger className="fc-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90+ minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Fitness Information */}
          <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Fitness Information</CardTitle>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">Your current fitness level and measurements</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fitness_level" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Fitness Level</Label>
                <Select 
                  value={formData.fitness_level} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fitness_level: value }))}
                  disabled={!editing}
                >
                  <SelectTrigger className="fc-select">
                    <SelectValue placeholder="Select fitness level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Height</Label>
                  <Input
                    id="height"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                    disabled={!editing}
                    placeholder="e.g., 5'10 or 178cm"
                    className="fc-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Weight</Label>
                  <Input
                    id="weight"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    disabled={!editing}
                    placeholder="e.g., 150lbs or 68kg"
                    className="fc-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Goals</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.goals.map((goal, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {goal}
                      {editing && (
                        <button
                          onClick={() => removeGoal(goal)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a goal..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addGoal(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add a goal..."]') as HTMLInputElement
                        if (input?.value) {
                          addGoal(input.value)
                          input.value = ''
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-[color:var(--fc-text-primary)]">
                <Shield className="w-5 h-5" />
                Health Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  disabled={!editing}
                  placeholder="Name and phone number"
                  className="fc-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_conditions" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
                  disabled={!editing}
                  rows={3}
                  placeholder="List any medical conditions..."
                  className="fc-textarea"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuries" className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Injuries</Label>
                <Textarea
                  id="injuries"
                  value={formData.injuries}
                  onChange={(e) => setFormData(prev => ({ ...prev, injuries: e.target.value }))}
                  disabled={!editing}
                  rows={3}
                  placeholder="List any current or past injuries..."
                  className="fc-textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Account Information */}
          <Card className="fc-glass fc-card rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-[color:var(--fc-text-primary)]">Account Information</CardTitle>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">Your account details and status</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--fc-text-primary)]">Member Since</div>
                      <div className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <Badge className="fc-badge">Active</Badge>
                  </div>
                </div>
                
                <div className="p-4 rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--fc-text-primary)]">Account Role</div>
                      <div className="text-sm text-[color:var(--fc-text-dim)] mt-1">Fitness Client</div>
                    </div>
                    <Badge className="fc-badge">Client</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          </div>
        </ClientPageShell>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="fc-glass fc-card rounded-3xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[color:var(--fc-text-primary)]">Change Password</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setPasswordError('')
                    setPasswordSuccess(false)
                  }}
                  className="min-w-11 min-h-11"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {passwordSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-600">Password changed successfully!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowPasswordModal(false)
                        setPasswordData({ newPassword: '', confirmPassword: '' })
                        setPasswordError('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handlePasswordChange}
                      disabled={changingPassword}
                    >
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete account confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="fc-glass fc-card rounded-2xl p-8 w-full max-w-sm border-[color:var(--fc-status-error)]/30">
              <h3 className="text-xl font-bold fc-text-primary mb-4">Delete account?</h3>
              <p className="text-sm fc-text-dim mb-6">This cannot be undone. Your data will be permanently removed.</p>
              <div className="flex flex-col gap-3">
                <Button className="fc-btn fc-btn-primary w-full" onClick={() => setShowDeleteConfirm(false)}>
                  Keep account
                </Button>
                <Button variant="outline" className="w-full fc-text-error border-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10" onClick={() => setShowDeleteConfirm(false)}>
                  Delete forever
                </Button>
              </div>
            </div>
          </div>
        )}
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
