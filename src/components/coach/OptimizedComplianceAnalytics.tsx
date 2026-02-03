'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  UserX,
  Edit,
  MoreVertical,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  CircleDot,
  CirclePause,
  CirclePlay,
  CircleStop,
  CircleHelp
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
  compliance_status: 'on_track' | 'at_risk' | 'needs_attention'
}

interface ComplianceData {
  overallCompliance: number
  workoutCompliance: number
  nutritionCompliance: number
  habitCompliance: number
  complianceTrend: 'up' | 'down' | 'stable'
  totalClients: number
  clientsOnTrack: number
  clientsAtRisk: number
  clientsNeedingAttention: number
  weeklyTrend: {
    week: string
    overall: number
    workouts: number
    nutrition: number
    habits: number
  }[]
  clientCompliance: {
    client: Client
    overallCompliance: number
    workoutCompliance: number
    nutritionCompliance: number
    habitCompliance: number
    lastActivity: string
    streakDays: number
    missedDays: number
  }[]
}

interface OptimizedComplianceAnalyticsProps {
  coachId?: string
}

export default function OptimizedComplianceAnalytics({ coachId }: OptimizedComplianceAnalyticsProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedClientGroup, setSelectedClientGroup] = useState<'all' | 'on_track' | 'at_risk' | 'needs_attention'>('all')
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Fetch real compliance data from Supabase
  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        setLoading(true)
        
        // Fetch actual compliance data from Supabase
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('coach_id', coachId)

        if (clientsError) throw clientsError

        const clientIds = (clients || []).map((c: any) => c.client_id)
        const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Completed workouts from workout_logs (not workout_sessions)
        const { data: workoutLogs } = await supabase
          .from('workout_logs')
          .select('client_id, completed_at')
          .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
          .not('completed_at', 'is', null)
          .gte('completed_at', periodStart)

        // Meal completions (meal_logs does not exist)
        const { data: nutritionRows } = await supabase
          .from('meal_completions')
          .select('client_id, completed_at')
          .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('completed_at', periodStart)

        // Habit logs
        const periodStartDate = periodStart.slice(0, 10)
        const { data: habitRows } = await supabase
          .from('habit_logs')
          .select('client_id, log_date')
          .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('log_date', periodStartDate)

        const totalClients = clients?.length || 0
        const workoutCompliance = totalClients > 0 && workoutLogs?.length
          ? Math.round((workoutLogs.length / (totalClients * 4)) * 100) // rough: 4 workouts per client per month
          : totalClients > 0
            ? 0
            : 0
        const nutritionUniqueDays = nutritionRows ? new Set(nutritionRows.map((n: any) => new Date(n.completed_at).toISOString().slice(0, 10))).size : 0
        const nutritionCompliance = totalClients > 0 ? Math.min(100, Math.round((nutritionUniqueDays / 30) * 100)) : 0
        const habitUniqueDays = habitRows ? new Set(habitRows.map((h: any) => h.log_date)).size : 0
        const habitCompliance = totalClients > 0 ? Math.min(100, Math.round((habitUniqueDays / 30) * 100)) : 0
        const overall = totalClients > 0 ? Math.round((workoutCompliance + nutritionCompliance + habitCompliance) / 3) : 0

        const weeklyTrend = buildWeeklyTrendFromData(workoutLogs || [], nutritionRows || [], habitRows || [], clientIds)
        const clientCompliance = await buildClientComplianceData(clients || [], workoutLogs || [], nutritionRows || [], habitRows || [])

        const realComplianceData: ComplianceData = {
          overallCompliance: overall,
          workoutCompliance,
          nutritionCompliance,
          habitCompliance,
          complianceTrend: 'up',
          totalClients,
          clientsOnTrack: clientCompliance.filter((c: any) => c.overallCompliance >= 70).length,
          clientsAtRisk: clientCompliance.filter((c: any) => c.overallCompliance < 50).length,
          clientsNeedingAttention: clientCompliance.filter((c: any) => c.overallCompliance >= 50 && c.overallCompliance < 70).length,
          weeklyTrend,
          clientCompliance
        }

        setComplianceData(realComplianceData)
      } catch (error) {
        console.error('Error fetching compliance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchComplianceData()
  }, [coachId, selectedPeriod])

  // Helper functions to calculate compliance metrics
  const calculateWorkoutCompliance = (workoutData: any[]) => {
    if (workoutData.length === 0) return 0
    const completed = workoutData.filter(w => w.completed_at).length
    return Math.round((completed / workoutData.length) * 100)
  }

  const calculateNutritionCompliance = (nutritionData: any[]) => {
    if (nutritionData.length === 0) return 0
    const uniqueDays = new Set(nutritionData.map(n => n.logged_date.split('T')[0])).size
    const totalDays = 30
    return Math.round((uniqueDays / totalDays) * 100)
  }

  function buildWeeklyTrendFromData(
    workoutLogs: any[],
    nutritionRows: any[],
    habitRows: any[],
    clientIds: string[]
  ) {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    const now = new Date()
    return weeks.map((week, i) => {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (4 - i) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const wCount = workoutLogs.filter((w: any) => {
        const d = new Date(w.completed_at)
        return d >= weekStart && d < weekEnd
      }).length
      const nCount = nutritionRows.filter((n: any) => {
        const d = new Date(n.completed_at)
        return d >= weekStart && d < weekEnd
      }).length
      const hCount = habitRows.filter((h: any) => {
        const d = new Date(h.log_date)
        return d >= weekStart && d < weekEnd
      }).length
      const expected = clientIds.length * 4
      const workout = expected > 0 ? Math.min(100, Math.round((wCount / expected) * 100)) : 0
      const nutrition = clientIds.length > 0 ? Math.min(100, Math.round((nCount / (clientIds.length * 7)) * 100)) : 0
      const habits = clientIds.length > 0 ? Math.min(100, Math.round((hCount / (clientIds.length * 7)) * 100)) : 0
      const overall = Math.round((workout + nutrition + habits) / 3)
      return { week, overall, workouts: workout, nutrition, habits }
    })
  }

  async function buildClientComplianceData(
    clients: any[],
    workoutLogs: any[],
    nutritionRows: any[],
    habitRows: any[]
  ) {
    const clientIds = clients.map((c: any) => c.client_id)
    const { data: profilesList } = clientIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, email').in('id', clientIds)
      : { data: [] }
    const profileMap = new Map((profilesList || []).map((p: any) => [p.id, p]))
    return clients.map((client: any) => {
      const cid = client.client_id
      const wCount = workoutLogs.filter((w: any) => w.client_id === cid).length
      const nDays = new Set(nutritionRows.filter((n: any) => n.client_id === cid).map((n: any) => new Date(n.completed_at).toISOString().slice(0, 10))).size
      const hDays = new Set(habitRows.filter((h: any) => h.client_id === cid).map((h: any) => h.log_date)).size
      const workoutCompliance = Math.min(100, Math.round((wCount / 4) * 100))
      const nutritionCompliance = Math.min(100, Math.round((nDays / 30) * 100))
      const habitCompliance = Math.min(100, Math.round((hDays / 30) * 100))
      const overallCompliance = Math.round((workoutCompliance + nutritionCompliance + habitCompliance) / 3)
      const lastWorkout = workoutLogs.filter((w: any) => w.client_id === cid).sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
      const profile = profileMap.get(cid)
      return {
        client: {
          id: client.id,
          first_name: profile?.first_name ?? 'Unknown',
          last_name: profile?.last_name ?? '',
          email: profile?.email ?? 'no-email@example.com',
          join_date: client.created_at?.split('T')[0] || '2024-01-01',
          program: 'General Fitness',
          goals: ['Stay healthy'],
          compliance_status: (overallCompliance >= 70 ? 'on_track' : overallCompliance >= 50 ? 'needs_attention' : 'at_risk') as 'on_track' | 'needs_attention' | 'at_risk'
        },
        overallCompliance,
        workoutCompliance,
        nutritionCompliance,
        habitCompliance,
        lastActivity: lastWorkout?.completed_at || new Date(0).toISOString(),
        streakDays: 0,
        missedDays: 0
      }
    })
  }

  const [complianceData, setComplianceData] = useState<ComplianceData>({
    overallCompliance: 0,
    workoutCompliance: 0,
    nutritionCompliance: 0,
    habitCompliance: 0,
    complianceTrend: 'up',
    totalClients: 0,
    clientsOnTrack: 0,
    clientsAtRisk: 0,
    clientsNeedingAttention: 0,
    weeklyTrend: [
      { week: 'Week 1', overall: 0, workouts: 0, nutrition: 0, habits: 0 },
      { week: 'Week 2', overall: 0, workouts: 0, nutrition: 0, habits: 0 },
      { week: 'Week 3', overall: 0, workouts: 0, nutrition: 0, habits: 0 },
      { week: 'Week 4', overall: 0, workouts: 0, nutrition: 0, habits: 0 }
    ],
    clientCompliance: []
  })

  // Loading is controlled by fetchComplianceData only

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 fc-text-success" />
      case 'down': return <TrendingDown className="w-4 h-4 fc-text-error" />
      default: return <Activity className="w-4 h-4 fc-text-subtle" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'fc-text-success'
      case 'down': return 'fc-text-error'
      default: return 'fc-text-subtle'
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'fc-text-success'
      case 'at_risk': return 'fc-text-warning'
      case 'needs_attention': return 'fc-text-error'
      default: return 'fc-text-subtle'
    }
  }

  const getComplianceStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CircleCheck className="w-4 h-4" />
      case 'at_risk': return <CircleAlert className="w-4 h-4" />
      case 'needs_attention': return <CircleX className="w-4 h-4" />
      default: return <CircleHelp className="w-4 h-4" />
    }
  }

  const getComplianceStatusLabel = (status: string) => {
    switch (status) {
      case 'on_track': return 'On Track'
      case 'at_risk': return 'At Risk'
      case 'needs_attention': return 'Needs Attention'
      default: return 'Unknown'
    }
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'fc-text-success'
    if (percentage >= 60) return 'fc-text-warning'
    return 'fc-text-error'
  }

  const getComplianceBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-[color:var(--fc-status-success)]'
    if (percentage >= 60) return 'bg-[color:var(--fc-status-warning)]'
    return 'bg-[color:var(--fc-status-error)]'
  }

  const filteredClients = complianceData.clientCompliance.filter(client => {
    if (selectedClientGroup === 'all') return true
    return client.client.compliance_status === selectedClientGroup
  })

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
      <div className="min-h-screen fc-app-bg">
        <div className="animate-pulse">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)]">
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
    <div className="min-h-screen fc-app-bg w-full">
      <div className="p-4 sm:p-6 fc-app-bg relative overflow-hidden w-full">
        <div className="w-full relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach/analytics')}
                className="fc-btn fc-btn-ghost h-10 w-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts">
                  Compliance
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold fc-text-primary mt-2 mb-1 sm:mb-2">
                  Compliance Analytics 📊
                </h1>
                <p className="text-base sm:text-lg fc-text-dim">
                  Monitor client adherence to workouts, nutrition, and habits
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setLoading(true)}
                className="fc-btn fc-btn-ghost flex items-center gap-2"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="outline"
                className="fc-btn fc-btn-ghost flex items-center gap-2"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] mb-6 sm:mb-8">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 fc-text-subtle" />
                  <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d' | '1y') => setSelectedPeriod(value)}>
                    <SelectTrigger className="fc-select w-full sm:w-48 h-10 sm:h-12">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 fc-text-subtle" />
                  <Select value={selectedClientGroup} onValueChange={(value: 'all' | 'on_track' | 'at_risk' | 'needs_attention') => setSelectedClientGroup(value)}>
                    <SelectTrigger className="fc-select w-full sm:w-48 h-10 sm:h-12">
                      <SelectValue placeholder="Client Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm fc-text-dim">View:</span>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Overall Compliance Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {/* Overall Compliance */}
            <div className="fc-glass fc-card fc-accent-workouts rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300">
              <div className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Target className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold fc-text-primary">{complianceData.overallCompliance}%</p>
                    <p className="text-xs sm:text-sm fc-text-dim truncate">Overall Compliance</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(complianceData.complianceTrend)}
                      <span className={`text-xs ${getTrendColor(complianceData.complianceTrend)}`}>
                        {complianceData.complianceTrend === 'up' ? '+' : complianceData.complianceTrend === 'down' ? '-' : ''}2.3%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workout Compliance */}
            <div className="fc-glass fc-card fc-accent-workouts rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300">
              <div className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold fc-text-primary">{complianceData.workoutCompliance}%</p>
                    <p className="text-xs sm:text-sm fc-text-dim truncate">Workout Compliance</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs fc-text-dim">
                        {complianceData.clientsOnTrack} clients on track
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition Compliance */}
            <div className="fc-glass fc-card fc-accent-meals rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300">
              <div className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="fc-icon-tile fc-icon-meals">
                    <Apple className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold fc-text-primary">{complianceData.nutritionCompliance}%</p>
                    <p className="text-xs sm:text-sm fc-text-dim truncate">Nutrition Compliance</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs fc-text-dim">
                        {complianceData.clientsAtRisk} at risk
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Habit Compliance */}
            <div className="fc-glass fc-card fc-accent-habits rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300">
              <div className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="fc-icon-tile fc-icon-habits">
                    <Heart className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold fc-text-primary">{complianceData.habitCompliance}%</p>
                    <p className="text-xs sm:text-sm fc-text-dim truncate">Habit Compliance</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs fc-text-dim">
                        {complianceData.clientsNeedingAttention} need attention
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Trend Chart */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 fc-text-primary font-semibold">
                  <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                    <LineChart className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
                  </div>
                  Compliance Trends
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleChartExpansion('trends')}
                  className="fc-btn fc-btn-ghost"
                >
                  {expandedCharts.has('trends') ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {complianceData.weeklyTrend.map((week, index) => (
                  <div key={index} className="fc-glass-soft rounded-xl p-4 border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium fc-text-primary">{week.week}</span>
                      <span className="text-lg font-bold fc-text-primary">{week.overall}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 text-[color:var(--fc-domain-workouts)]" />
                            <span className="text-xs fc-text-dim">Workouts</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{week.workouts}%</span>
                        </div>
                        <div className="w-full fc-progress-track">
                          <div 
                            className={`h-2 rounded-full ${getComplianceBarColor(week.workouts)}`}
                            style={{ width: `${week.workouts}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Apple className="w-3 h-3 text-[color:var(--fc-domain-meals)]" />
                            <span className="text-xs fc-text-dim">Nutrition</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{week.nutrition}%</span>
                        </div>
                        <div className="w-full fc-progress-track">
                          <div 
                            className={`h-2 rounded-full ${getComplianceBarColor(week.nutrition)}`}
                            style={{ width: `${week.nutrition}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-[color:var(--fc-domain-habits)]" />
                            <span className="text-xs fc-text-dim">Habits</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{week.habits}%</span>
                        </div>
                        <div className="w-full fc-progress-track">
                          <div 
                            className={`h-2 rounded-full ${getComplianceBarColor(week.habits)}`}
                            style={{ width: `${week.habits}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Compliance Breakdown */}
          <div className="w-full space-y-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 fc-text-primary font-semibold">
                <div className="p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                  <Users className="w-5 h-5 text-[color:var(--fc-domain-workouts)]" />
                </div>
                Client Compliance Breakdown
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredClients.map(client => (
                    <div key={client.client.id} className="rounded-lg p-4 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="fc-icon-tile fc-icon-workouts w-10 h-10 text-sm font-semibold">
                          {client.client.first_name[0]}{client.client.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold fc-text-primary truncate">
                            {client.client.first_name} {client.client.last_name}
                          </h4>
                          <p className="text-xs fc-text-dim truncate">
                            {client.client.program}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm fc-text-dim">Overall</span>
                          <span className={`text-sm font-bold ${getComplianceColor(client.overallCompliance)}`}>
                            {client.overallCompliance}%
                          </span>
                        </div>
                        <div className="w-full fc-progress-track">
                          <div 
                            className={`h-2 rounded-full ${getComplianceBarColor(client.overallCompliance)}`}
                            style={{ width: `${client.overallCompliance}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 text-[color:var(--fc-domain-workouts)]" />
                            <span className="text-xs fc-text-dim">Workouts</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{client.workoutCompliance}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Apple className="w-3 h-3 text-[color:var(--fc-domain-meals)]" />
                            <span className="text-xs fc-text-dim">Nutrition</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{client.nutritionCompliance}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-[color:var(--fc-domain-habits)]" />
                            <span className="text-xs fc-text-dim">Habits</span>
                          </div>
                          <span className="text-xs font-medium fc-text-primary">{client.habitCompliance}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className={`fc-pill fc-pill-glass text-xs ${getComplianceStatusColor(client.client.compliance_status)}`}>
                          {getComplianceStatusIcon(client.client.compliance_status)}
                          <span className="ml-1">{getComplianceStatusLabel(client.client.compliance_status)}</span>
                        </span>
                        <div className="text-right">
                          <p className="text-xs fc-text-dim">
                            {client.streakDays} day streak
                          </p>
                          <p className="text-xs fc-text-dim">
                            {client.missedDays} missed
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost flex-1 text-xs">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost text-xs">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map(client => (
                    <div key={client.client.id} className="rounded-lg p-4 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="fc-icon-tile fc-icon-workouts w-12 h-12 text-sm font-semibold flex-shrink-0">
                          {client.client.first_name[0]}{client.client.last_name[0]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold fc-text-primary mb-1">
                                {client.client.first_name} {client.client.last_name}
                              </h4>
                              <p className="text-sm fc-text-dim mb-2">
                                {client.client.program}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`fc-pill fc-pill-glass text-xs ${getComplianceStatusColor(client.client.compliance_status)}`}>
                                  {getComplianceStatusIcon(client.client.compliance_status)}
                                  <span className="ml-1">{getComplianceStatusLabel(client.client.compliance_status)}</span>
                                </span>
                                <span className="text-xs fc-text-dim">
                                  {client.streakDays} day streak
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-lg font-bold ${getComplianceColor(client.overallCompliance)}`}>
                                {client.overallCompliance}%
                              </span>
                              <p className="text-xs fc-text-dim">Overall</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  <Dumbbell className="w-3 h-3 fc-text-workouts" />
                                  <span className="text-xs fc-text-dim">Workouts</span>
                                </div>
                                <span className="text-xs font-medium fc-text-primary">{client.workoutCompliance}%</span>
                              </div>
                              <div className="w-full fc-progress-track h-1">
                                <div 
                                  className={`h-1 rounded-full ${getComplianceBarColor(client.workoutCompliance)}`}
                                  style={{ width: `${client.workoutCompliance}%` }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  <Apple className="w-3 h-3 fc-text-meals" />
                                  <span className="text-xs fc-text-dim">Nutrition</span>
                                </div>
                                <span className="text-xs font-medium fc-text-primary">{client.nutritionCompliance}%</span>
                              </div>
                              <div className="w-full fc-progress-track h-1">
                                <div 
                                  className={`h-1 rounded-full ${getComplianceBarColor(client.nutritionCompliance)}`}
                                  style={{ width: `${client.nutritionCompliance}%` }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 fc-text-habits" />
                                  <span className="text-xs fc-text-dim">Habits</span>
                                </div>
                                <span className="text-xs font-medium fc-text-primary">{client.habitCompliance}%</span>
                              </div>
                              <div className="w-full fc-progress-track h-1">
                                <div 
                                  className={`h-1 rounded-full ${getComplianceBarColor(client.habitCompliance)}`}
                                  style={{ width: `${client.habitCompliance}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-ghost">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
