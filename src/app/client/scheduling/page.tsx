'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CreditCard,
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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Stop,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Settings,
  MoreHorizontal,
  MoreVertical,
  Search,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp,
  ArrowDown,
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
  Stop as StopIcon,
  SkipForward as SkipForwardIcon,
  SkipBack as SkipBackIcon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Settings as SettingsIcon,
  MoreHorizontal as MoreHorizontalIcon,
  MoreVertical as MoreVerticalIcon,
  Search as SearchIcon,
  ArrowLeft as ArrowLeftIcon2,
  ArrowRight as ArrowRightIcon2,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  ExternalLink as ExternalLinkIcon,
  Link as LinkIcon,
  Copy as CopyIcon,
  Save as SaveIcon,
  Upload as UploadIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  is_booked: boolean
}

interface ClipCard {
  id: string
  sessions_total: number
  sessions_used: number
  sessions_remaining: number
  start_date: string
  end_date: string
  is_active: boolean
  clipcard_type: {
    name: string
    sessions_count: number
    validity_days: number
  }
}

interface Coach {
  id: string
  first_name: string
  last_name: string
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export default function ClientScheduling() {
  const { performanceSettings } = useTheme()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<string>('')
  const [clipcards, setClipcards] = useState<ClipCard[]>([])
  const [selectedClipCard, setSelectedClipCard] = useState<string>('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [bookingStep, setBookingStep] = useState<'confirm' | 'success'>('confirm')

  useEffect(() => {
    loadCoaches()
  }, [])

  useEffect(() => {
    if (selectedCoach) {
      loadClipCards()
    }
  }, [selectedCoach])

  useEffect(() => {
    if (selectedCoach && selectedDate) {
      loadTimeSlots()
    }
  }, [selectedCoach, selectedDate])

  const loadCoaches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get coaches (users with role 'coach')
      const { data: coachesData, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'coach')

      if (error) throw error

      setCoaches(coachesData || [])
      if (coachesData && coachesData.length > 0) {
        setSelectedCoach(coachesData[0].id)
      }
    } catch (error) {
      console.error('Error loading coaches:', error)
    } finally {
      setLoading(false)
    }
  }

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
            validity_days
          )
        `)
        .eq('client_id', user.id)
        .eq('coach_id', selectedCoach)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .gt('sessions_remaining', 0)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('ClipCards table not found, using empty array')
        setClipcards([])
      } else {
        setClipcards(clipcardsData || [])
        if (clipcardsData && clipcardsData.length > 0) {
          setSelectedClipCard(clipcardsData[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading clipcards:', error)
      setClipcards([])
    }
  }

  const loadTimeSlots = async () => {
    try {
      const { data: timeSlotsData, error } = await supabase
        .from('coach_time_slots')
        .select('*')
        .eq('coach_id', selectedCoach)
        .eq('date', selectedDate)
        .eq('is_available', true)
        .gt('slots_available', 0)
        .order('start_time')

      if (error) {
        console.log('Time slots table not found, using empty array')
        setTimeSlots([])
      } else {
        setTimeSlots(timeSlotsData || [])
      }
    } catch (error) {
      console.error('Error loading time slots:', error)
      setTimeSlots([])
    }
  }

  const bookSession = async (timeSlotId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setBooking(true)

      // Use the ClipCard booking function
      const { data, error } = await supabase.rpc('book_session_with_clipcard', {
        p_coach_id: selectedCoach,
        p_client_id: user.id,
        p_time_slot_id: timeSlotId,
        p_clipcard_id: selectedClipCard || null
      })

      if (error) {
        console.error('Error booking session:', error)
        alert('Error booking session. Please try again.')
        return
      }

      // Reload time slots and clipcards
      loadTimeSlots()
      loadClipCards()
      
      // Show success message
      alert('Session booked successfully!')
    } catch (error) {
      console.error('Error booking session:', error)
      alert('Error booking session. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  const getWeekDates = () => {
    const startOfWeek = new Date(currentWeek)
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay())
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getSelectedCoachName = () => {
    const coach = coaches.find(c => c.id === selectedCoach)
    return coach ? `${coach.first_name} ${coach.last_name}` : 'Select Coach'
  }

  const getSelectedClipCardName = () => {
    const clipcard = clipcards.find(cc => cc.id === selectedClipCard)
    return clipcard ? `${clipcard.clipcard_type.name} (${clipcard.sessions_remaining} remaining)` : 'Select ClipCard'
  }

  const getMotivationalMessage = () => {
    const activeClipCards = clipcards.length
    const totalSessions = clipcards.reduce((sum, cc) => sum + cc.sessions_remaining, 0)
    
    if (activeClipCards === 0) {
      return "Ready to start your fitness journey? Let's book your first session! 🚀"
    } else if (totalSessions === 1) {
      return "One session left! Make it count! 💪"
    } else if (totalSessions < 5) {
      return "Great progress! Keep the momentum going! ⭐"
    } else if (totalSessions < 10) {
      return "Amazing dedication! You're building great habits! 🏆"
    } else {
      return "You're a fitness champion! Keep up the incredible work! 🥇"
    }
  }

  const getCoachIcon = (coach: Coach) => {
    // Simple hash-based icon selection for consistency
    const hash = coach.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    const icons = [Dumbbell, Heart, Target, Trophy, Award, Star, Flame, Zap]
    return icons[Math.abs(hash) % icons.length]
  }

  const getClipCardIcon = (clipcard: ClipCard) => {
    const type = clipcard.clipcard_type.name.toLowerCase()
    if (type.includes('personal')) return Dumbbell
    if (type.includes('nutrition')) return Heart
    if (type.includes('assessment')) return BarChart3
    if (type.includes('check')) return MessageCircle
    return CreditCard
  }

  const getClipCardGradient = (clipcard: ClipCard) => {
    const sessionsRemaining = clipcard.sessions_remaining
    const totalSessions = clipcard.clipcard_type.sessions_count
    const percentage = (sessionsRemaining / totalSessions) * 100
    
    if (percentage >= 80) return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
    if (percentage >= 50) return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
    if (percentage >= 25) return 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20'
    return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20'
  }

  const getTimeSlotIcon = (slot: TimeSlot) => {
    const hour = parseInt(slot.start_time.split(':')[0])
    if (hour < 8) return Moon
    if (hour < 12) return Sun
    if (hour < 17) return Sun
    if (hour < 20) return Sun
    return Moon
  }

  const getTimeSlotGradient = (slot: TimeSlot) => {
    const hour = parseInt(slot.start_time.split(':')[0])
    if (hour < 8) return 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
    if (hour < 12) return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
    if (hour < 17) return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
    if (hour < 20) return 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'
    return 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20'
  }

  const openBookingModal = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot)
    setShowBookingModal(true)
    setBookingStep('confirm')
  }

  const closeBookingModal = () => {
    setShowBookingModal(false)
    setSelectedTimeSlot(null)
    setBookingStep('confirm')
  }

  const confirmBooking = async () => {
    if (!selectedTimeSlot) return
    
    try {
      setBooking(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('book_session_with_clipcard', {
        p_coach_id: selectedCoach,
        p_client_id: user.id,
        p_time_slot_id: selectedTimeSlot.id,
        p_clipcard_id: selectedClipCard || null
      })

      if (error) {
        console.error('Error booking session:', error)
        alert('Error booking session. Please try again.')
        return
      }

      setBookingStep('success')
      
      // Reload time slots and clipcards
      loadTimeSlots()
      loadClipCards()
      
    } catch (error) {
      console.error('Error booking session:', error)
      alert('Error booking session. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  const getBookingStats = () => {
    const totalSessions = clipcards.reduce((sum, cc) => sum + cc.sessions_remaining, 0)
    const activeClipCards = clipcards.length
    const upcomingSessions = timeSlots.length
    const selectedCoachName = getSelectedCoachName()
    
    return { totalSessions, activeClipCards, upcomingSessions, selectedCoachName }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-slate-800">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="text-center space-y-4 py-8">
                <div className="animate-pulse">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl w-80 mx-auto mb-4"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-96 mx-auto mb-6"></div>
                </div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                        <div>
                          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coach Selection Skeleton */}
              <div className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mb-4"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calendar Skeleton */}
              <div className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mb-4"></div>
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const stats = getBookingStats()

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-4 py-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  Book Session
                </h1>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {getMotivationalMessage()}
              </p>
            </div>

            {/* Booking Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sessions Left</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.totalSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Active Cards</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.activeClipCards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Available</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.upcomingSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Coach</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
                        {stats.selectedCoachName.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coach Selection */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  Select Your Coach
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Choose the coach you'd like to work with
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coaches.map((coach) => {
                    const CoachIcon = getCoachIcon(coach)
                    const isSelected = selectedCoach === coach.id
                    
                    return (
                      <Button
                        key={coach.id}
                        variant="outline"
                        onClick={() => setSelectedCoach(coach.id)}
                        className={`h-auto p-6 flex flex-col items-center gap-3 rounded-2xl border-2 transition-all duration-300 ${
                          isSelected 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg scale-105' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-green-300 hover:shadow-md'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                          isSelected 
                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                            : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                        }`}>
                          <CoachIcon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                        </div>
                        <div className="text-center">
                          <span className={`font-semibold text-lg ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {coach.first_name} {coach.last_name}
                          </span>
                          {isSelected && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Selected</span>
                            </div>
                          )}
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ClipCard Selection */}
            {selectedCoach && (
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    Select Your ClipCard
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-300">
                    Choose which ClipCard to use for this session
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {clipcards.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clipcards.map((clipcard) => {
                        const ClipCardIcon = getClipCardIcon(clipcard)
                        const gradient = getClipCardGradient(clipcard)
                        const isSelected = selectedClipCard === clipcard.id
                        
                        return (
                          <Button
                            key={clipcard.id}
                            variant="outline"
                            onClick={() => setSelectedClipCard(clipcard.id)}
                            className={`h-auto p-6 flex flex-col items-start gap-3 rounded-2xl border-2 transition-all duration-300 ${gradient} ${
                              isSelected 
                                ? 'border-green-500 shadow-lg scale-105' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-green-300 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                  : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                              }`}>
                                <ClipCardIcon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                              </div>
                              <div className="flex-1 text-left">
                                <span className={`font-semibold text-lg ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {clipcard.clipcard_type.name}
                                </span>
                                {isSelected && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600 font-medium">Selected</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="w-full space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Sessions Left</span>
                                <span className={`font-bold text-lg ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {clipcard.sessions_remaining}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Expires</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(clipcard.end_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="w-12 h-12 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                        No Active ClipCards
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                        You don't have any active ClipCards with this coach. Contact your coach to purchase a ClipCard and start booking sessions!
                      </p>
                      <Button 
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Contact Coach
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Date Selection */}
            {selectedCoach && selectedClipCard && (
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardHeader className="p-0 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-xl mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        Select Date
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-300">
                        Choose when you'd like to have your session
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newWeek = new Date(currentWeek)
                          newWeek.setDate(currentWeek.getDate() - 7)
                          setCurrentWeek(newWeek)
                        }}
                        className="rounded-xl border-slate-200 dark:border-slate-700 hover:border-purple-300"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newWeek = new Date(currentWeek)
                          newWeek.setDate(currentWeek.getDate() + 7)
                          setCurrentWeek(newWeek)
                        }}
                        className="rounded-xl border-slate-200 dark:border-slate-700 hover:border-purple-300"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 gap-3">
                    {getWeekDates().map((date, index) => {
                      const dateStr = formatDate(date)
                      const isSelected = selectedDate === dateStr
                      const isToday = dateStr === formatDate(new Date())
                      const isPast = date < new Date() && !isToday
                      
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => !isPast && setSelectedDate(dateStr)}
                          disabled={isPast}
                          className={`h-auto p-4 flex flex-col gap-2 rounded-2xl border-2 transition-all duration-300 ${
                            isSelected 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg scale-105' 
                              : isPast
                              ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                              : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:shadow-md'
                          } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        >
                          <span className={`text-xs font-medium ${
                            isSelected ? 'text-purple-700 dark:text-purple-300' : 
                            isPast ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {DAYS_OF_WEEK[date.getDay()].substring(0, 3)}
                          </span>
                          <span className={`text-lg font-bold ${
                            isSelected ? 'text-purple-800 dark:text-purple-200' : 
                            isPast ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {date.getDate()}
                          </span>
                          {isToday && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-purple-600" />
                            </div>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time Slots */}
            {selectedCoach && selectedClipCard && selectedDate && (
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Available Times
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-300">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} with {getSelectedCoachName()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {timeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {timeSlots.map((slot) => {
                        const TimeSlotIcon = getTimeSlotIcon(slot)
                        const gradient = getTimeSlotGradient(slot)
                        
                        return (
                          <Button
                            key={slot.id}
                            variant="outline"
                            onClick={() => openBookingModal(slot)}
                            disabled={booking}
                            className={`h-auto p-6 flex flex-col gap-3 rounded-2xl border-2 transition-all duration-300 ${gradient} border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:shadow-lg hover:scale-105`}
                          >
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                              <TimeSlotIcon className="w-6 h-6 text-orange-500" />
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-lg text-slate-800 dark:text-slate-200">
                                {formatTime(slot.start_time)}
                              </span>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                to {formatTime(slot.end_time)}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              Available
                            </Badge>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-12 h-12 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                        No Available Times
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                        No available time slots for this date. Try selecting a different date or contact your coach for more availability.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button 
                          onClick={() => setSelectedDate('')}
                          className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Calendar className="w-5 h-5 mr-2" />
                          Choose Different Date
                        </Button>
                        <Button 
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Contact Coach
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Booking Confirmation Modal */}
            {showBookingModal && selectedTimeSlot && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border-0 max-w-md w-full">
                  <CardContent className="p-0">
                    {bookingStep === 'confirm' ? (
                      <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                          <Calendar className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Confirm Booking
                          </h3>
                          <p className="text-slate-600 dark:text-slate-300">
                            Are you sure you want to book this session?
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Coach:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {getSelectedCoachName()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Date:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(selectedDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Time:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatTime(selectedTimeSlot.start_time)} - {formatTime(selectedTimeSlot.end_time)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">ClipCard:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {getSelectedClipCardName()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={closeBookingModal}
                            className="flex-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={confirmBooking}
                            disabled={booking}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {booking ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Booking...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirm
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                          <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Session Booked!
                          </h3>
                          <p className="text-slate-600 dark:text-slate-300">
                            Your session has been successfully booked. You'll receive a confirmation email shortly.
                          </p>
                        </div>
                        <Button
                          onClick={closeBookingModal}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Book Another Session
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
