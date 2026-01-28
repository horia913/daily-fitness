'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ClientTypeGuard } from '@/components/guards/ClientTypeGuard'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  User as UserIcon,
  CheckCircle2,
  Circle,
  XCircle,
  PauseCircle,
  AlertCircle as AlertCircleIcon,
  RefreshCw,
  Filter,
  SortAsc,
  ChevronRight,
  Eye,
  Star,
  Trophy,
  Award,
  Flame,
  Zap,
  Heart,
  Gift,
  Rocket,
  Target,
  TrendingUp,
  BarChart3,
  MessageCircle,
  FileText,
  Camera,
  MapPin,
  Phone,
  Mail,
  Calendar as CalendarIcon2,
  Clock as ClockIcon2,
  User as UserIcon2,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon2,
  X as XIcon,
  Plus,
  Minus,
  Edit,
  Trash2,
  Download,
  Share,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Activity,
  Dumbbell,
  Target as TargetIcon,
  Timer,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Settings,
  MoreHorizontal,
  MoreVertical,
  Search,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link,
  Copy,
  Save,
  Upload,
  Download as DownloadIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkCheck as BookmarkCheckIcon,
  ThumbsUp as ThumbsUpIcon,
  ThumbsDown as ThumbsDownIcon,
  Smile as SmileIcon,
  Frown as FrownIcon,
  Meh as MehIcon,
  Activity as ActivityIcon,
  Dumbbell as DumbbellIcon,
  Target as TargetIcon2,
  Timer as TimerIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipForward as SkipForwardIcon,
  SkipBack as SkipBackIcon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Settings as SettingsIcon,
  MoreHorizontal as MoreHorizontalIcon,
  MoreVertical as MoreVerticalIcon,
  Search as SearchIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ExternalLink as ExternalLinkIcon,
  Link as LinkIcon,
  Copy as CopyIcon,
  Save as SaveIcon,
  Upload as UploadIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'

interface Session {
  id: string
  session_type: string
  status: string
  notes?: string
  session_rating?: number
  client_feedback?: string
  coach_notes?: string
  created_at: string
  time_slot: {
    date: string
    start_time: string
    end_time: string
  }
  coach: {
    first_name: string
    last_name: string
  }
}

