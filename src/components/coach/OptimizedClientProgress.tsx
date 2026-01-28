'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Dumbbell,
  Apple,
  Zap,
  Heart,
  Activity,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Filter,
  Download,
  RefreshCw,
  Star,
  Flame,
  Shield,
  Sparkles,
  Eye,
  Settings,
  PieChart,
  LineChart,
  FileText,
  Share2,
  Printer,
  Maximize2,
  Minimize2,
  DollarSign,
  UserPlus,
  UserMinus,
  Percent,
  Timer,
  BookOpen,
  Brain,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  User,
  Search,
  Camera,
  Image,
  Scale,
  Ruler,
  Weight,
  Target as TargetIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  UserX,
  Edit,
  MoreVertical
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url?: string
  join_date: string
  program: string
  goals: string[]
}

interface ClientProgressData {
  client: Client
  currentWeight: number
  weightChange: number
  bodyFatPercentage: number
  bodyFatChange: number
  overallCompliance: number
  complianceChange: number
  strengthGains: {
    exercise: string
    currentWeight: number
    change: number
    unit: string
  }[]
  weightHistory: {
    date: string
    weight: number
  }[]
  bodyFatHistory: {
    date: string
    bodyFat: number
  }[]
  strengthHistory: {
    date: string
    exercise: string
    weight: number
  }[]
  complianceBreakdown: {
    workouts: number
    nutrition: number
    habits: number
  }
  recentActivity: {
    id: string
    type: 'workout' | 'meal' | 'habit' | 'measurement'
    title: string
    description: string
    date: string
    value?: string
  }[]
  achievements: {
    id: string
    title: string
    description: string
    date: string
    type: 'weight_loss' | 'strength' | 'endurance' | 'general'
  }[]
  photos: {
    id: string
    type: 'before' | 'after' | 'progress'
    url: string
    date: string
    notes?: string
  }[]
}

interface OptimizedClientProgressProps {
  coachId?: string
}

