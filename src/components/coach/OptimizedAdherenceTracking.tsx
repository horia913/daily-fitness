'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
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
  UserPlus,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import AdherenceTrendChart, { type TrendData } from '@/components/coach/AdherenceTrendChart'

interface AdherenceData {
  clientId: string
  clientName: string
  avatar: string
  overallAdherence: number
  workoutAdherence: number
  nutritionAdherence: number
  habitAdherence: number
  sessionAttendance: number
  trend: 'up' | 'down' | 'stable'
  lastActive: string
  alerts: number
  streak: number
  weeklyData: {
    date: string
    workout: boolean
    nutrition: boolean
    habit: boolean
    session: boolean
  }[]
  status: 'on_track' | 'at_risk' | 'needs_attention'
}

interface OptimizedAdherenceTrackingProps {
  coachId?: string
}

export default function OptimizedAdherenceTracking({ coachId }: OptimizedAdherenceTrackingProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'workout' | 'nutrition' | 'habit'>('overall')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

  const [adherenceData, setAdherenceData] = useState<AdherenceData[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const didLoadRef = useRef(false)

  function computeAdherenceFromPayload(
    clients: { client_id: string }[],
    profiles: { id: string; first_name?: string; last_name?: string; avatar_url?: string }[],
    assignments: { id: string; client_id: string; scheduled_date?: string; status?: string }[],
    logs: { client_id: string; workout_assignment_id?: string; completed_at?: string }[],
    wellness: { client_id: string; log_date: string }[],
    todayStr: string,
    _sevenDaysAgoStr: string
  ): AdherenceData[] {
    const clientIds = clients.map((c) => c.client_id)
    const profilesMap = new Map(profiles.map((p) => [p.id, p]))
    const now = new Date()

    const adherenceResults: AdherenceData[] = clientIds.map((clientId) => {
      const profile = profilesMap.get(clientId)
      const firstName = profile?.first_name || ''
      const lastName = profile?.last_name || ''
      const clientName = `${firstName} ${lastName}`.trim() || 'Client'
      const avatar = profile?.avatar_url || `${(firstName || '')[0]}${(lastName || '')[0]}`.toUpperCase() || 'C'

      const clientAssignments = assignments.filter((a) => a.client_id === clientId)
      const workoutsScheduled = clientAssignments.length
      const completedWorkoutIds = new Set(
        logs.filter((l) => l.client_id === clientId && l.workout_assignment_id).map((l) => l.workout_assignment_id!)
      )
      const workoutsCompleted = clientAssignments.filter((a) => completedWorkoutIds.has(a.id)).length
      const workoutAdherence = workoutsScheduled > 0 ? Math.round((workoutsCompleted / workoutsScheduled) * 100) : 100

      const checkinDates = new Set(wellness.filter((w) => w.client_id === clientId).map((w) => w.log_date))
      const checkinsCompleted = checkinDates.size
      const checkinAdherence = Math.round((checkinsCompleted / 7) * 100)

      const overallAdherence = Math.round((workoutAdherence + checkinAdherence) / 2)
      const status: 'on_track' | 'at_risk' | 'needs_attention' =
        overallAdherence >= 75 ? 'on_track' : overallAdherence >= 50 ? 'at_risk' : 'needs_attention'

      const lastWorkout = logs
        .filter((l) => l.client_id === clientId && l.completed_at)
        .map((l) => (typeof l.completed_at === 'string' && l.completed_at.startsWith('2') ? l.completed_at.split('T')[0] : new Date(l.completed_at!).toISOString().split('T')[0]))
        .sort()
        .pop()
      const lastCheckin = Array.from(checkinDates).sort().pop()
      const lastActive = lastWorkout && lastCheckin ? (lastWorkout > lastCheckin ? lastWorkout : lastCheckin) : lastWorkout || lastCheckin || todayStr

      const allActivityDates = new Set([
        ...logs.filter((l) => l.client_id === clientId && l.completed_at).map((l) => (typeof l.completed_at === 'string' && l.completed_at.startsWith('2') ? l.completed_at.split('T')[0] : new Date(l.completed_at!).toISOString().split('T')[0])),
        ...checkinDates,
      ])
      const sortedDates = Array.from(allActivityDates).sort().reverse()
      let streak = 0
      let currentDate = new Date(now)
      currentDate.setHours(0, 0, 0, 0)
      for (let i = 0; i < sortedDates.length; i++) {
        const checkDate = new Date(sortedDates[i] + 'T12:00:00')
        const diffDays = Math.floor((currentDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === i) streak++
        else break
      }

      const weeklyData: { date: string; workout: boolean; nutrition: boolean; habit: boolean; session: boolean }[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const hasWorkout = logs.some(
          (l) => l.client_id === clientId && l.completed_at && (typeof l.completed_at === 'string' ? l.completed_at.startsWith(dateStr) : new Date(l.completed_at).toISOString().split('T')[0] === dateStr)
        )
        const hasCheckin = checkinDates.has(dateStr)
        weeklyData.push({
          date: dateStr,
          workout: hasWorkout,
          nutrition: false,
          habit: false,
          session: hasCheckin,
        })
      }

      const firstHalf = weeklyData.slice(0, 3)
      const secondHalf = weeklyData.slice(4, 7)
      const firstHalfActivity = firstHalf.filter((d) => d.workout || d.session).length
      const secondHalfActivity = secondHalf.filter((d) => d.workout || d.session).length
      const trend: 'up' | 'down' | 'stable' =
        secondHalfActivity > firstHalfActivity ? 'up' : secondHalfActivity < firstHalfActivity ? 'down' : 'stable'
      const alerts = weeklyData.filter((d) => !d.workout && !d.session).length

      return {
        clientId,
        clientName,
        avatar,
        overallAdherence,
        workoutAdherence,
        nutritionAdherence: 0,
        habitAdherence: 0,
        sessionAttendance: checkinAdherence,
        trend,
        lastActive,
        alerts,
        streak,
        weeklyData,
        status,
      }
    })

    adherenceResults.sort((a, b) => a.overallAdherence - b.overallAdherence)
    return adherenceResults
  }

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!coachId) return
      if (didLoadRef.current) return
      if (loadingRef.current) return
      didLoadRef.current = true
      loadingRef.current = true
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(`/api/coach/analytics/adherence?period=${selectedPeriod}`, { signal: signal ?? null })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        const results = computeAdherenceFromPayload(
          data.clients ?? [],
          data.profiles ?? [],
          data.assignments ?? [],
          data.logs ?? [],
          data.wellness ?? [],
          data.todayStr ?? new Date().toISOString().split('T')[0],
          data.sevenDaysAgoStr ?? ''
        )
        setAdherenceData(results)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          didLoadRef.current = false
          return
        }
        console.error('Error loading adherence data:', err)
        didLoadRef.current = false
        setAdherenceData([])
        setLoadError(err instanceof Error ? err.message : 'Failed to load adherence data')
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [coachId, selectedPeriod]
  )

  useEffect(() => {
    if (!coachId) {
      setLoading(false)
      return
    }
    const ac = new AbortController()
    loadData(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [coachId, selectedPeriod, loadData])

  function loadAdherenceData() {
    didLoadRef.current = false
    loadData()
  }

  const getAdherenceColor = (score: number) => {
    if (score >= 75) return 'text-[color:var(--fc-status-success)]' // on_track
    if (score >= 50) return 'text-[color:var(--fc-status-warning)]' // at_risk
    return 'text-[color:var(--fc-status-error)]' // needs_attention
  }

  const getAdherenceBgColor = (score: number) => {
    if (score >= 75) return 'bg-[color:var(--fc-status-success)]/10'
    if (score >= 50) return 'bg-[color:var(--fc-status-warning)]/10'
    return 'bg-[color:var(--fc-status-error)]/10'
  }

  const getStatusColor = (status: 'on_track' | 'at_risk' | 'needs_attention') => {
    switch (status) {
      case 'on_track': return 'bg-[color:var(--fc-status-success)]'
      case 'at_risk': return 'bg-[color:var(--fc-status-warning)]'
      case 'needs_attention': return 'bg-[color:var(--fc-status-error)]'
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[color:var(--fc-status-success)]" />
      case 'down': return <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />
      default: return <Activity className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
    }
  }

  /** Convert client weeklyData (last 7 days) to TrendData for AdherenceTrendChart */
  function getTrendDataFromWeeklyData(
    weeklyData: AdherenceData['weeklyData']
  ): TrendData[] {
    return weeklyData.map((day) => {
      const workout = day.workout ? 100 : 0
      const nutrition = day.nutrition ? 100 : 0
      const habit = day.habit ? 100 : 0
      const session = day.session ? 100 : 0
      const overall = Math.round((workout + nutrition + habit + session) / 4)
      return {
        date: day.date,
        workout,
        nutrition,
        habit,
        overall,
      }
    })
  }

  const getOverallStats = () => {
    const totalClients = adherenceData.length
    const avgAdherence = adherenceData.length > 0 
      ? adherenceData.reduce((sum, c) => sum + c.overallAdherence, 0) / adherenceData.length
      : 0
    const totalAlerts = adherenceData.reduce((sum, c) => sum + c.alerts, 0)
    const avgStreak = adherenceData.length > 0
      ? adherenceData.reduce((sum, c) => sum + c.streak, 0) / adherenceData.length
      : 0

    return {
      totalClients,
      avgAdherence,
      totalAlerts,
      avgStreak
    }
  }

  const filteredClients = useMemo(() => {
    let filtered = adherenceData

    // Filter by selected client
    if (selectedClient !== 'all') {
      filtered = filtered.filter(client => client.clientId === selectedClient)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(client => 
        client.clientName.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [adherenceData, selectedClient, searchQuery])

  const stats = getOverallStats()

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-3 sm:p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-3 sm:mb-4"></div>
                <div className="space-y-3 sm:space-y-4">
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
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen flex flex-col gap-0 sm:gap-6">
        {loadError && (
          <div className="px-2 sm:px-6 pt-2">
            <ErrorBanner
              title="Couldn't load adherence data"
              message={loadError}
              onRetry={() => {
                didLoadRef.current = false
                loadAdherenceData()
              }}
            />
          </div>
        )}
        {/* Enhanced Header - hidden on mobile to save ~250px; page header is sufficient */}
        <div className="hidden sm:block shrink-0">
        <div className={`p-2 sm:p-6 ${theme.background} relative overflow-hidden max-w-full overflow-x-hidden`}>
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--fc-accent-cyan)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--fc-domain-meals)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[color:var(--fc-accent-purple)]/10 rounded-full blur-2xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-4">
                  <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/coach')}
                      className="fc-btn fc-btn-ghost h-10 w-10 flex-shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-2 min-w-0 flex-1 overflow-hidden">
                      <Badge className="fc-badge flex-shrink-0">Adherence Monitor</Badge>
                      <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)] truncate">
                        Client Adherence Tracking 📈
                      </h1>
                      <p className="text-sm sm:text-lg text-[color:var(--fc-text-dim)] truncate">
                        Monitor detailed client engagement and program adherence
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost flex items-center gap-2"
                      onClick={loadAdherenceData}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      className="fc-btn fc-btn-ghost flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl flex-shrink-0">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-success)]" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)] truncate">{(stats.avgAdherence ?? 0).toFixed(1)}%</p>
                          <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Avg Adherence</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl flex-shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-domain-workouts)]" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)] truncate">{stats.totalClients}</p>
                          <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Active Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl flex-shrink-0">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-status-warning)]" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)] truncate">{stats.totalAlerts}</p>
                          <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Active Alerts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-[color:var(--fc-glass-soft)] rounded-xl flex-shrink-0">
                          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[color:var(--fc-accent-purple)]" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xl sm:text-2xl font-bold text-[color:var(--fc-text-primary)] truncate">{(stats.avgStreak ?? 0).toFixed(0)}</p>
                          <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Avg Streak</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
        </div>

      {/* Main Content - no top spacing on mobile when hero is hidden */}
      <div className="p-2 sm:p-6 max-w-full overflow-x-hidden pt-0 sm:pt-6 min-w-0">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-8">
          {/* Filters */}
          <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-2 sm:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {adherenceData.map(client => (
                        <SelectItem key={client.clientId} value={client.clientId}>
                          {client.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2 min-w-0">
                  <Filter className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="fc-input w-full h-11 px-4 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-subtle)]"
                  />
                </div>
                
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                  <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="w-4 h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                  <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                    <SelectTrigger className="fc-select w-full h-11">
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="workout">Workouts</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="habit">Habits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Adherence Cards */}
          <div className="space-y-3 sm:space-y-6">
            {filteredClients.map(client => (
              <Card key={client.clientId} className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-3 sm:p-6 pb-2">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 overflow-hidden">
                      {/* Client Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-bold text-base sm:text-lg">
                          {client.avatar}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border)] ${getStatusColor(client.status)}`}></div>
                      </div>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <CardTitle className="text-lg sm:text-xl text-[color:var(--fc-text-primary)] truncate">
                          {client.clientName}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mb-2 sm:mb-3 truncate">
                          Last active: {new Date(client.lastActive).toLocaleDateString()}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <Badge className={`flex-shrink-0 ${getAdherenceBgColor(client.overallAdherence)} ${getAdherenceColor(client.overallAdherence)} border border-[color:var(--fc-glass-border)]`}>
                            {client.overallAdherence}% adherence
                          </Badge>
                          <Badge className="flex-shrink-0 bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)] border border-[color:var(--fc-glass-border)]">
                            <Flame className="w-3 h-3 mr-1" />
                            {client.streak} day streak
                          </Badge>
                          {client.alerts > 0 && (
                            <Badge className="flex-shrink-0 bg-[color:var(--fc-status-error)] text-white border-0">
                              {client.alerts} alert{client.alerts > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {getTrendIcon(client.trend)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3 sm:p-6 pt-2 space-y-3 sm:space-y-6">
                  {/* Adherence Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
                    <div className="space-y-2 sm:space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <Dumbbell className="w-4 h-4 text-[color:var(--fc-domain-workouts)] flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)] truncate">Workouts</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${getAdherenceColor(client.workoutAdherence)}`}>
                            {client.workoutAdherence}%
                          </span>
                        </div>
                        <Progress value={client.workoutAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <Apple className="w-4 h-4 text-[color:var(--fc-domain-meals)] flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)] truncate">Nutrition</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${getAdherenceColor(client.nutritionAdherence)}`}>
                            {client.nutritionAdherence}%
                          </span>
                        </div>
                        <Progress value={client.nutritionAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className="w-4 h-4 text-[color:var(--fc-domain-habits)] flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)] truncate">Habits</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${getAdherenceColor(client.habitAdherence)}`}>
                            {client.habitAdherence}%
                          </span>
                        </div>
                        <Progress value={client.habitAdherence} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-[color:var(--fc-status-warning)] flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-[color:var(--fc-text-primary)] truncate">Sessions</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${getAdherenceColor(client.sessionAttendance)}`}>
                            {client.sessionAttendance}%
                          </span>
                        </div>
                        <Progress value={client.sessionAttendance} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Weekly Adherence Calendar */}
                  <div className="fc-glass rounded-2xl p-2 sm:p-4 border border-[color:var(--fc-glass-border)] overflow-hidden">
                    <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-2 sm:mb-4 truncate">Weekly Adherence Calendar</h4>
                    <div className="overflow-x-auto -mx-1">
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[280px]">
                      {client.weeklyData.map((day, index) => (
                        <div key={index} className="text-center min-w-0 flex-shrink-0">
                          <div className="text-xs text-[color:var(--fc-text-subtle)] mb-1 truncate">
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                          <div className="space-y-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.workout ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-workouts)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Dumbbell className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.nutrition ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-meals)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Apple className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.habit ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-domain-habits)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Zap className="w-3 h-3" />
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              day.session ? 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)]' : 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
                            }`}>
                              <Calendar className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>

                  {/* Adherence trend chart — real data from weeklyData */}
                  <AdherenceTrendChart
                    clientId={client.clientId}
                    clientName={client.clientName}
                    trendData={getTrendDataFromWeeklyData(client.weeklyData)}
                    selectedMetric={selectedMetric}
                  />

                  {/* Quick Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1 min-h-[44px]">
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Send Message</span>
                    </Button>
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1 min-h-[44px]">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Schedule Check-in</span>
                    </Button>
                    <Button variant="outline" className="fc-btn fc-btn-ghost flex-1 min-h-[44px]">
                      <Settings className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Adjust Plan</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 px-4 sm:px-6">
                <Users className="w-12 h-12 mx-auto mb-4 text-[color:var(--fc-text-dim)]" />
                <h3 className="text-lg font-semibold mb-2 text-[color:var(--fc-text-primary)]">
                  {searchQuery.trim()
                    ? 'No clients match your search'
                    : selectedClient !== 'all'
                      ? 'No clients match your filters'
                      : 'No clients yet'}
                </h3>
                <p className="text-sm text-[color:var(--fc-text-dim)] mb-4 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? 'Try another name or clear the search to see your full roster.'
                    : selectedClient !== 'all'
                      ? 'Try a different client or time period, or clear filters to see everyone.'
                      : 'Add clients to your roster to track adherence, workouts, and nutrition in one place.'}
                </p>
                {searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="fc-btn fc-btn-secondary"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                ) : selectedClient !== 'all' ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="fc-btn fc-btn-secondary"
                    onClick={() => setSelectedClient('all')}
                  >
                    Show all clients
                  </Button>
                ) : (
                  <Button asChild className="fc-btn fc-btn-primary">
                    <Link href="/coach/clients/add">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add your first client
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AnimatedBackground>
  )
}
