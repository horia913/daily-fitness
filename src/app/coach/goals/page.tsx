'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  TrendingUp,
  Calendar,
  RefreshCw,
  Zap,
  Activity,
  Scale,
  Heart,
  Dumbbell,
  Apple,
  Ruler,
  TrendingDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export default function CoachGoals() {
  const { isDark, getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()
  
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

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('client_id')
        .eq('coach_id', user.id)
        .eq('status', 'active')

      if (clientsError) {
        console.log('Clients error:', clientsError)
        setClients([])
        setGoals([])
      } else if (clientsData && clientsData.length > 0) {
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

        // Load exercises from exercise library
        const { data: exercisesData } = await supabase
          .from('exercises')
          .select('id, name, category')
          .order('name')

        if (exercisesData) {
          setExercises(exercisesData)
        }

        // Load goals
        try {
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })

          if (goalsError) {
            console.log('Goals table error:', goalsError)
            setGoals([])
          } else if (goalsData) {
            const goalsWithClients = goalsData.map(goal => ({
              ...goal,
              client: profilesData?.find(p => p.id === goal.client_id)
            }))

            console.log('Goals loaded successfully:', goalsWithClients.length, 'items')
            setGoals(goalsWithClients)
          }
        } catch (error) {
          console.log('Goals table error:', error)
          setGoals([])
        }
      } else {
        setClients([])
        setGoals([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setGoals([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
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
        alert('Error creating goal. Please try again.')
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
      alert('Error creating goal. Please try again.')
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
        alert('Error updating goal. Please try again.')
        return
      }

      setShowEditGoal(false)
      setSelectedGoal(null)
      loadData()
    } catch (error) {
      console.error('Error updating goal:', error)
      alert('Error updating goal. Please try again.')
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
        alert('Error deleting goal. Please try again.')
        return
      }

      loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Error deleting goal. Please try again.')
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
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Paused</Badge>
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
        <div style={{ backgroundColor: '#E8E9F3', minHeight: '100vh', paddingBottom: '100px' }}>
          <div style={{ padding: '24px 20px' }}>
            <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '32px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div className="animate-pulse">
                  <div className={`h-8 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-xl mb-4`}></div>
                  <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg w-3/4 mb-2`}></div>
                  <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg w-1/2`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-24">
          <div className="px-6 pt-10">
            <div className="max-w-7xl mx-auto space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <Badge className="fc-badge fc-badge-strong w-fit">Goal Command</Badge>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-semibold text-[color:var(--fc-text-primary)]">
                          Client Goals
                        </h1>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          Set outcomes and auto-track progress from workouts and metrics.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-3 text-white shadow-lg">
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
              <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
                <DialogTrigger asChild>
                  <Button className="fc-btn fc-btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Goal
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button variant="outline" onClick={loadData} className="fc-btn fc-btn-ghost">
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                <div className="flex items-center gap-4">
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1' }}>{goals.length}</p>
                    <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Total Goals</p>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                <div className="flex items-center gap-4">
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1' }}>{goals.filter(g => g.status === 'active').length}</p>
                    <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Active</p>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                <div className="flex items-center gap-4">
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1' }}>{goals.filter(g => g.status === 'completed').length}</p>
                    <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Completed</p>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                <div className="flex items-center gap-4">
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1' }}>{clients.length}</p>
                    <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Active Clients</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-6">
              <h2 className={`text-2xl font-bold ${theme.text} flex items-center gap-3`}>
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                Client Goals
              </h2>
              {filteredGoals.length === 0 ? (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '48px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', textAlign: 'center' }}>
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Target className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                      No Goals Set
                    </h3>
                    <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                      Start setting fitness goals for your clients. Goals will auto-track from workouts, nutrition logs, and body measurements.
                    </p>
                    <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:scale-105 transition-all duration-200 px-8 py-3 text-lg font-semibold">
                          <Plus className="w-5 h-5 mr-2" />
                          Create First Goal
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map(goal => {
                    const progress = calculateProgress(goal.current_value, goal.target_value)
                    return (
                      <div key={goal.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                                    {getMetricIcon(goal.metric_type)}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                      {goal.title}
                                    </h3>
                                    {goal.client && (
                                      <p className={`text-sm ${theme.textSecondary}`}>
                                        {goal.client.first_name} {goal.client.last_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {goal.auto_track && (
                                  <div className="flex items-center gap-1 mb-2">
                                    <Zap className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Auto-tracking</span>
                                  </div>
                                )}

                                {/* Show what's being tracked */}
                                {goal.selected_exercises && goal.selected_exercises.length > 0 && (
                                  <div className={`text-xs ${theme.textSecondary} bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2`}>
                                    <Dumbbell className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_exercises.length} exercise(s)
                                  </div>
                                )}
                                {goal.selected_body_parts && goal.selected_body_parts.length > 0 && (
                                  <div className={`text-xs ${theme.textSecondary} bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2`}>
                                    <Ruler className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_body_parts.join(', ')}
                                  </div>
                                )}
                                {goal.selected_nutrients && goal.selected_nutrients.length > 0 && (
                                  <div className={`text-xs ${theme.textSecondary} bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2`}>
                                    <Apple className="w-3 h-3 inline mr-1" />
                                    Tracking: {goal.selected_nutrients.join(', ')}
                                  </div>
                                )}

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between text-sm">
                                    <span className={theme.textSecondary}>Progress</span>
                                    <span className={`font-bold ${theme.text}`}>{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  <div className="flex justify-between text-xs">
                                    <span className={theme.textSecondary}>
                                      Current: {goal.current_value} {goal.unit}
                                    </span>
                                    <span className={theme.textSecondary}>
                                      Target: {goal.target_value} {goal.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`${theme.textSecondary} text-sm flex items-center gap-1`}>
                                      <Calendar className="w-4 h-4" />
                                      {new Date(goal.target_date).toLocaleDateString()}
                                    </span>
                                    {getStatusBadge(goal.status)}
                                  </div>
                                  {goal.description && (
                                    <p className={`text-sm ${theme.textSecondary} line-clamp-2 mt-2`}>
                                      {goal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditGoal(goal)}
                                className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteGoal(goal.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create Goal Modal */}
            <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
              <DialogContent className="rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(600px,95vw)] !m-0 !p-0 overflow-hidden" style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Create Goal</DialogTitle>
                    <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                      Set a fitness goal that will auto-track from app data
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                  <div>
                    <Label htmlFor="client" className={`${theme.text}`}>Select Client</Label>
                    <Select value={goalForm.client_id} onValueChange={(value) => setGoalForm(prev => ({ ...prev, client_id: value }))}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
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

                  <div>
                    <Label htmlFor="metric_type" className={`${theme.text}`}>What to Track?</Label>
                    <Select value={goalForm.metric_type} onValueChange={handleMetricTypeChange}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metricOptions.map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            <div className="flex flex-col">
                              <span>{metric.label}</span>
                              {metric.autoTrackable && (
                                <span className="text-xs text-green-600 dark:text-green-400">
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
                    <div>
                      <Label className={`${theme.text} mb-2 block`}>Select Exercise(s) to Track</Label>
                      <div className={`max-h-48 overflow-y-auto border-2 ${theme.border} rounded-xl p-3 space-y-2`}>
                        {exercises.map(exercise => (
                          <div key={exercise.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`ex-${exercise.id}`}
                              checked={goalForm.selected_exercises.includes(exercise.id)}
                              onChange={() => toggleExercise(exercise.id)}
                              className="w-4 h-4 rounded"
                            />
                            <Label htmlFor={`ex-${exercise.id}`} className={`${theme.text} cursor-pointer flex-1`}>
                              {exercise.name}
                              <span className={`text-xs ${theme.textSecondary} ml-2`}>({exercise.category})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs ${theme.textSecondary} mt-2`}>
                        Selected: {goalForm.selected_exercises.length} exercise(s)
                      </p>
                    </div>
                  )}

                  {/* Body Part Selection */}
                  {goalForm.metric_type === 'body_measurement' && (
                    <div>
                      <Label className={`${theme.text} mb-2 block`}>Select Body Measurement(s) to Track</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {bodyPartOptions.map(bodyPart => (
                          <div key={bodyPart.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`bp-${bodyPart.value}`}
                              checked={goalForm.selected_body_parts.includes(bodyPart.value)}
                              onChange={() => toggleBodyPart(bodyPart.value)}
                              className="w-4 h-4 rounded"
                            />
                            <Label htmlFor={`bp-${bodyPart.value}`} className={`${theme.text} cursor-pointer text-sm`}>
                              {bodyPart.label} ({bodyPart.unit})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs ${theme.textSecondary} mt-2`}>
                        Selected: {goalForm.selected_body_parts.length} measurement(s)
                      </p>
                    </div>
                  )}

                  {/* Nutrient Selection */}
                  {goalForm.metric_type === 'daily_nutrition' && (
                    <div>
                      <Label className={`${theme.text} mb-2 block`}>Select Nutrient(s) to Track</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {nutrientOptions.map(nutrient => (
                          <div key={nutrient.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`nut-${nutrient.value}`}
                              checked={goalForm.selected_nutrients.includes(nutrient.value)}
                              onChange={() => toggleNutrient(nutrient.value)}
                              className="w-4 h-4 rounded"
                            />
                            <Label htmlFor={`nut-${nutrient.value}`} className={`${theme.text} cursor-pointer text-sm`}>
                              {nutrient.label} ({nutrient.unit})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs ${theme.textSecondary} mt-2`}>
                        Selected: {goalForm.selected_nutrients.length} nutrient(s)
                      </p>
                    </div>
                  )}

                  {goalForm.auto_track && (
                    <div className={`p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800`}>
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className={`text-sm font-semibold ${theme.text} mb-1`}>Auto-Tracking Enabled</p>
                          <p className={`text-xs ${theme.textSecondary}`}>
                            Progress will update automatically from: <strong>{metricOptions.find(m => m.value === goalForm.metric_type)?.source}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="title" className={`${theme.text}`}>Goal Title</Label>
                    <Input
                      id="title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={metricOptions.find(m => m.value === goalForm.metric_type)?.label || "e.g., Lose 10kg"}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add personalized notes..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="current_value" className={`${theme.text}`}>Current Value</Label>
                      <Input
                        id="current_value"
                        type="number"
                        step="0.1"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_value" className={`${theme.text}`}>Target Value</Label>
                      <Input
                        id="target_value"
                        type="number"
                        step="0.1"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="target_date" className={`${theme.text}`}>Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Button 
                    onClick={createGoal} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                    disabled={!goalForm.client_id || !goalForm.title || !goalForm.target_date}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateGoal(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Goal Modal */}
            <Dialog open={showEditGoal} onOpenChange={setShowEditGoal}>
              <DialogContent className="rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[85vh] !w-[min(600px,95vw)] !m-0 !p-0 overflow-hidden" style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Edit Goal</DialogTitle>
                    <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                      Update goal details and track progress
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                  <div>
                    <Label htmlFor="edit-title" className={`${theme.text}`}>Goal Title</Label>
                    <Input
                      id="edit-title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="edit-description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-current_value" className={`${theme.text}`}>Current Value</Label>
                      <Input
                        id="edit-current_value"
                        type="number"
                        step="0.1"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                      {selectedGoal?.auto_track && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Auto-updates from app</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-target_value" className={`${theme.text}`}>Target Value</Label>
                      <Input
                        id="edit-target_value"
                        type="number"
                        step="0.1"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-status" className={`${theme.text}`}>Status</Label>
                      <Select value={goalForm.status} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-target_date" className={`${theme.text}`}>Target Date</Label>
                      <Input
                        id="edit-target_date"
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Button 
                    onClick={updateGoal} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditGoal(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
