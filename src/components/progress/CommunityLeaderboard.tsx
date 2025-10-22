'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  Users,
  Dumbbell,
  Zap,
  Target,
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { fetchLeaderboardData, LeaderboardEntry } from '@/lib/leaderboard'
import { useAuth } from '@/contexts/AuthContext'

interface CommunityLeaderboardProps {
  loading?: boolean
  currentUserId?: string
  currentUserSex?: 'M' | 'F'
}

type SexFilter = 'All' | 'M' | 'F'
type TimeFilter = 'weekly' | 'monthly' | 'yearly' | 'all_time'
type LeaderboardCategory = 
  // Absolute Strength
  | 'bench_absolute' | 'squat_absolute' | 'deadlift_absolute' 
  | 'ohp_absolute' | 'rdl_absolute' | 'hipthrust_absolute'
  | 'pushups_absolute' | 'chinups_absolute'
  // Relative Strength
  | 'bench_relative' | 'squat_relative' | 'deadlift_relative'
  | 'ohp_relative' | 'rdl_relative' | 'hipthrust_relative'
  // Compound Categories
  | 'total_lifted' | 'upper_body' | 'lower_body' | 'best_presser' | 'best_puller'
  // Specialized Categories
  | 'powerlifting_total' | 'bodyweight_master' | 'strength_endurance'