export default function ClientSessions() {
  const { performanceSettings } = useTheme()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'no_show'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'duration'>('newest')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState('personal_training')
  const [sessionNotes, setSessionNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
    loadCoach()
  }, [])

  useEffect(() => {
    if (showBookingModal && coachId) {
      loadAvailableSlots()
    }
  }, [coachId, showBookingModal])

  const loadCoach = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the client's coach from clients table
      const { data: relationship, error } = await supabase
        .from('clients')
        .select('coach_id')
        .eq('client_id', user.id)
        .eq('status', 'active')
        .single()

      console.log('Client relationship:', relationship)
      console.log('Relationship error:', error)

      if (relationship?.coach_id) {
        setCoachId(relationship.coach_id)
        console.log('Coach ID set to:', relationship.coach_id)
      } else {
        console.log('No coach relationship found. Looking for any coach...')
        
        // If no coach assigned, find any coach as a fallback
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'coach')
          .limit(1)
          .single()

        if (coaches?.id) {
          setCoachId(coaches.id)
          console.log('Using fallback coach:', coaches.id)
        }
      }
    } catch (error) {
      console.error('Error loading coach:', error)
    }
  }

  const loadAvailableSlots = async () => {
    if (!coachId) return

    try {
      setBookingLoading(true)
      const today = new Date().toISOString().split('T')[0]

      // Get all available time slots from coach
      const { data: slots, error } = await supabase
        .from('coach_time_slots')
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_available', true)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      // Get booking counts for each slot
      const { data: bookingCounts } = await supabase
        .from('booked_sessions')
        .select('time_slot_id')
        .in('status', ['scheduled'])

      // Count bookings per slot
      const slotBookingCounts = bookingCounts?.reduce((acc: any, booking: any) => {
        acc[booking.time_slot_id] = (acc[booking.time_slot_id] || 0) + 1
        return acc
      }, {}) || {}

      // Filter slots that aren't at capacity and add booking info
      const available = slots?.map(slot => ({
        ...slot,
        current_bookings: slotBookingCounts[slot.id] || 0,
        max_capacity: slot.max_capacity || 4,
        spots_remaining: (slot.max_capacity || 4) - (slotBookingCounts[slot.id] || 0)
      })).filter(slot => slot.spots_remaining > 0) || []

      console.log('Available slots with capacity:', available)
      setAvailableSlots(available)
    } catch (error) {
      console.error('Error loading available slots:', error)
      setAvailableSlots([])
    } finally {
      setBookingLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, get the booked sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('booked_sessions')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        setSessions([])
        return
      }

      // Then, get the time slot and coach details for each session
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Get time slot details
          const { data: timeSlot } = await supabase
            .from('coach_time_slots')
            .select('date, start_time, end_time')
            .eq('id', session.time_slot_id)
            .single()

          // Get coach details
          const { data: coach } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.coach_id)
            .single()

          return {
            ...session,
            time_slot: timeSlot || { date: '', start_time: '', end_time: '' },
            coach: coach || { first_name: '', last_name: '' }
          }
        })
      )

      setSessions(sessionsWithDetails)
    } catch (error) {
      console.error('Error loading sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const cancelSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find the session to check timing
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return

      const sessionDateTime = new Date(`${session.time_slot.date}T${session.time_slot.start_time}`)
      const now = new Date()
      const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      let confirmMessage = ''
      if (hoursUntilSession > 8) {
        confirmMessage = 'Cancel this session? Your credit will be returned.'
      } else {
        confirmMessage = 'Warning: Cancelling less than 8 hours before the session means your credit will be lost. Cancel anyway?'
      }

      if (!confirm(confirmMessage)) return

      // Call API route
      const response = await fetchApi('/api/cancel-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, clientId: user.id }),
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
      loadSessions()
      } else {
        alert(result.error || 'Failed to cancel session')
      }
    } catch (error) {
      console.error('Error cancelling session:', error)
      alert('Failed to cancel session. Please try again.')
    }
  }

  const bookSession = async () => {
    if (!selectedSlot || !coachId) {
      alert('Please select a time slot')
      return
    }

    try {
      setBookingLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if client has an active clipcard
      const today = new Date().toISOString().split('T')[0]
      const { data: clipcard, error: clipcardError } = await supabase
        .from('clipcards')
        .select('id, sessions_remaining, end_date, clipcard_type, price')
        .eq('client_id', user.id)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .gte('end_date', today)
        .maybeSingle()

      if (clipcardError) {
        console.error('Clipcard check error:', clipcardError)
      }

      // Validate clipcard based on type
      if (!clipcard) {
        alert('You need an active clipcard to book sessions. Please contact your coach via WhatsApp to purchase a clipcard.')
        setBookingLoading(false)
        return
      }

      // For session-based clipcards, check remaining sessions
      if (clipcard.clipcard_type === 'session' && clipcard.sessions_remaining <= 0) {
        alert('Your clipcard has no sessions remaining. Please contact your coach via WhatsApp to renew.')
        setBookingLoading(false)
        return
      }

      console.log('Active clipcard found:', clipcard)

      // Check if client already has a booking in this slot
      const { data: existingBooking, error: checkError } = await supabase
        .from('booked_sessions')
        .select('id')
        .eq('client_id', user.id)
        .eq('time_slot_id', selectedSlot)
        .eq('status', 'scheduled')
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingBooking) {
        alert('You already have a booking for this time slot!')
        setBookingLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('booked_sessions')
        .insert({
          coach_id: coachId,
          client_id: user.id,
          time_slot_id: selectedSlot,
          session_type: sessionType,
          status: 'scheduled',
          notes: sessionNotes || null
        })
        .select()

      if (error) throw error

      // Show appropriate success message based on clipcard type
      if (clipcard.clipcard_type === 'monthly') {
        const renewalDate = new Date(clipcard.end_date).toLocaleDateString('en-GB')
        alert(`Session booked successfully! Your monthly subscription renews on ${renewalDate}.`)
      } else {
        alert(`Session booked successfully! You have ${clipcard.sessions_remaining - 1} sessions remaining. Renews on ${new Date(clipcard.end_date).toLocaleDateString('en-GB')}.`)
      }
      
      setShowBookingModal(false)
      setSelectedSlot(null)
      setSessionNotes('')
      loadSessions()
    } catch (error: any) {
      console.error('Error booking session:', error)
      alert(`Failed to book session: ${error.message}`)
    } finally {
      setBookingLoading(false)
    }
  }

  const openBookingModal = () => {
    setShowBookingModal(true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'cancelled_late':
        return 'bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200'
      case 'no_show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
    }
  }

  const getSessionIcon = (session: Session) => {
    const type = session.session_type.toLowerCase()
    const status = session.status
    
    if (status === 'completed') {
      switch (type) {
        case 'personal_training': return <Dumbbell className="w-8 h-8 text-green-500" />
        case 'nutrition_consultation': return <Heart className="w-8 h-8 text-pink-500" />
        case 'check_in': return <MessageCircle className="w-8 h-8 text-blue-500" />
        case 'assessment': return <BarChart3 className="w-8 h-8 text-purple-500" />
        default: return <CheckCircle className="w-8 h-8 text-green-500" />
      }
    } else if (status === 'scheduled') {
      switch (type) {
        case 'personal_training': return <Dumbbell className="w-8 h-8 text-blue-500" />
        case 'nutrition_consultation': return <Heart className="w-8 h-8 text-pink-500" />
        case 'check_in': return <MessageCircle className="w-8 h-8 text-blue-500" />
        case 'assessment': return <BarChart3 className="w-8 h-8 text-purple-500" />
        default: return <Clock className="w-8 h-8 text-blue-500" />
      }
    } else if (status === 'cancelled') {
      return <XCircle className="w-8 h-8 text-red-500" />
    } else if (status === 'no_show') {
      return <AlertCircle className="w-8 h-8 text-orange-500" />
    }
    
    return <Circle className="w-8 h-8 text-slate-400" />
  }

  const getSessionGradient = (session: Session) => {
    const status = session.status
    
    switch (status) {
      case 'completed':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
      case 'scheduled':
        return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
      case 'cancelled':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20'
      case 'no_show':
        return 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20'
      default:
        return 'from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20'
    }
  }

  const getMotivationalMessage = () => {
    const completedSessions = sessions.filter(s => s.status === 'completed').length
    const totalSessions = sessions.length
    
    if (completedSessions === 0) {
      return "Ready to start your training journey? 🚀"
    } else if (completedSessions === 1) {
      return "Great start! Your first session is complete! 🎉"
    } else if (completedSessions < 5) {
      return "Building momentum! Keep up the great work! 💪"
    } else if (completedSessions < 10) {
      return "Consistency is key! You're doing amazing! ⭐"
    } else if (completedSessions < 20) {
      return "Incredible dedication! You're becoming unstoppable! 🏆"
    } else {
      return "You're a true fitness champion! Legendary commitment! 🥇"
    }
  }

  const getSessionDuration = (session: Session) => {
    if (!session.time_slot?.start_time || !session.time_slot?.end_time) return 'N/A'
    
    const start = new Date(`2000-01-01T${session.time_slot.start_time}`)
    const end = new Date(`2000-01-01T${session.time_slot.end_time}`)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    } else {
      return `${diffMinutes}m`
    }
  }

  const getSessionStats = () => {
    const completed = sessions.filter(s => s.status === 'completed').length
    const scheduled = sessions.filter(s => s.status === 'scheduled').length
    const cancelled = sessions.filter(s => s.status === 'cancelled').length
    const noShow = sessions.filter(s => s.status === 'no_show').length
    const total = sessions.length
    const avgRating = sessions
      .filter(s => s.session_rating)
      .reduce((sum, s) => sum + (s.session_rating || 0), 0) / 
      sessions.filter(s => s.session_rating).length || 0
    
    return { completed, scheduled, cancelled, noShow, total, avgRating }
  }

  const filteredAndSortedSessions = () => {
    let filtered = sessions

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(session => session.status === filterStatus)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'rating':
        return filtered.sort((a, b) => (b.session_rating || 0) - (a.session_rating || 0))
      case 'duration':
        return filtered.sort((a, b) => {
          const aDuration = getSessionDuration(a)
          const bDuration = getSessionDuration(b)
          // Simple comparison - could be enhanced with proper duration parsing
          return bDuration.localeCompare(aDuration)
        })
      default:
        return filtered
    }
  }

  const openSessionDetails = (session: Session) => {
    setSelectedSession(session)
    setShowDetails(true)
  }

  const closeSessionDetails = () => {
    setSelectedSession(null)
    setShowDetails(false)
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
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

  const stats = getSessionStats()

  return (
    <ProtectedRoute requiredRole="client">
      <ClientTypeGuard requiredType="in_gym">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Session Tracker
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Training Log
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {getMotivationalMessage()}
                  </p>
                </div>
              </div>
              <Button
                onClick={openBookingModal}
                className="fc-btn fc-btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Book a Session
              </Button>
            </div>
          </GlassCard>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard elevation={1} className="fc-glass fc-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--fc-text-subtle)]">Completed</p>
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.completed}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={1} className="fc-glass fc-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--fc-text-subtle)]">Scheduled</p>
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.scheduled}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={1} className="fc-glass fc-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--fc-text-subtle)]">Avg Rating</p>
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={1} className="fc-glass fc-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--fc-text-subtle)]">Total</p>
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{stats.total}</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard elevation={1} className="fc-glass fc-card p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-[color:var(--fc-text-dim)] mb-2 block">Status Filter</label>
                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no_show')}
                    className="w-full px-3 py-2 border border-[color:var(--fc-glass-border)] rounded-xl bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                  >
                    <option value="all">All Sessions</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-[color:var(--fc-text-dim)] mb-2 block">Sort by</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating' | 'duration')}
                    className="w-full px-3 py-2 border border-[color:var(--fc-glass-border)] rounded-xl bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="rating">Highest Rating</option>
                    <option value="duration">Longest Duration</option>
                  </select>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4 pb-24">
              {filteredAndSortedSessions().map((session) => (
                <GlassCard key={session.id} elevation={2} className={`fc-glass fc-card p-6 ${getSessionGradient(session)}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Left Section - Icon and Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-20 h-20 bg-[color:var(--fc-glass-highlight)] rounded-2xl flex items-center justify-center shadow-lg">
                          {getSessionIcon(session)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-[color:var(--fc-text-primary)] truncate">
                              {session.session_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <Badge className={`${getStatusColor(session.status)} rounded-full px-3 py-1`}>
                              {session.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--fc-text-subtle)] mb-3">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {session.coach.first_name} {session.coach.last_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(session.time_slot.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(session.time_slot.start_time)} - {formatTime(session.time_slot.end_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-4 h-4" />
                              {getSessionDuration(session)}
                            </span>
                          </div>
                          {(session.notes || session.coach_notes) && (
                            <p className="text-[color:var(--fc-text-dim)] text-sm mb-3">
                              {session.notes || session.coach_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Rating and Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Rating Display */}
                        {session.session_rating && (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < session.session_rating! 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                              {session.session_rating}/5
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openSessionDetails(session)}
                            className="fc-btn fc-btn-secondary"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                          {session.status === 'scheduled' && (
                            <Button
                              onClick={() => cancelSession(session.id)}
                              className="fc-btn bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                </GlassCard>
              ))}

              {filteredAndSortedSessions().length === 0 && (
                <GlassCard elevation={2} className="fc-glass fc-card p-12">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-[color:var(--fc-glass-highlight)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Calendar className="w-12 h-12 text-[color:var(--fc-text-subtle)]" />
                    </div>
                    <h3 className="text-2xl font-bold text-[color:var(--fc-text-primary)] mb-4">
                      {filterStatus === 'all' ? 'No Sessions Yet' : `No ${filterStatus} Sessions`}
                    </h3>
                    <p className="text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                      {filterStatus === 'all' 
                        ? "You haven't booked any sessions yet. Book a session with your coach to get started on your fitness journey!"
                        : `No sessions with status "${filterStatus}" found. Try changing your filter to see other sessions.`
                      }
                    </p>
                    {filterStatus === 'all' ? (
                      <div className="text-center">
                        <p className="text-[color:var(--fc-text-subtle)] mb-4">
                          Contact your coach to schedule your first training session.
                        </p>
                        <Button 
                          onClick={() => window.location.href = '/client'}
                          className="fc-btn fc-btn-primary"
                        >
                          <Calendar className="w-5 h-5 mr-2" />
                          Back to Dashboard
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setFilterStatus('all')}
                        className="fc-btn fc-btn-secondary"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        View All Sessions
                      </Button>
                    )}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-3xl p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Calendar className="w-7 h-7" />
                  Book a Session
                </h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 pb-6 space-y-6">
                {bookingLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-300">Loading available slots...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                      All Slots Fully Booked
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                      All available time slots are currently at full capacity (4 clients per slot). Please try booking a later date or contact your coach for additional availability.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => setShowBookingModal(false)}
                        className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl px-6 py-3 font-semibold"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setShowBookingModal(false)
                          window.location.href = '/client'
                        }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-6 py-3 font-semibold"
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Contact Coach
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Session Type */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Session Type
                      </label>
                      <select
                        value={sessionType}
                        onChange={(e) => setSessionType(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <option value="personal_training">Personal Training</option>
                        <option value="nutrition_consultation">Nutrition Consultation</option>
                        <option value="check_in">Check-In</option>
                        <option value="assessment">Assessment</option>
                      </select>
                    </div>

                    {/* Available Time Slots */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Select Time Slot
                      </label>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableSlots.map((slot: any) => {
                          const slotDate = new Date(slot.date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                          const startTime = slot.start_time.substring(0, 5)
                          const endTime = slot.end_time.substring(0, 5)
                          const spotsRemaining = slot.spots_remaining || 4
                          const isAlmostFull = spotsRemaining <= 2
                          
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot.id)}
                              className={`w-full p-4 rounded-xl border-2 transition-all ${
                                selectedSlot === slot.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                              }`}
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                      {slotDate}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                      {startTime} - {endTime}
                                    </span>
                                  </div>
                                </div>
                                <div className={`text-xs font-medium ${
                                  isAlmostFull 
                                    ? 'text-orange-600 dark:text-orange-400' 
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining
                                  {isAlmostFull && ' - Book now!'}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Session Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder="Any specific requests or information for your coach..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={bookSession}
                        disabled={!selectedSlot || bookingLoading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                      </Button>
                      <Button
                        onClick={() => setShowBookingModal(false)}
                        className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl px-6 py-3 font-semibold"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedBackground>
    </ClientTypeGuard>
    </ProtectedRoute>
  )
}
