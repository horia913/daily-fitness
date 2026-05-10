'use client'

/**
 * Phase 0b Task 8: `var(--fc-accent)` → `var(--fc-accent-cyan)` (see `docs/ui-rollout-notes.md`).
 * Active Clients stat tile: Option A — `var(--fc-accent-secondary, var(--fc-accent-cyan))` only
 * (inner fallback cyan; outer token reserved for a future v5 definition).
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { withTimeout } from '@/lib/withTimeout'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { useTheme } from '@/contexts/ThemeContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Target,
  Plus,
  Users,
  Search,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  RefreshCw,
  Zap,
  Activity,
  Scale,
  Heart,
  Dumbbell,
  Apple,
  Ruler
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast-provider'

interface Goal {
  id: string
  client_id: string
  title: string
  description: string | null
  metric_type: 'body_measurement' | 'exercise_pr' | 'workout_count' | 'daily_nutrition' | 'custom'
  selected_exercises?: string[] // Array of exercise IDs
  selected_body_parts?: string[] // Array of body part names
  selected_nutrients?: string[] // Array of nutrient names
  target_value: number
  current_value: number
  unit: string
  target_date: string
  status: 'active' | 'completed' | 'paused'
  auto_track: boolean
  created_at: string
  client?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

const metricOptions = [
  { value: 'body_measurement', label: 'Body Measurements', unit: 'varies', icon: 'scale', autoTrackable: true, source: 'body_metrics table', requiresSelection: 'body_parts' },
  { value: 'exercise_pr', label: 'Exercise Personal Record', unit: 'kg', icon: 'dumbbell', autoTrackable: true, source: 'workout_logs (max weight)', requiresSelection: 'exercises' },
  { value: 'workout_count', label: 'Total Workouts Completed', unit: 'workouts', icon: 'activity', autoTrackable: true, source: 'workout_logs count', requiresSelection: null },
  { value: 'daily_nutrition', label: 'Daily Nutrition Target', unit: 'g', icon: 'apple', autoTrackable: true, source: 'meal_completions (daily avg)', requiresSelection: 'nutrients' },
  { value: 'custom', label: 'Custom Goal (Manual Tracking)', unit: 'custom', icon: 'target', autoTrackable: false, source: 'Manual updates only', requiresSelection: null },
]

const bodyPartOptions = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'height', label: 'Height', unit: 'cm' },
  { value: 'body_fat', label: 'Body Fat %', unit: '%' },
  { value: 'muscle_mass', label: 'Muscle Mass', unit: 'kg' },
  { value: 'waist', label: 'Waist', unit: 'cm' },
  { value: 'chest', label: 'Chest', unit: 'cm' },
  { value: 'arms', label: 'Arms', unit: 'cm' },
  { value: 'thighs', label: 'Thighs', unit: 'cm' },
  { value: 'hips', label: 'Hips', unit: 'cm' },
  { value: 'neck', label: 'Neck', unit: 'cm' },
]

const nutrientOptions = [
  { value: 'calories', label: 'Calories', unit: 'kcal' },
  { value: 'protein', label: 'Protein', unit: 'g' },
  { value: 'carbs', label: 'Carbohydrates', unit: 'g' },
  { value: 'fat', label: 'Fat', unit: 'g' },
  { value: 'fiber', label: 'Fiber', unit: 'g' },
  { value: 'sugar', label: 'Sugar', unit: 'g' },
  { value: 'water', label: 'Water', unit: 'L' },
]

function CoachGoalsContent() {
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()

  const [goals, setGoals] = useState<Goal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [goalForm, setGoalForm] = useState({
    client_id: '',
    title: '',
    description: '',
    metric_type: 'body_measurement' as any,
    selected_exercises: [] as string[],
    selected_body_parts: [] as string[],
    selected_nutrients: [] as string[],
    target_value: 0,
    current_value: 0,
    unit: 'kg',
    target_date: '',
    status: 'active' as 'active' | 'completed' | 'paused',
    auto_track: true
  })

  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      setLoading(true)
      await withTimeout(
        (async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('client_id')
            .eq('coach_id', user.id)
            .eq('status', 'active')
          if (clientsError) {
            setClients([])
            setGoals([])
            return
          }
          if (!clientsData || clientsData.length === 0) {
            setClients([])
            setGoals([])
            return
          }
          const clientIds = clientsData.map(c => c.client_id)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .in('id', clientIds)
          const clientsWithProfiles = profilesData?.map(profile => ({
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          })) || []
          setClients(clientsWithProfiles)
          const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name, category')
            .order('name')
          if (exercisesData) setExercises(exercisesData)
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })
          if (goalsError) {
            setGoals([])
          } else if (goalsData) {
            const goalsWithClients = goalsData.map(goal => ({
              ...goal,
              client: profilesData?.find(p => p.id === goal.client_id)
            }))
            setGoals(goalsWithClients)
          }
        })(),
        45000,
        'loadData'
      )
    } catch (error) {
      console.error('Error loading data:', error)
      setGoals([])
      setClients([])
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  const goalsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (goalsTimeoutRef.current) clearTimeout(goalsTimeoutRef.current)
    goalsTimeoutRef.current = setTimeout(() => {
      goalsTimeoutRef.current = null
      setLoading(false)
    }, 20_000)
    loadData().finally(() => {
      if (goalsTimeoutRef.current) {
        clearTimeout(goalsTimeoutRef.current)
        goalsTimeoutRef.current = null
      }
    })
    return () => {
      if (goalsTimeoutRef.current) {
        clearTimeout(goalsTimeoutRef.current)
        goalsTimeoutRef.current = null
      }
    }
  }, [loadData])

  const handleMetricTypeChange = (metricType: string) => {
    const metric = metricOptions.find(m => m.value === metricType)
    if (metric) {
      setGoalForm(prev => ({
        ...prev,
        metric_type: metricType,
        unit: metric.unit,
        auto_track: metric.autoTrackable,
        title: prev.title || metric.label,
        selected_exercises: [],
        selected_body_parts: [],
        selected_nutrients: []
      }))
    }
  }

  const toggleExercise = (exerciseId: string) => {
    setGoalForm(prev => ({
      ...prev,
      selected_exercises: prev.selected_exercises.includes(exerciseId)
        ? prev.selected_exercises.filter(id => id !== exerciseId)
        : [...prev.selected_exercises, exerciseId]
    }))
  }

  const toggleBodyPart = (bodyPart: string) => {
    setGoalForm(prev => ({
      ...prev,
      selected_body_parts: prev.selected_body_parts.includes(bodyPart)
        ? prev.selected_body_parts.filter(bp => bp !== bodyPart)
        : [...prev.selected_body_parts, bodyPart]
    }))
  }

  const toggleNutrient = (nutrient: string) => {
    setGoalForm(prev => ({
      ...prev,
      selected_nutrients: prev.selected_nutrients.includes(nutrient)
        ? prev.selected_nutrients.filter(n => n !== nutrient)
        : [...prev.selected_nutrients, nutrient]
    }))
  }

  const createGoal = async () => {
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          client_id: goalForm.client_id,
          pillar: 'general',
          title: goalForm.title,
          description: goalForm.description,
          metric_type: goalForm.metric_type,
          selected_exercises: goalForm.selected_exercises.length > 0 ? goalForm.selected_exercises : null,
          selected_body_parts: goalForm.selected_body_parts.length > 0 ? goalForm.selected_body_parts : null,
          selected_nutrients: goalForm.selected_nutrients.length > 0 ? goalForm.selected_nutrients : null,
          target_value: goalForm.target_value,
          current_value: goalForm.current_value,
          unit: goalForm.unit,
          target_date: goalForm.target_date,
          status: goalForm.status,
          auto_track: goalForm.auto_track
        })

      if (error) {
        console.error('Error creating goal:', error)
        addToast({ title: "Couldn't create goal. Please try again.", variant: "destructive" })
        return
      }

      setShowCreateGoal(false)
      setGoalForm({
        client_id: '',
        title: '',
        description: '',
        metric_type: 'weight',
        selected_exercises: [],
        selected_body_parts: [],
        selected_nutrients: [],
        target_value: 0,
        current_value: 0,
        unit: 'kg',
        target_date: '',
        status: 'active',
        auto_track: true
      })
      loadData()
    } catch (error) {
      console.error('Error creating goal:', error)
      addToast({ title: "Couldn't create goal. Please try again.", variant: "destructive" })
    }
  }

  const updateGoal = async () => {
    try {
      if (!selectedGoal) return

      const { error } = await supabase
        .from('goals')
        .update({
          title: goalForm.title,
          description: goalForm.description,
          target_value: goalForm.target_value,
          current_value: goalForm.current_value,
          target_date: goalForm.target_date,
          status: goalForm.status
        })
        .eq('id', selectedGoal.id)

      if (error) {
        console.error('Error updating goal:', error)
        addToast({ title: "Couldn't update goal. Please try again.", variant: "destructive" })
        return
      }

      setShowEditGoal(false)
      setSelectedGoal(null)
      loadData()
    } catch (error) {
      console.error('Error updating goal:', error)
      addToast({ title: "Couldn't update goal. Please try again.", variant: "destructive" })
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        console.error('Error deleting goal:', error)
        addToast({ title: "Couldn't delete goal. Please try again.", variant: "destructive" })
        return
      }

      loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
      addToast({ title: "Couldn't delete goal. Please try again.", variant: "destructive" })
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setGoalForm({
      client_id: goal.client_id,
      title: goal.title,
      description: goal.description || '',
      metric_type: goal.metric_type,
      selected_exercises: (goal as any).selected_exercises || [],
      selected_body_parts: (goal as any).selected_body_parts || [],
      selected_nutrients: (goal as any).selected_nutrients || [],
      target_value: goal.target_value,
      current_value: goal.current_value,
      unit: goal.unit,
      target_date: goal.target_date,
      status: goal.status,
      auto_track: goal.auto_track
    })
    setShowEditGoal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-[color-mix(in_srgb,var(--fc-status-info)_15%,transparent)] text-[color:var(--fc-status-info)] border border-[color-mix(in_srgb,var(--fc-status-info)_30%,transparent)]">
            Active
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-[color-mix(in_srgb,var(--fc-status-success)_15%,transparent)] text-[color:var(--fc-status-success)] border border-[color-mix(in_srgb,var(--fc-status-success)_30%,transparent)]">
            Completed
          </Badge>
        )
      case 'paused':
        return (
          <Badge className="fc-glass-soft fc-text-dim border border-[color:var(--fc-glass-border)]">
            Paused
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getMetricIcon = (metricType: string) => {
    const metric = metricOptions.find(m => m.value === metricType)
    const iconName = metric?.icon || 'target'
    
    const iconMap: { [key: string]: any } = {
      scale: Scale,
      ruler: Ruler,
      activity: Activity,
      dumbbell: Dumbbell,
      heart: Heart,
      apple: Apple,
      target: Target
    }
    
    const IconComponent = iconMap[iconName] || Target
    return <IconComponent className="w-5 h-5 text-white" />
  }

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <CoachPageShell widthVariant="data-7xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6">
            <PageSkeleton variant="dashboard" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="data-7xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6">
          <div className="space-y-6">
              <GlassCard elevation={2} className="fc-card-shell p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent-cyan)]">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                        Client Goals
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                        Set outcomes and auto-track progress from workouts and metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[color:var(--fc-accent-cyan)] p-3 text-white shadow-lg">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[color:var(--fc-text-primary)] mb-2">
                    Automated Progress Tracking
                  </h3>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Goals update automatically from workouts, body measurements, nutrition logs, and PRs.
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
                  <Input
                    placeholder="Search goals or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input h-12 w-full pl-12"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="fc-select h-12 w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </GlassCard>

            <div className="flex flex-wrap gap-3">
              <Button variant="fc-primary" onClick={() => setShowCreateGoal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Create Goal
              </Button>
              <Button variant="fc-ghost" onClick={loadData}>
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-accent-cyan)_18%,transparent)] text-[color:var(--fc-accent-cyan)]">
                    <Target className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">{goals.length}</p>
                    <p className="text-sm font-normal fc-text-dim">Total Goals</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-status-info)_18%,transparent)] text-[color:var(--fc-status-info)]">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">{goals.filter(g => g.status === 'active').length}</p>
                    <p className="text-sm font-normal fc-text-dim">Active</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-status-success)_18%,transparent)] text-[color:var(--fc-status-success)]">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">{goals.filter(g => g.status === 'completed').length}</p>
                    <p className="text-sm font-normal fc-text-dim">Completed</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-accent-secondary,var(--fc-accent-cyan))_18%,transparent)] text-[color:var(--fc-accent-secondary,var(--fc-accent-cyan))]">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">{clients.length}</p>
                    <p className="text-sm font-normal fc-text-dim">Active Clients</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Goals List */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold fc-text-primary flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--fc-accent-cyan)_18%,transparent)] text-[color:var(--fc-accent-cyan)]">
                  <Target className="w-5 h-5" />
                </div>
                Client Goals
              </h2>
              {filteredGoals.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No goals yet"
                  description="Set goals to track client progress."
                  actionLabel="Create goal"
                  onAction={() => setShowCreateGoal(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map(goal => {
                    const progress = calculateProgress(goal.current_value, goal.target_value)
                    return (
                      <GlassCard key={goal.id} elevation={1} className="group p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--fc-accent-cyan)_18%,transparent)] text-[color:var(--fc-accent-cyan)] shrink-0">
                                    {getMetricIcon(goal.metric_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold fc-text-primary truncate group-hover:text-[color:var(--fc-accent-cyan)] transition-colors">
                                      {goal.title}
                                    </h3>
                                    {goal.client && (
                                      <p className="text-sm fc-text-dim truncate">
                                        {goal.client.first_name} {goal.client.last_name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {goal.auto_track && (
                                  <div className="flex items-center gap-1 mb-2">
                                    <Zap className="w-3 h-3 text-[color:var(--fc-status-success)]" />
                                    <span className="text-xs text-[color:var(--fc-status-success)] font-medium">Auto-tracking</span>
                                  </div>
                                )}

                                {/* Show what's being tracked */}
                                {goal.selected_exercises && goal.selected_exercises.length > 0 && (
                                  <div className="text-xs fc-text-dim fc-glass-soft border border-[color:var(--fc-glass-border)] p-2 rounded-lg mb-2">
                                    <Dumbbell className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_exercises.length} exercise(s)
                                  </div>
                                )}
                                {goal.selected_body_parts && goal.selected_body_parts.length > 0 && (
                                  <div className="text-xs fc-text-dim fc-glass-soft border border-[color:var(--fc-glass-border)] p-2 rounded-lg mb-2">
                                    <Ruler className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_body_parts.join(', ')}
                                  </div>
                                )}
                                {goal.selected_nutrients && goal.selected_nutrients.length > 0 && (
                                  <div className="text-xs fc-text-dim fc-glass-soft border border-[color:var(--fc-glass-border)] p-2 rounded-lg mb-2">
                                    <Apple className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_nutrients.join(', ')}
                                  </div>
                                )}

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="fc-text-dim">Progress</span>
                                    <span className="font-bold fc-text-primary">{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  <div className="flex justify-between text-xs">
                                    <span className="fc-text-dim">
                                      Current: {goal.current_value} {goal.unit}
                                    </span>
                                    <span className="fc-text-dim">
                                      Target: {goal.target_value} {goal.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="fc-text-dim text-sm flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {new Date(goal.target_date).toLocaleDateString()}
                                    </span>
                                    {getStatusBadge(goal.status)}
                                  </div>
                                  {goal.description && (
                                    <p className="text-sm fc-text-dim line-clamp-2 mt-2">
                                      {goal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-[color:var(--fc-glass-border)]">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditGoal(goal)}
                                className="flex-1 rounded-xl"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteGoal(goal.id)}
                                className="rounded-xl text-[color:var(--fc-status-error)] hover:bg-[color-mix(in_srgb,var(--fc-status-error)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--fc-status-error)_30%,transparent)]"
                                aria-label="Delete goal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                      </GlassCard>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create Goal Modal */}
            <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
              <DialogContent className="max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Create Goal</DialogTitle>
                  <DialogDescription>
                    Set a fitness goal that will auto-track from app data
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto pr-1 -mr-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="client">Select Client</Label>
                    <Select value={goalForm.client_id} onValueChange={(value) => setGoalForm(prev => ({ ...prev, client_id: value }))}>
                      <SelectTrigger id="client">
                        <Users className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="metric_type">What to Track?</Label>
                    <Select value={goalForm.metric_type} onValueChange={handleMetricTypeChange}>
                      <SelectTrigger id="metric_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metricOptions.map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            <div className="flex flex-col">
                              <span>{metric.label}</span>
                              {metric.autoTrackable && (
                                <span className="text-xs text-[color:var(--fc-status-success)]">
                                  Auto-tracks from {metric.source}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Exercise Selection */}
                  {goalForm.metric_type === 'exercise_pr' && (
                    <div className="space-y-1.5">
                      <Label>Select Exercise(s) to Track</Label>
                      <div className="max-h-48 overflow-y-auto border border-[color:var(--fc-glass-border)] rounded-xl p-3 space-y-2 fc-surface">
                        {exercises.map(exercise => (
                          <div key={exercise.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`ex-${exercise.id}`}
                              checked={goalForm.selected_exercises.includes(exercise.id)}
                              onCheckedChange={() => toggleExercise(exercise.id)}
                            />
                            <Label htmlFor={`ex-${exercise.id}`} className="cursor-pointer flex-1 font-normal">
                              {exercise.name}
                              <span className="text-xs fc-text-dim ml-2">({exercise.category})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs fc-text-dim">
                        Selected: {goalForm.selected_exercises.length} exercise(s)
                      </p>
                    </div>
                  )}

                  {/* Body Part Selection */}
                  {goalForm.metric_type === 'body_measurement' && (
                    <div className="space-y-1.5">
                      <Label>Select Body Measurement(s) to Track</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {bodyPartOptions.map(bodyPart => (
                          <div key={bodyPart.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`bp-${bodyPart.value}`}
                              checked={goalForm.selected_body_parts.includes(bodyPart.value)}
                              onCheckedChange={() => toggleBodyPart(bodyPart.value)}
                            />
                            <Label htmlFor={`bp-${bodyPart.value}`} className="cursor-pointer text-sm font-normal">
                              {bodyPart.label} ({bodyPart.unit})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs fc-text-dim">
                        Selected: {goalForm.selected_body_parts.length} measurement(s)
                      </p>
                    </div>
                  )}

                  {/* Nutrient Selection */}
                  {goalForm.metric_type === 'daily_nutrition' && (
                    <div className="space-y-1.5">
                      <Label>Select Nutrient(s) to Track</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {nutrientOptions.map(nutrient => (
                          <div key={nutrient.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`nut-${nutrient.value}`}
                              checked={goalForm.selected_nutrients.includes(nutrient.value)}
                              onCheckedChange={() => toggleNutrient(nutrient.value)}
                            />
                            <Label htmlFor={`nut-${nutrient.value}`} className="cursor-pointer text-sm font-normal">
                              {nutrient.label} ({nutrient.unit})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs fc-text-dim">
                        Selected: {goalForm.selected_nutrients.length} nutrient(s)
                      </p>
                    </div>
                  )}

                  {goalForm.auto_track && (
                    <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--fc-status-success)_10%,transparent)] border border-[color-mix(in_srgb,var(--fc-status-success)_30%,transparent)]">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-[color:var(--fc-status-success)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold fc-text-primary mb-1">Auto-Tracking Enabled</p>
                          <p className="text-xs fc-text-dim">
                            Progress will update automatically from: <strong>{metricOptions.find(m => m.value === goalForm.metric_type)?.source}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="title">Goal Title</Label>
                    <Input
                      id="title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={metricOptions.find(m => m.value === goalForm.metric_type)?.label || "e.g., Lose 10kg"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add personalized notes..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="current_value">Current Value</Label>
                      <Input
                        id="current_value"
                        type="number"
                        step="0.1"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="target_value">Target Value</Label>
                      <Input
                        id="target_value"
                        type="number"
                        step="0.1"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-[color:var(--fc-glass-border)]">
                  <Button
                    onClick={createGoal}
                    variant="fc-primary"
                    className="flex-1"
                    disabled={!goalForm.client_id || !goalForm.title || !goalForm.target_date}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateGoal(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Goal Modal */}
            <Dialog open={showEditGoal} onOpenChange={setShowEditGoal}>
              <DialogContent className="max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Goal</DialogTitle>
                  <DialogDescription>
                    Update goal details and track progress
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto pr-1 -mr-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-title">Goal Title</Label>
                    <Input
                      id="edit-title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-description">Description (Optional)</Label>
                    <Textarea
                      id="edit-description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-current_value">Current Value</Label>
                      <Input
                        id="edit-current_value"
                        type="number"
                        step="0.1"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                      />
                      {selectedGoal?.auto_track && (
                        <p className="text-xs text-[color:var(--fc-status-success)]">Auto-updates from app</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-target_value">Target Value</Label>
                      <Input
                        id="edit-target_value"
                        type="number"
                        step="0.1"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select value={goalForm.status} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-target_date">Target Date</Label>
                      <Input
                        id="edit-target_date"
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-[color:var(--fc-glass-border)]">
                  <Button
                    onClick={updateGoal}
                    variant="fc-primary"
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditGoal(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

function GoalsHabitsHubInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('tab') === 'habits') {
      router.replace('/coach/goals', { scroll: false })
    }
  }, [searchParams, router])

  return <CoachGoalsContent />
}

function GoalsHabitsHubFallback() {
  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell widthVariant="data-7xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6">
          <PageSkeleton variant="dashboard" />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

export default function CoachGoalsPage() {
  return (
    <Suspense fallback={<GoalsHabitsHubFallback />}>
      <GoalsHabitsHubInner />
    </Suspense>
  )
}