export function CommunityLeaderboard({ loading: initialLoading = false, currentUserId, currentUserSex = 'M' }: CommunityLeaderboardProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const { user } = useAuth()
  
  const [sexFilter, setSexFilter] = useState<SexFilter>(currentUserSex || 'All')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all_time')
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('total_lifted')
  const [showAbsoluteStrength, setShowAbsoluteStrength] = useState(true)
  const [showRelativeStrength, setShowRelativeStrength] = useState(false)
  const [showCompound, setShowCompound] = useState(true)
  const [showSpecialized, setShowSpecialized] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch leaderboard data
  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true)
      try {
        const filter = sexFilter === 'All' ? null : sexFilter
        const data = await fetchLeaderboardData(filter, timeFilter)
        setLeaderboardData(data)
      } catch (error) {
        console.error('Error loading leaderboard:', error)
        // Fall back to sample data on error
        setLeaderboardData(sampleData)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [sexFilter, timeFilter])

  // Sample data - Fallback if database is not set up yet
  const sampleData: LeaderboardEntry[] = [
    {
      id: '1',
      name: 'John Smith',
      sex: 'M',
      bodyweight: 80,
      lifts: {
        benchPress: 120,
        squat: 160,
        deadlift: 200,
        overheadPress: 70,
        rdl: 140,
        hipThrust: 180,
        pushups: 50,
        chinups: 20
      }
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      sex: 'F',
      bodyweight: 60,
      lifts: {
        benchPress: 60,
        squat: 100,
        deadlift: 120,
        overheadPress: 40,
        rdl: 90,
        hipThrust: 150,
        pushups: 30,
        chinups: 12
      }
    },
    {
      id: '3',
      name: 'Mike Davis',
      sex: 'M',
      bodyweight: 90,
      lifts: {
        benchPress: 140,
        squat: 180,
        deadlift: 220,
        overheadPress: 80,
        rdl: 160,
        hipThrust: 200,
        pushups: 60,
        chinups: 25
      }
    },
    {
      id: '4',
      name: 'Emily Chen',
      sex: 'F',
      bodyweight: 55,
      lifts: {
        benchPress: 55,
        squat: 90,
        deadlift: 110,
        overheadPress: 35,
        rdl: 85,
        hipThrust: 140,
        pushups: 25,
        chinups: 10
      }
    },
    {
      id: '5',
      name: 'Alex Rodriguez',
      sex: 'M',
      bodyweight: 75,
      lifts: {
        benchPress: 110,
        squat: 150,
        deadlift: 190,
        overheadPress: 65,
        rdl: 130,
        hipThrust: 170,
        pushups: 45,
        chinups: 18
      }
    }
  ]

  // Use leaderboardData (already filtered by sex from API)
  const filteredData = useMemo(() => {
    return leaderboardData
  }, [leaderboardData])

  // Calculate scores for different categories
  const getScore = (entry: LeaderboardEntry, category: LeaderboardCategory): number => {
    const { lifts, bodyweight } = entry
    
    switch (category) {
      // Absolute Strength
      case 'bench_absolute': return lifts.benchPress
      case 'squat_absolute': return lifts.squat
      case 'deadlift_absolute': return lifts.deadlift
      case 'ohp_absolute': return lifts.overheadPress
      case 'rdl_absolute': return lifts.rdl
      case 'hipthrust_absolute': return lifts.hipThrust
      case 'pushups_absolute': return lifts.pushups
      case 'chinups_absolute': return lifts.chinups
      
      // Relative Strength (lift / bodyweight)
      case 'bench_relative': return lifts.benchPress / bodyweight
      case 'squat_relative': return lifts.squat / bodyweight
      case 'deadlift_relative': return lifts.deadlift / bodyweight
      case 'ohp_relative': return lifts.overheadPress / bodyweight
      case 'rdl_relative': return lifts.rdl / bodyweight
      case 'hipthrust_relative': return lifts.hipThrust / bodyweight
      
      // Compound Categories
      case 'total_lifted': 
        return lifts.benchPress + lifts.squat + lifts.deadlift + lifts.overheadPress + 
               lifts.rdl + lifts.hipThrust
      
      case 'upper_body':
        return lifts.benchPress + lifts.overheadPress + (lifts.pushups * 0.5) + (lifts.chinups * 2)
      
      case 'lower_body':
        return lifts.squat + lifts.deadlift + lifts.rdl + lifts.hipThrust
      
      case 'best_presser':
        return lifts.squat + lifts.overheadPress + lifts.benchPress + (lifts.pushups * 0.5)
      
      case 'best_puller':
        return (lifts.chinups * 2) + lifts.deadlift + lifts.rdl + lifts.hipThrust
      
      // Specialized Categories
      case 'powerlifting_total':
        // Traditional powerlifting: Bench + Squat + Deadlift
        return lifts.benchPress + lifts.squat + lifts.deadlift
      
      case 'bodyweight_master':
        // Bodyweight exercises score
        return (lifts.pushups * 0.5) + (lifts.chinups * 2)
      
      case 'strength_endurance':
        // High rep capacity across all exercises
        return lifts.pushups + (lifts.chinups * 2) + 
               ((lifts.benchPress + lifts.squat + lifts.deadlift) / bodyweight) * 10
      
      default: return 0
    }
  }

  // Sort and rank
  const leaderboard = useMemo(() => {
    return filteredData
      .map(entry => ({
        ...entry,
        score: getScore(entry, selectedCategory)
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))
  }, [filteredData, selectedCategory])

  // Category definitions
  const categoryGroups = {
    absolute: [
      { id: 'bench_absolute' as LeaderboardCategory, label: 'Bench Press', icon: '🏋️' },
      { id: 'squat_absolute' as LeaderboardCategory, label: 'Squat', icon: '🦵' },
      { id: 'deadlift_absolute' as LeaderboardCategory, label: 'Deadlift', icon: '💪' },
      { id: 'ohp_absolute' as LeaderboardCategory, label: 'Overhead Press', icon: '⬆️' },
      { id: 'rdl_absolute' as LeaderboardCategory, label: 'RDL', icon: '🏋️‍♀️' },
      { id: 'hipthrust_absolute' as LeaderboardCategory, label: 'Hip Thrust', icon: '🍑' },
      { id: 'pushups_absolute' as LeaderboardCategory, label: 'Push-ups', icon: '👊' },
      { id: 'chinups_absolute' as LeaderboardCategory, label: 'Chin-ups', icon: '🔝' }
    ],
    relative: [
      { id: 'bench_relative' as LeaderboardCategory, label: 'Bench (Relative)', icon: '🏋️' },
      { id: 'squat_relative' as LeaderboardCategory, label: 'Squat (Relative)', icon: '🦵' },
      { id: 'deadlift_relative' as LeaderboardCategory, label: 'Deadlift (Relative)', icon: '💪' },
      { id: 'ohp_relative' as LeaderboardCategory, label: 'OHP (Relative)', icon: '⬆️' },
      { id: 'rdl_relative' as LeaderboardCategory, label: 'RDL (Relative)', icon: '🏋️‍♀️' },
      { id: 'hipthrust_relative' as LeaderboardCategory, label: 'Hip Thrust (Relative)', icon: '🍑' }
    ],
    compound: [
      { id: 'total_lifted' as LeaderboardCategory, label: 'Best Total', icon: '👑' },
      { id: 'upper_body' as LeaderboardCategory, label: 'Strongest Upper', icon: '💪' },
      { id: 'lower_body' as LeaderboardCategory, label: 'Strongest Lower', icon: '🦵' },
      { id: 'best_presser' as LeaderboardCategory, label: 'Best Presser', icon: '⬆️' },
      { id: 'best_puller' as LeaderboardCategory, label: 'Best Puller', icon: '⬇️' }
    ],
    specialized: [
      { id: 'powerlifting_total' as LeaderboardCategory, label: 'Powerlifting Total', icon: '🏋️' },
      { id: 'bodyweight_master' as LeaderboardCategory, label: 'Bodyweight Master', icon: '🤸' },
      { id: 'strength_endurance' as LeaderboardCategory, label: 'Strength Endurance', icon: '⚡' }
    ]
  }

  // Get title for rank
  const getTitle = (rank: number, category: string) => {
    if (rank === 1) return { title: 'Champion', color: 'text-yellow-600 dark:text-yellow-400', icon: Crown }
    if (rank === 2) return { title: 'Master', color: 'text-slate-400', icon: Medal }
    if (rank === 3) return { title: 'Expert', color: 'text-orange-600 dark:text-orange-400', icon: Medal }
    if (rank <= 10) return { title: 'Elite', color: 'text-purple-600 dark:text-purple-400', icon: Trophy }
    return { title: 'Competitor', color: theme.textSecondary, icon: Target }
  }

  // Format score display
  const formatScore = (score: number, category: LeaderboardCategory) => {
    if (category.includes('relative')) {
      return `${score.toFixed(2)}x BW`
    }
    if (category.includes('pushups') || category.includes('chinups') || category === 'bodyweight_master') {
      return `${Math.round(score)} pts`
    }
    if (category === 'strength_endurance') {
      return `${Math.round(score)} pts`
    }
    return `${Math.round(score)} kg`
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
          <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                <p className={`text-lg ${theme.text}`}>Loading leaderboard...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${theme.text}`}>Community Leaderboard</CardTitle>
                <p className={`${theme.textSecondary}`}>Compete, earn titles, and rise to the top!</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Sex Filter */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardContent className="p-6">
            <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
              <Users className="w-4 h-4" />
              Filter by Category
            </h3>
            <div className="flex gap-3">
              <Button
                onClick={() => setSexFilter('All')}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  sexFilter === 'All'
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                All Athletes
              </Button>
              <Button
                onClick={() => setSexFilter('M')}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  sexFilter === 'M'
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                Men
              </Button>
              <Button
                onClick={() => setSexFilter('F')}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  sexFilter === 'F'
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                Women
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Filter */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardContent className="p-6">
            <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
              <Calendar className="w-4 h-4" />
              Time Period
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                onClick={() => setTimeFilter('weekly')}
                className={cn(
                  "rounded-xl transition-all",
                  timeFilter === 'weekly'
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                Weekly
              </Button>
              <Button
                onClick={() => setTimeFilter('monthly')}
                className={cn(
                  "rounded-xl transition-all",
                  timeFilter === 'monthly'
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                Monthly
              </Button>
              <Button
                onClick={() => setTimeFilter('yearly')}
                className={cn(
                  "rounded-xl transition-all",
                  timeFilter === 'yearly'
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                Yearly
              </Button>
              <Button
                onClick={() => setTimeFilter('all_time')}
                className={cn(
                  "rounded-xl transition-all",
                  timeFilter === 'all_time'
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105"
                    : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                )}
              >
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Selection */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardContent className="p-6 space-y-4">
            {/* Absolute Strength */}
            <div>
              <button
                onClick={() => setShowAbsoluteStrength(!showAbsoluteStrength)}
                className={`w-full flex items-center justify-between mb-3 ${theme.text}`}
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Absolute Strength
                </h3>
                {showAbsoluteStrength ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showAbsoluteStrength && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categoryGroups.absolute.map(cat => (
                    <Button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "h-auto py-3 px-2 rounded-xl transition-all text-xs",
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                          : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Relative Strength */}
            <div>
              <button
                onClick={() => setShowRelativeStrength(!showRelativeStrength)}
                className={`w-full flex items-center justify-between mb-3 ${theme.text}`}
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Relative Strength (Pound-for-Pound)
                </h3>
                {showRelativeStrength ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRelativeStrength && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoryGroups.relative.map(cat => (
                    <Button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "h-auto py-3 px-2 rounded-xl transition-all text-xs",
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                          : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Compound Categories */}
            <div>
              <button
                onClick={() => setShowCompound(!showCompound)}
                className={`w-full flex items-center justify-between mb-3 ${theme.text}`}
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Elite Titles
                </h3>
                {showCompound ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showCompound && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoryGroups.compound.map(cat => (
                    <Button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "h-auto py-3 px-2 rounded-xl transition-all text-xs",
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg"
                          : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Specialized Categories */}
            <div>
              <button
                onClick={() => setShowSpecialized(!showSpecialized)}
                className={`w-full flex items-center justify-between mb-3 ${theme.text}`}
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Specialized Competitions
                </h3>
                {showSpecialized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSpecialized && (
                <div className="grid grid-cols-2 gap-2">
                  {categoryGroups.specialized.map(cat => (
                    <Button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "h-auto py-3 px-2 rounded-xl transition-all text-xs",
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                          : `${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${theme.text}`
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl ${theme.text}`}>
                {categoryGroups.absolute.find(c => c.id === selectedCategory)?.label ||
                 categoryGroups.relative.find(c => c.id === selectedCategory)?.label ||
                 categoryGroups.compound.find(c => c.id === selectedCategory)?.label}
              </CardTitle>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {leaderboard.length} athletes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const titleInfo = getTitle(entry.rank, selectedCategory)
                const TitleIcon = titleInfo.icon
                const isCurrentUser = entry.id === currentUserId

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-2xl p-4 transition-all",
                      entry.rank === 1 && "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700",
                      entry.rank === 2 && "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-300 dark:border-slate-600",
                      entry.rank === 3 && "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-300 dark:border-orange-700",
                      entry.rank > 3 && (isDark ? 'bg-slate-800' : 'bg-slate-50'),
                      isCurrentUser && "ring-2 ring-blue-500 ring-offset-2"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex flex-col items-center min-w-[60px]">
                        {entry.rank <= 3 ? (
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            entry.rank === 1 && "bg-gradient-to-br from-yellow-400 to-orange-500",
                            entry.rank === 2 && "bg-gradient-to-br from-slate-300 to-slate-400",
                            entry.rank === 3 && "bg-gradient-to-br from-orange-400 to-red-500"
                          )}>
                            {entry.rank === 1 && <Crown className="w-6 h-6 text-white" />}
                            {entry.rank === 2 && <Medal className="w-6 h-6 text-white" />}
                            {entry.rank === 3 && <Medal className="w-6 h-6 text-white" />}
                          </div>
                        ) : (
                          <div className={`text-2xl font-bold ${theme.text}`}>
                            #{entry.rank}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-bold ${theme.text} truncate`}>
                            {entry.name}
                            {isCurrentUser && <span className="text-blue-500 ml-2">(You)</span>}
                          </p>
                          <Badge className={cn(
                            "text-xs",
                            entry.sex === 'M' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                          )}>
                            {entry.sex === 'M' ? '♂' : '♀'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <TitleIcon className={`w-3 h-3 ${titleInfo.color}`} />
                          <p className={`text-xs font-medium ${titleInfo.color}`}>{titleInfo.title}</p>
                          <span className={`text-xs ${theme.textSecondary}`}>• {entry.bodyweight}kg BW</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${theme.text}`}>
                          {formatScore(entry.score, selectedCategory)}
                        </p>
                        {entry.rank <= 3 && (
                          <p className={`text-xs ${titleInfo.color} font-medium`}>
                            🏆 Title Holder
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-bold ${theme.text} mb-2`}>How to Compete</h3>
                <p className={`text-sm ${theme.textSecondary} mb-2`}>
                  Your personal records are automatically tracked from your workout logs. Keep pushing your limits to climb the ranks!
                </p>
                <p className={`text-sm ${theme.textSecondary}`}>
                  🏆 <strong>Titles Update Live:</strong> Rankings refresh after each workout. Defend your title or challenge the champion!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