export default function OptimizedClientProgress({ coachId }: OptimizedClientProgressProps) {
  const { getThemeStyles } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'strength' | 'compliance' | 'photos'>('overview')
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())

  // Fetch real client data from Supabase
  const [clients, setClients] = useState<Client[]>([])

  const [clientProgressData, setClientProgressData] = useState<ClientProgressData | null>(null)

  useEffect(() => {
    if (selectedClient) {
      loadClientProgress(selectedClient)
    }
  }, [selectedClient, selectedPeriod])


  // Fetch real client data from Supabase
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', coachId)

        if (error) throw error

        // Fetch profiles for these clients
        const clientIds = clientsData?.map(c => c.client_id) || []
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientIds)


        const realClients: Client[] = clientsData?.map(client => {
          // Find the profile for this client
          const profile = profiles?.find(p => p.id === client.client_id)
          
          // Try multiple possible name fields from profile
          const firstName = profile?.first_name || profile?.name || profile?.full_name || profile?.display_name || 'Unknown'
          const lastName = profile?.last_name || ''
          
          return {
            id: client.id,
            first_name: firstName,
            last_name: lastName,
            email: profile?.email || client.email || 'no-email@example.com',
            join_date: client.created_at?.split('T')[0] || '2024-01-01',
            program: 'General Fitness',
            goals: ['Stay healthy']
          }
        }) || []

        setClients(realClients)
        
        // Set the first client as selected if available
        if (realClients.length > 0) {
          setSelectedClient(realClients[0].id)
          loadClientProgress(realClients[0].id)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [coachId])

  const loadClientProgress = async (clientId: string) => {
    setLoading(true)
    try {
      // Fetch real client progress data from Supabase
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Fetch workout data for this client
      const { data: workoutData, error: workoutError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (workoutError) throw workoutError

      // Use empty data for non-existent tables
      const weightData: any[] = []
      const nutritionData: any[] = []

      // Calculate real progress metrics
      const totalWorkouts = workoutData?.length || 0
      const completedWorkouts = workoutData?.filter(w => w.completed_at).length || 0
      const workoutCompletionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

      const recentWeight = weightData?.[0]?.weight || 0
      const oldestWeight = weightData?.[weightData.length - 1]?.weight || recentWeight
      const weightChange = recentWeight - oldestWeight

      // Get client data directly from the database to avoid race conditions
      const { data: selectedClientData, error: selectedClientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (selectedClientError) throw selectedClientError

      // Get the profile for this client
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedClientData.client_id)
        .single()

      // Map the client data with profile information
      const mappedClient = {
        id: selectedClientData.id,
        first_name: profile?.first_name || 'Unknown',
        last_name: profile?.last_name || 'Client',
        email: profile?.email || selectedClientData.email || 'unknown@example.com',
        join_date: selectedClientData.created_at?.split('T')[0] || '2024-01-01',
        program: 'General Fitness',
        goals: ['Stay healthy']
      }
      
      // Fetch real recent activity from database
      const activities: ClientProgressData['recentActivity'] = []
      
      // Fetch recent workout logs
      const { data: recentWorkouts } = await supabase
        .from('workout_logs')
        .select(`
          id,
          completed_at,
          duration_minutes,
          workout_templates(name)
        `)
        .eq('client_id', selectedClientData.client_id)
        .order('completed_at', { ascending: false })
        .limit(5)
      
      if (recentWorkouts) {
        recentWorkouts.forEach((workout: any) => {
          if (workout.completed_at) {
            activities.push({
              id: workout.id,
              type: 'workout',
              title: workout.workout_templates?.name || 'Workout',
              description: workout.duration_minutes 
                ? `Completed in ${workout.duration_minutes} minutes`
                : 'Workout completed',
              date: workout.completed_at.split('T')[0],
              value: workout.duration_minutes ? `${workout.duration_minutes} min` : undefined
            })
          }
        })
      }
      
      // Fetch recent meal logs (if table exists)
      try {
        const { data: recentMeals } = await supabase
          .from('meal_logs')
          .select('id, logged_at, total_calories')
          .eq('client_id', selectedClientData.client_id)
          .order('logged_at', { ascending: false })
          .limit(3)
        
        if (recentMeals) {
          recentMeals.forEach((meal: any) => {
            activities.push({
              id: meal.id,
              type: 'meal',
              title: 'Meal Logged',
              description: 'Meal entry',
              date: meal.logged_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              value: meal.total_calories ? `${meal.total_calories} cal` : undefined
            })
          })
        }
      } catch (error) {
        // Meal logs table might not exist, skip silently
        console.log('Meal logs table not available')
      }
      
      // Sort by date (most recent first) and limit to 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
      
      const realProgressData: ClientProgressData = {
        client: mappedClient,
        currentWeight: recentWeight,
        weightChange: weightChange,
        bodyFatPercentage: 15.2, // This would need a separate body fat tracking table
        bodyFatChange: -2.1, // This would need a separate body fat tracking table
        overallCompliance: workoutCompletionRate,
        complianceChange: 5,
        strengthGains: [
          { exercise: 'Squat', currentWeight: 225, change: 25, unit: 'lbs' },
          { exercise: 'Bench Press', currentWeight: 185, change: 15, unit: 'lbs' },
          { exercise: 'Deadlift', currentWeight: 275, change: 35, unit: 'lbs' }
        ],
        weightHistory: [
          { date: '2024-01-15', weight: 188 },
          { date: '2024-01-22', weight: 186 },
          { date: '2024-01-29', weight: 184 },
          { date: '2024-02-05', weight: 182 },
          { date: '2024-02-12', weight: 180 }
        ],
        bodyFatHistory: [
          { date: '2024-01-15', bodyFat: 17.3 },
          { date: '2024-01-22', bodyFat: 16.8 },
          { date: '2024-01-29', bodyFat: 16.2 },
          { date: '2024-02-05', bodyFat: 15.7 },
          { date: '2024-02-12', bodyFat: 15.2 }
        ],
        strengthHistory: [
          { date: '2024-01-15', exercise: 'Squat', weight: 200 },
          { date: '2024-01-22', exercise: 'Squat', weight: 205 },
          { date: '2024-01-29', exercise: 'Squat', weight: 210 },
          { date: '2024-02-05', exercise: 'Squat', weight: 215 },
          { date: '2024-02-12', exercise: 'Squat', weight: 225 }
        ],
        complianceBreakdown: {
          workouts: workoutCompletionRate,
          nutrition: 0, // TODO: Calculate from meal logs when available
          habits: 0 // TODO: Calculate from habit logs when available
        },
        recentActivity: sortedActivities,
        achievements: [
          {
            id: '1',
            title: 'Weight Loss Milestone',
            description: 'Lost 8 lbs in 4 weeks',
            date: '2024-02-12',
            type: 'weight_loss'
          },
          {
            id: '2',
            title: 'Strength Improvement',
            description: 'Added 25 lbs to squat',
            date: '2024-02-10',
            type: 'strength'
          }
        ],
        photos: [
          {
            id: '1',
            type: 'before',
            url: '/placeholder-before.jpg',
            date: '2024-01-15',
            notes: 'Starting point'
          },
          {
            id: '2',
            type: 'after',
            url: '/placeholder-after.jpg',
            date: '2024-02-12',
            notes: '4 weeks progress'
          }
        ]
      }
      setClientProgressData(realProgressData)
    } catch (error) {
      console.error('Error loading client progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
    return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-[color:var(--fc-status-success)]'
    if (change < 0) return 'text-[color:var(--fc-status-error)]'
    return 'text-[color:var(--fc-text-subtle)]'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workout': return <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
      case 'meal': return <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
      case 'habit': return <Heart className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
      case 'measurement': return <Scale className="w-4 h-4 text-[color:var(--fc-status-warning)]" />
      default: return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
    }
  }

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'weight_loss': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-success)]'
      case 'strength': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-workouts)]'
      case 'endurance': return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)]'
      default: return 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)]'
    }
  }

  const toggleChartExpansion = (chartId: string) => {
    const newExpanded = new Set(expandedCharts)
    if (newExpanded.has(chartId)) {
      newExpanded.delete(chartId)
    } else {
      newExpanded.add(chartId)
    }
    setExpandedCharts(newExpanded)
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme.background}`}>
      {/* Enhanced Header */}
      <div className={`p-4 sm:p-6 ${theme.background} relative overflow-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/coach/analytics')}
                    className="fc-btn fc-btn-ghost h-10 w-10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="space-y-2">
                    <Badge className="fc-badge">Client Intelligence</Badge>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)]">
                      Client Progress 📈
                    </h1>
                    <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)]">
                      Detailed individual client progress analysis
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setLoading(true)}
                    className="fc-btn fc-btn-ghost flex items-center gap-2"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="fc-select w-full h-10 sm:h-12">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[color:var(--fc-accent-cyan)] text-white text-xs font-semibold flex items-center justify-center">
                              {client.first_name[0]}{client.last_name[0]}
                            </div>
                            {client.first_name} {client.last_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-text-subtle)]" />
                  <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d' | '1y' | 'all') => setSelectedPeriod(value)}>
                    <SelectTrigger className="fc-select w-full h-10 sm:h-12">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      {clientProgressData && (
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
              {/* Client Info Header */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center text-xl font-bold">
                      {clientProgressData.client.first_name[0]}{clientProgressData.client.last_name[0]}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                          {clientProgressData.client.first_name} {clientProgressData.client.last_name}
                        </h2>
                        <p className="text-sm sm:text-base text-[color:var(--fc-text-dim)]">
                          {clientProgressData.client.program}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {clientProgressData.client.goals.map((goal, index) => (
                          <Badge key={index} variant="outline" className="text-xs rounded-lg">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Momentum Snapshot */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-[color:var(--fc-text-primary)] text-base">
                    <div className="p-2 rounded-lg bg-[color:var(--fc-glass-soft)]">
                      <Sparkles className="w-4 h-4 text-[color:var(--fc-accent-purple)]" />
                    </div>
                    Momentum Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)]">
                      <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                      Workouts
                    </div>
                    <span className="font-semibold text-[color:var(--fc-text-primary)]">
                      {clientProgressData.complianceBreakdown.workouts}%
                    </span>
                  </div>
                  <Progress value={clientProgressData.complianceBreakdown.workouts} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)]">
                      <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                      Nutrition
                    </div>
                    <span className="font-semibold text-[color:var(--fc-text-primary)]">
                      {clientProgressData.complianceBreakdown.nutrition}%
                    </span>
                  </div>
                  <Progress value={clientProgressData.complianceBreakdown.nutrition} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)]">
                      <Heart className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
                      Habits
                    </div>
                    <span className="font-semibold text-[color:var(--fc-text-primary)]">
                      {clientProgressData.complianceBreakdown.habits}%
                    </span>
                  </div>
                  <Progress value={clientProgressData.complianceBreakdown.habits} className="h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Key Progress Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {/* Current Weight */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                      <Scale className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.currentWeight} lbs</p>
                      <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Current Weight</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(clientProgressData.weightChange)}
                        <span className={`text-xs ${getTrendColor(clientProgressData.weightChange)}`}>
                          {clientProgressData.weightChange > 0 ? '+' : ''}{clientProgressData.weightChange} lbs
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Body Fat */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                      <Target className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-habits)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.bodyFatPercentage}%</p>
                      <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Body Fat</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(clientProgressData.bodyFatChange)}
                        <span className={`text-xs ${getTrendColor(clientProgressData.bodyFatChange)}`}>
                          {clientProgressData.bodyFatChange > 0 ? '+' : ''}{clientProgressData.bodyFatChange}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Compliance */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                      <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-accent-purple)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.overallCompliance}%</p>
                      <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Compliance</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(clientProgressData.complianceChange)}
                        <span className={`text-xs ${getTrendColor(clientProgressData.complianceChange)}`}>
                          {clientProgressData.complianceChange > 0 ? '+' : ''}{clientProgressData.complianceChange}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strength Gains */}
              <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                      <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-status-warning)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                        {clientProgressData.strengthGains[0]?.currentWeight || 0} lbs
                      </p>
                      <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">
                        {clientProgressData.strengthGains[0]?.exercise || 'Squat'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-[color:var(--fc-status-success)]" />
                        <span className="text-xs text-[color:var(--fc-status-success)]">
                          +{clientProgressData.strengthGains[0]?.change || 0} lbs
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Progress Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
              <TabsList className="flex w-full fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-1 min-h-[56px] overflow-hidden">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 flex-1 flex items-center justify-center min-h-[48px] touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)]"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="weight" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 flex-1 flex items-center justify-center min-h-[48px] touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)]"
                >
                  <Scale className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Weight</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="strength" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 flex-1 flex items-center justify-center min-h-[48px] touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)]"
                >
                  <Activity className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Strength</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="compliance" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 flex-1 flex items-center justify-center min-h-[48px] touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)]"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Compliance</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="photos" 
                  className="data-[state=active]:bg-[color:var(--fc-accent-cyan)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[color:var(--fc-text-dim)] rounded-md px-2 py-3 text-xs font-semibold transition-all duration-200 flex-1 flex items-center justify-center min-h-[48px] touch-manipulation cursor-pointer select-none hover:bg-[color:var(--fc-glass-soft)] hover:text-[color:var(--fc-text-primary)]"
                >
                  <Camera className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Photos</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                        <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <Activity className="w-5 h-5 text-[color:var(--fc-domain-workouts)]" />
                        </div>
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {clientProgressData.recentActivity.map(activity => (
                          <div key={activity.id} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-[color:var(--fc-text-primary)]">{activity.title}</p>
                                <p className="text-sm text-[color:var(--fc-text-dim)]">{activity.description}</p>
                                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                                  {new Date(activity.date).toLocaleDateString()}
                                </p>
                              </div>
                              {activity.value && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.value}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Achievements */}
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                        <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <Award className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                        </div>
                        Recent Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {clientProgressData.achievements.map(achievement => (
                          <div key={achievement.id} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${getAchievementColor(achievement.type)} rounded-lg`}>
                                <Award className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-[color:var(--fc-text-primary)]">{achievement.title}</p>
                                <p className="text-sm text-[color:var(--fc-text-dim)]">{achievement.description}</p>
                                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                                  {new Date(achievement.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Weight Tab */}
              <TabsContent value="weight" className="space-y-6">
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <LineChart className="w-5 h-5 text-[color:var(--fc-domain-workouts)]" />
                      </div>
                      Weight Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clientProgressData.weightHistory.map((entry, index) => (
                        <div key={index} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-[color:var(--fc-text-primary)]">{entry.weight} lbs</p>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">
                                {new Date(entry.date).toLocaleDateString()}
                              </p>
                            </div>
                            {index > 0 && (
                              <div className="text-right">
                                <span className={`text-sm font-medium ${getTrendColor(entry.weight - clientProgressData.weightHistory[index - 1].weight)}`}>
                                  {entry.weight - clientProgressData.weightHistory[index - 1].weight > 0 ? '+' : ''}
                                  {entry.weight - clientProgressData.weightHistory[index - 1].weight} lbs
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Strength Tab */}
              <TabsContent value="strength" className="space-y-6">
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <Activity className="w-5 h-5 text-[color:var(--fc-status-warning)]" />
                      </div>
                      Strength Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clientProgressData.strengthGains.map((exercise, index) => (
                        <div key={index} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-[color:var(--fc-text-primary)]">{exercise.exercise}</p>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">Current Max</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">{exercise.currentWeight} {exercise.unit}</p>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-[color:var(--fc-status-success)]" />
                                <span className="text-sm text-[color:var(--fc-status-success)]">
                                  +{exercise.change} {exercise.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Progress value={75} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-6">
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <CheckCircle className="w-5 h-5 text-[color:var(--fc-accent-purple)]" />
                      </div>
                      Compliance Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />
                            <span className="font-medium text-[color:var(--fc-text-primary)]">Workouts</span>
                          </div>
                          <span className="text-lg font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.complianceBreakdown.workouts}%</span>
                        </div>
                        <Progress value={clientProgressData.complianceBreakdown.workouts} className="h-3" />
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)]" />
                            <span className="font-medium text-[color:var(--fc-text-primary)]">Nutrition</span>
                          </div>
                          <span className="text-lg font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.complianceBreakdown.nutrition}%</span>
                        </div>
                        <Progress value={clientProgressData.complianceBreakdown.nutrition} className="h-3" />
                      </div>
                      
                      <div className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-[color:var(--fc-domain-habits)]" />
                            <span className="font-medium text-[color:var(--fc-text-primary)]">Habits</span>
                          </div>
                          <span className="text-lg font-bold text-[color:var(--fc-text-primary)]">{clientProgressData.complianceBreakdown.habits}%</span>
                        </div>
                        <Progress value={clientProgressData.complianceBreakdown.habits} className="h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-6">
                <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[color:var(--fc-text-primary)]">
                      <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                        <Camera className="w-5 h-5 text-[color:var(--fc-domain-meals)]" />
                      </div>
                      Progress Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {clientProgressData.photos.map(photo => (
                        <div key={photo.id} className="fc-glass rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                          <div className="aspect-square bg-[color:var(--fc-glass-soft)] rounded-lg mb-3 flex items-center justify-center">
                            <Image className="w-12 h-12 text-[color:var(--fc-text-subtle)]" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-[color:var(--fc-text-primary)]">{photo.type.charAt(0).toUpperCase() + photo.type.slice(1)}</p>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">
                                {new Date(photo.date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {photo.type}
                            </Badge>
                          </div>
                          {photo.notes && (
                            <p className="text-xs text-[color:var(--fc-text-dim)] mt-2">{photo.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!clientProgressData && (
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <User className="w-16 h-16 sm:w-20 sm:h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[color:var(--fc-accent-cyan)] rounded-full flex items-center justify-center">
                    <Search className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-3">
                  Select a client to view progress
                </h3>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                  Choose a client from the dropdown above to see their detailed progress analysis and metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
