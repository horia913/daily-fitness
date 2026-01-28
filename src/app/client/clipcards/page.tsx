'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  CreditCard,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  SortAsc,
  BookOpen,
  Star,
  Sparkles,
  Zap,
  Heart,
  Target,
  Timer,
  Gift,
  Crown,
  Flame,
  Award,
  Plus,
  Eye,
  ShoppingCart
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ClipCard {
  id: string
  sessions_total: number
  sessions_used: number
  sessions_remaining: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  clipcard_type: {
    name: string
    sessions_count: number
    validity_days: number
    price: number
  }
}

export default function ClientClipCards() {
  const { performanceSettings } = useTheme()
  const [clipcards, setClipcards] = useState<ClipCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'low_sessions' | 'used_up' | 'expired'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'expiring' | 'sessions_remaining'>('newest')

  useEffect(() => {
    loadClipCards()
  }, [])

  const loadClipCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clipcardsData, error } = await supabase
        .from('clipcards')
        .select(`
          *,
          clipcard_type:clipcard_types(
            name,
            sessions_count,
            validity_days,
            price
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('ClipCards table not found, using empty array')
        setClipcards([])
      } else {
        setClipcards(clipcardsData || [])
      }
    } catch (error) {
      console.error('Error loading clipcards:', error)
      setClipcards([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getClipCardStatus = (clipcard: ClipCard) => {
    const now = new Date()
    const endDate = new Date(clipcard.end_date)
    
    if (clipcard.sessions_remaining <= 0) {
      return 'used_up'
    } else if (endDate < now) {
      return 'expired'
    } else if (clipcard.sessions_remaining <= clipcard.sessions_total * 0.2) {
      return 'low_sessions'
    } else {
      return 'active'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'low_sessions':
        return 'bg-yellow-100 text-yellow-800'
      case 'used_up':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'low_sessions':
        return 'Low Sessions'
      case 'used_up':
        return 'Used Up'
      case 'expired':
        return 'Expired'
      default:
        return 'Unknown'
    }
  }

  const getUsagePercentage = (clipcard: ClipCard) => {
    return Math.round((clipcard.sessions_used / clipcard.sessions_total) * 100)
  }

  const getDaysRemaining = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getClipCardIcon = (clipcard: ClipCard) => {
    const status = getClipCardStatus(clipcard)
    switch (status) {
      case 'active':
        return <Crown className="w-6 h-6 text-purple-600" />
      case 'low_sessions':
        return <Flame className="w-6 h-6 text-orange-500" />
      case 'used_up':
        return <Award className="w-6 h-6 text-green-600" />
      case 'expired':
        return <Clock className="w-6 h-6 text-slate-400" />
      default:
        return <CreditCard className="w-6 h-6 text-slate-600" />
    }
  }

  const getClipCardGradient = (clipcard: ClipCard) => {
    const status = getClipCardStatus(clipcard)
    switch (status) {
      case 'active':
        return 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
      case 'low_sessions':
        return 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20'
      case 'used_up':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
      case 'expired':
        return 'from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20'
      default:
        return 'from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20'
    }
  }

  const filteredAndSortedClipcards = () => {
    let filtered = clipcards

    // Apply filter
    if (filter !== 'all') {
      filtered = clipcards.filter(clipcard => getClipCardStatus(clipcard) === filter)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'expiring':
        return filtered.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
      case 'sessions_remaining':
        return filtered.sort((a, b) => b.sessions_remaining - a.sessions_remaining)
      default:
        return filtered
    }
  }

  const getActiveClipcardsCount = () => {
    return clipcards.filter(clipcard => getClipCardStatus(clipcard) === 'active').length
  }

  const getTotalRemainingSessions = () => {
    return clipcards.reduce((total, clipcard) => total + clipcard.sessions_remaining, 0)
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  ))}
                </div>
                <div className="h-16 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    ClipCard Wallet
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    My ClipCards
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Track your packages and session balance at a glance.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  {getActiveClipcardsCount()} active
                </div>
                <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  {getTotalRemainingSessions()} sessions left
                </div>
                <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  {clipcards.length} total
                </div>
              </div>
            </div>
          </GlassCard>

            {/* Filters and Sorting */}
            <GlassCard elevation={2} className="fc-glass fc-card p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Filter by Status</label>
                    <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                      <SelectTrigger className="w-full">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter ClipCards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ClipCards</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="low_sessions">Low Sessions</SelectItem>
                        <SelectItem value="used_up">Used Up</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Sort by</label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full">
                        <SortAsc className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Sort ClipCards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="expiring">Expiring Soon</SelectItem>
                        <SelectItem value="sessions_remaining">Most Sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            </GlassCard>

            {/* ClipCards List */}
            <div className="space-y-4">
              {filteredAndSortedClipcards().map((clipcard) => {
                const status = getClipCardStatus(clipcard)
                const usagePercentage = getUsagePercentage(clipcard)
                const daysRemaining = getDaysRemaining(clipcard.end_date)
                
                return (
                  <GlassCard key={clipcard.id} elevation={2} className={`fc-glass fc-card p-6 ${getClipCardGradient(clipcard)}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {/* Left Section - Icon and Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 bg-[color:var(--fc-glass-highlight)] rounded-2xl flex items-center justify-center shadow-lg">
                            {getClipCardIcon(clipcard)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-[color:var(--fc-text-primary)] truncate">
                                {clipcard.clipcard_type.name}
                              </h3>
                              <Badge className={`${getStatusColor(status)} rounded-full px-3 py-1`}>
                                {getStatusText(status)}
                              </Badge>
                              {status === 'active' && daysRemaining > 0 && (
                                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full px-3 py-1">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {daysRemaining} days left
                                </Badge>
                              )}
                            </div>
                            <p className="text-[color:var(--fc-text-dim)] mb-3">
                              {clipcard.sessions_used}/{clipcard.sessions_total} sessions used • {clipcard.clipcard_type.price} RON
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--fc-text-subtle)]">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Purchased: {formatDate(clipcard.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Expires: {formatDate(clipcard.end_date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Progress and Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Progress Circle */}
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-[color:var(--fc-glass-highlight)] rounded-full flex items-center justify-center shadow-lg">
                              <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{
                                  background: `conic-gradient(from 0deg, ${
                                    usagePercentage >= 100 ? '#EF4444' :
                                    usagePercentage >= 80 ? '#F59E0B' :
                                    '#10B981'
                                  } ${usagePercentage * 3.6}deg, #E5E7EB 0deg)`
                                }}
                              >
                                <div className="w-12 h-12 bg-[color:var(--fc-glass-highlight)] rounded-full flex items-center justify-center">
                                  <span className={`text-xs font-bold ${
                                    usagePercentage >= 100 ? 'text-red-600' :
                                    usagePercentage >= 80 ? 'text-orange-600' :
                                    'text-green-600'
                                  }`}>
                                    {usagePercentage}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{clipcard.sessions_remaining}</p>
                              <p className="text-sm text-[color:var(--fc-text-subtle)]">remaining</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            {status === 'active' && clipcard.sessions_remaining > 0 && (
                              <Link href="/client/scheduling">
                                <Button className="fc-btn fc-btn-primary w-full sm:w-auto">
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  Book Session
                                </Button>
                              </Link>
                            )}
                            <Button variant="outline" className="fc-btn fc-btn-secondary w-full sm:w-auto">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            {(status === 'used_up' || status === 'expired') && (
                              <Button className="fc-btn fc-btn-primary w-full sm:w-auto">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Purchase More
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                  </GlassCard>
                )
              })}

              {filteredAndSortedClipcards().length === 0 && (
                <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
                  <div className="w-24 h-24 bg-[color:var(--fc-glass-highlight)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <CreditCard className="w-12 h-12 text-[color:var(--fc-text-subtle)]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[color:var(--fc-text-primary)] mb-4">
                    {filter === 'all' ? 'No ClipCards Found' : `No ${filter.replace('_', ' ')} ClipCards`}
                  </h3>
                  <p className="text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                    {filter === 'all' 
                      ? "You don't have any ClipCards yet. Contact your coach to purchase a ClipCard package and start your fitness journey!"
                      : `You don't have any ${filter.replace('_', ' ')} ClipCards at the moment.`
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/client/scheduling">
                      <Button className="fc-btn fc-btn-primary">
                        <BookOpen className="w-5 h-5 mr-2" />
                        Book a Session
                      </Button>
                    </Link>
                    <Button variant="outline" className="fc-btn fc-btn-secondary">
                      <Plus className="w-5 h-5 mr-2" />
                      Contact Coach
                    </Button>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </AnimatedBackground>
    </ProtectedRoute>
  )
}
