'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Award,
  Plus,
  Users,
  Search,
  Save,
  Edit,
  Trash2,
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Star,
  Medal,
  Flame,
  Calendar,
  RefreshCw,
  Settings,
  CheckCircle,
  Dumbbell,
  Activity,
  Heart,
  Apple,
  Scale,
  Timer,
  Repeat,
  BarChart3,
  Crown,
  Sparkles,
  Shield,
  ChevronRight,
  Layers
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AchievementTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  value: number
  points: number
}

interface AchievementTemplate {
  id: string
  name: string
  description: string
  icon: string
  type: 'milestone' | 'goal' | 'streak' | 'personal_record'
  trigger_type: 'workout_count' | 'weight_loss' | 'streak_days' | 'meal_log_count' | 'strength_gain' | 'custom'
  is_tiered: boolean
  tiers?: AchievementTier[]
  single_value?: number
  single_points?: number
  is_active: boolean
  created_at: string
}

interface ClientAchievement {
  id: string
  client_id: string
  achievement_id: string
  tier?: string
  earned_at: string
  client?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
  achievement?: AchievementTemplate
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

const iconOptions = [
  { value: 'trophy', label: 'Trophy', icon: Trophy },
  { value: 'medal', label: 'Medal', icon: Medal },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'crown', label: 'Crown', icon: Crown },
  { value: 'flame', label: 'Flame', icon: Flame },
  { value: 'zap', label: 'Lightning', icon: Zap },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'dumbbell', label: 'Dumbbell', icon: Dumbbell },
  { value: 'heart', label: 'Heart', icon: Heart },
]

const triggerOptions = [
  { value: 'workout_count', label: 'Complete Workouts', description: 'Triggered after completing X workouts' },
  { value: 'streak_days', label: 'Workout Streak', description: 'Triggered after X consecutive days' },
  { value: 'weight_loss', label: 'Weight Loss', description: 'Triggered after losing X kg/lbs' },
  { value: 'meal_log_count', label: 'Meal Logs', description: 'Triggered after logging X meals' },
  { value: 'strength_gain', label: 'Strength Gain', description: 'Triggered after increasing weight by X%' },
  { value: 'custom', label: 'Custom Trigger', description: 'Manual trigger by coach' },
]

const tierColors = {
  bronze: { 
    bg: 'bg-orange-100', 
    text: 'text-orange-800', 
    darkBg: 'dark:bg-orange-900/30', 
    darkText: 'dark:text-orange-400',
    gradient: 'from-orange-600 to-orange-500',
    iconBg: 'bg-gradient-to-br from-orange-600 to-orange-500'
  },
  silver: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-800', 
    darkBg: 'dark:bg-gray-900/30', 
    darkText: 'dark:text-gray-400',
    gradient: 'from-gray-400 to-gray-500',
    iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500'
  },
  gold: { 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-800', 
    darkBg: 'dark:bg-yellow-900/30', 
    darkText: 'dark:text-yellow-400',
    gradient: 'from-yellow-500 to-yellow-600',
    iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600'
  },
  platinum: { 
    bg: 'bg-cyan-100', 
    text: 'text-cyan-800', 
    darkBg: 'dark:bg-cyan-900/30', 
    darkText: 'dark:text-cyan-400',
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600'
  },
  diamond: { 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    darkBg: 'dark:bg-blue-900/30', 
    darkText: 'dark:text-blue-400',
    gradient: 'from-blue-600 to-purple-600',
    iconBg: 'bg-gradient-to-br from-blue-600 to-purple-600'
  },
}

const defaultTiers: AchievementTier[] = [
  { tier: 'bronze', value: 1, points: 50 },
  { tier: 'silver', value: 10, points: 100 },
  { tier: 'gold', value: 50, points: 250 },
  { tier: 'platinum', value: 100, points: 500 },
  { tier: 'diamond', value: 500, points: 1000 },
]

export default function CoachAchievements() {
  const { getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()
  
  const [achievementTemplates, setAchievementTemplates] = useState<AchievementTemplate[]>([])
  const [clientAchievements, setClientAchievements] = useState<ClientAchievement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showEditTemplate, setShowEditTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<AchievementTemplate | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [activeTab, setActiveTab] = useState('templates')

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    icon: 'trophy',
    type: 'milestone' as 'milestone' | 'goal' | 'streak' | 'personal_record',
    trigger_type: 'workout_count' as 'workout_count' | 'weight_loss' | 'streak_days' | 'meal_log_count' | 'strength_gain' | 'custom',
    is_tiered: true,
    tiers: [...defaultTiers],
    single_value: 10,
    single_points: 100,
    is_active: true
  })

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load achievement templates with sample tiered data
      setAchievementTemplates([
        {
          id: '1',
          name: 'Workout Master',
          description: 'Complete workouts and progress through the tiers',
          icon: 'dumbbell',
          type: 'milestone',
          trigger_type: 'workout_count',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 1, points: 50 },
            { tier: 'silver', value: 10, points: 100 },
            { tier: 'gold', value: 50, points: 250 },
            { tier: 'platinum', value: 100, points: 500 },
            { tier: 'diamond', value: 500, points: 1000 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Streak Legend',
          description: 'Maintain workout streaks',
          icon: 'flame',
          type: 'streak',
          trigger_type: 'streak_days',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 3, points: 50 },
            { tier: 'silver', value: 7, points: 100 },
            { tier: 'gold', value: 30, points: 300 },
            { tier: 'platinum', value: 90, points: 750 },
            { tier: 'diamond', value: 365, points: 2000 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Weight Loss Champion',
          description: 'Progressive weight loss achievements',
          icon: 'star',
          type: 'goal',
          trigger_type: 'weight_loss',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 2, points: 100 },
            { tier: 'silver', value: 5, points: 200 },
            { tier: 'gold', value: 10, points: 400 },
            { tier: 'platinum', value: 20, points: 800 },
            { tier: 'diamond', value: 50, points: 2000 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Nutrition Tracker',
          description: 'Track your meals consistently',
          icon: 'heart',
          type: 'milestone',
          trigger_type: 'meal_log_count',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 7, points: 50 },
            { tier: 'silver', value: 30, points: 150 },
            { tier: 'gold', value: 100, points: 400 },
            { tier: 'platinum', value: 365, points: 1000 },
            { tier: 'diamond', value: 1000, points: 2500 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Strength Gains',
          description: 'Increase your maximum lift weight',
          icon: 'crown',
          type: 'personal_record',
          trigger_type: 'strength_gain',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 10, points: 100 },
            { tier: 'silver', value: 25, points: 200 },
            { tier: 'gold', value: 50, points: 400 },
            { tier: 'platinum', value: 100, points: 800 },
            { tier: 'diamond', value: 200, points: 1500 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '6',
          name: 'Cardio King',
          description: 'Complete cardio workouts and build endurance',
          icon: 'zap',
          type: 'milestone',
          trigger_type: 'workout_count',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 5, points: 50 },
            { tier: 'silver', value: 25, points: 150 },
            { tier: 'gold', value: 75, points: 350 },
            { tier: 'platinum', value: 150, points: 700 },
            { tier: 'diamond', value: 500, points: 1500 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '7',
          name: 'Consistency Champion',
          description: 'Stay consistent with your training schedule',
          icon: 'target',
          type: 'streak',
          trigger_type: 'streak_days',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 5, points: 75 },
            { tier: 'silver', value: 14, points: 150 },
            { tier: 'gold', value: 60, points: 400 },
            { tier: 'platinum', value: 180, points: 1000 },
            { tier: 'diamond', value: 730, points: 3000 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '8',
          name: 'Body Transformation',
          description: 'Transform your body composition',
          icon: 'trophy',
          type: 'goal',
          trigger_type: 'weight_loss',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 1, points: 50 },
            { tier: 'silver', value: 3, points: 150 },
            { tier: 'gold', value: 7, points: 350 },
            { tier: 'platinum', value: 15, points: 750 },
            { tier: 'diamond', value: 30, points: 1800 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '9',
          name: 'Meal Prep Master',
          description: 'Master your nutrition planning',
          icon: 'shield',
          type: 'milestone',
          trigger_type: 'meal_log_count',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 14, points: 75 },
            { tier: 'silver', value: 60, points: 200 },
            { tier: 'gold', value: 180, points: 500 },
            { tier: 'platinum', value: 500, points: 1200 },
            { tier: 'diamond', value: 1500, points: 3000 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '10',
          name: 'Power Lifter',
          description: 'Dominate the weights and get stronger',
          icon: 'medal',
          type: 'personal_record',
          trigger_type: 'strength_gain',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 5, points: 50 },
            { tier: 'silver', value: 15, points: 150 },
            { tier: 'gold', value: 35, points: 350 },
            { tier: 'platinum', value: 75, points: 750 },
            { tier: 'diamond', value: 150, points: 1800 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '11',
          name: 'Dedication Master',
          description: 'Show unwavering dedication to your fitness journey',
          icon: 'sparkles',
          type: 'streak',
          trigger_type: 'streak_days',
          is_tiered: true,
          tiers: [
            { tier: 'bronze', value: 10, points: 100 },
            { tier: 'silver', value: 21, points: 200 },
            { tier: 'gold', value: 45, points: 450 },
            { tier: 'platinum', value: 120, points: 900 },
            { tier: 'diamond', value: 500, points: 2500 },
          ],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '12',
          name: 'Early Bird',
          description: 'Complete your first morning workout',
          icon: 'sparkles',
          type: 'milestone',
          trigger_type: 'custom',
          is_tiered: false,
          single_value: 1,
          single_points: 75,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '13',
          name: 'Night Owl',
          description: 'Complete your first evening workout',
          icon: 'medal',
          type: 'milestone',
          trigger_type: 'custom',
          is_tiered: false,
          single_value: 1,
          single_points: 75,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '14',
          name: 'Weekend Warrior',
          description: 'Train hard on the weekends',
          icon: 'shield',
          type: 'milestone',
          trigger_type: 'custom',
          is_tiered: false,
          single_value: 1,
          single_points: 100,
          is_active: true,
          created_at: new Date().toISOString()
        },
      ])

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('client_id')
        .eq('coach_id', user.id)
        .eq('status', 'active')

      if (clientsError) {
        console.log('Clients error:', clientsError)
        setClients([])
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

        try {
          const { data: achievementsData, error: achievementsError } = await supabase
            .from('achievements')
            .select('*')
            .in('client_id', clientIds)
            .order('achieved_at', { ascending: false })

          if (achievementsError) {
            console.log('Achievements table error:', achievementsError)
            setClientAchievements([])
          } else if (achievementsData) {
            const achievementsWithClients = achievementsData.map(achievement => ({
              ...achievement,
              client: profilesData?.find(p => p.id === achievement.client_id)
            }))

            setClientAchievements(achievementsWithClients)
          }
        } catch (error) {
          console.log('Achievements table error:', error)
          setClientAchievements([])
        }
      } else {
        setClients([])
        setClientAchievements([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setAchievementTemplates([])
      setClientAchievements([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName)
    return iconOption ? iconOption.icon : Trophy
  }

  const getTierBadge = (tier: string) => {
    const colors = tierColors[tier as keyof typeof tierColors]
    if (!colors) return <Badge>{tier}</Badge>
    
    return (
      <Badge className={`${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} capitalize`}>
        {tier}
      </Badge>
    )
  }

  const getTriggerLabel = (triggerType: string, value: number) => {
    switch (triggerType) {
      case 'workout_count':
        return `${value} workout${value > 1 ? 's' : ''}`
      case 'streak_days':
        return `${value} day${value > 1 ? 's' : ''}`
      case 'weight_loss':
        return `${value}kg`
      case 'meal_log_count':
        return `${value} meal${value > 1 ? 's' : ''}`
      case 'strength_gain':
        return `+${value}%`
      case 'custom':
        return 'Manual'
      default:
        return `${value}`
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Milestone</Badge>
      case 'goal':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Goal</Badge>
      case 'streak':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Streak</Badge>
      case 'personal_record':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Personal Record</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const updateTierValue = (tierIndex: number, field: 'value' | 'points', newValue: number) => {
    setTemplateForm(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, idx) => 
        idx === tierIndex ? { ...tier, [field]: newValue } : tier
      )
    }))
  }

  const filteredTemplates = achievementTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || template.type === filterType

    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
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
        <div className="min-h-screen">
        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-8">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-normal pb-1">
                  Gamification System
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Create tiered achievements that automatically reward clients for their progress
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{achievementTemplates.filter(a => a.is_tiered).length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Tiered Achievements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{achievementTemplates.filter(a => !a.is_tiered).length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Single Achievements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{achievementTemplates.filter(a => a.is_active).length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active Templates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{clients.length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                  <Input
                    placeholder="Search achievement templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="goal">Goal</SelectItem>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="personal_record">Personal Record</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg px-6 py-3">
                    <Plus className="w-5 h-5" />
                    Create Achievement
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button
                variant="outline"
                onClick={loadData}
                className={`${theme.border} ${theme.text} hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl px-6 py-3`}
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Achievement Templates Grid */}
            <div className="space-y-6">
              <h2 className={`text-2xl font-bold ${theme.text} flex items-center gap-3`}>
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                Achievement Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => {
                  const IconComponent = getIconComponent(template.icon)
                  return (
                    <Card key={template.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg relative">
                                  <IconComponent className="w-6 h-6 text-white" />
                                  {template.is_tiered && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                      <Layers className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className={`text-lg font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                    {template.name}
                                  </h3>
                                  {template.is_tiered && (
                                    <p className={`text-xs ${theme.textSecondary}`}>
                                      5 Tiers • {template.tiers?.[0]?.points} - {template.tiers?.[4]?.points} pts
                                    </p>
                                  )}
                                  {!template.is_tiered && (
                                    <p className={`text-xs ${theme.textSecondary}`}>
                                      {template.single_points} points
                                    </p>
                                  )}
                                </div>
                              </div>
                              <p className={`text-sm ${theme.textSecondary} mb-3`}>
                                {template.description}
                              </p>
                              
                              {/* Tiered Progress */}
                              {template.is_tiered && template.tiers && (
                                <div className="space-y-2 mb-3">
                                  {/* Tier Icons in Color */}
                                  <div className="flex items-center gap-1">
                                    {template.tiers.map((tier, idx) => {
                                      const IconComponent = getIconComponent(template.icon)
                                      const colors = tierColors[tier.tier as keyof typeof tierColors]
                                      return (
                                        <div key={tier.tier} className="flex-1 flex justify-center">
                                          <div className={`p-1.5 rounded-lg ${colors.iconBg} shadow-md transform hover:scale-110 transition-all duration-200`}>
                                            <IconComponent className="w-3.5 h-3.5 text-white" />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {/* Tier Labels */}
                                  <div className="flex items-center gap-1 text-xs">
                                    {template.tiers.map((tier, idx) => (
                                      <div key={tier.tier} className="flex-1 text-center">
                                        {getTierBadge(tier.tier)}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Tier Values */}
                                  <div className="flex items-center gap-1 text-xs font-mono">
                                    {template.tiers.map((tier, idx) => (
                                      <div key={`val-${tier.tier}`} className={`flex-1 text-center ${theme.textSecondary}`}>
                                        {getTriggerLabel(template.trigger_type, tier.value)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Single Achievement */}
                              {!template.is_tiered && (
                                <div className={`text-xs ${theme.textSecondary} bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-3`}>
                                  <Zap className="w-3 h-3 inline mr-1" />
                                  {getTriggerLabel(template.trigger_type, template.single_value || 0)}
                                </div>
                              )}

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`${theme.textSecondary} text-xs`}>Type:</span>
                                  {getTypeBadge(template.type)}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`${theme.textSecondary} text-xs`}>Status:</span>
                                  {template.is_active ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Active</Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 text-xs">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template)
                                setTemplateForm({
                                  name: template.name,
                                  description: template.description,
                                  icon: template.icon,
                                  type: template.type,
                                  trigger_type: template.trigger_type,
                                  is_tiered: template.is_tiered,
                                  tiers: template.tiers || [...defaultTiers],
                                  single_value: template.single_value || 10,
                                  single_points: template.single_points || 100,
                                  is_active: template.is_active
                                })
                                setShowEditTemplate(true)
                              }}
                              className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Configure
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Create/Edit Template Modal */}
            <Dialog open={showCreateTemplate || showEditTemplate} onOpenChange={(open) => {
              setShowCreateTemplate(open && showCreateTemplate)
              setShowEditTemplate(open && showEditTemplate)
            }}>
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[85vh] !w-[min(650px,95vw)] !m-0 !p-0 overflow-hidden`} style={{
                backgroundColor: theme.card.includes('dark') ? '#1E1E1E' : '#FFFFFF',
                border: theme.card.includes('dark') ? '1px solid #374151' : '1px solid #E5E7EB',
                boxShadow: theme.card.includes('dark') 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>
                      {showCreateTemplate ? 'Create Achievement Template' : 'Edit Achievement Template'}
                    </DialogTitle>
                    <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                      Configure an achievement with multiple tiers or as a single achievement
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                  <div>
                    <Label htmlFor="name" className={`${theme.text}`}>Achievement Name</Label>
                    <Input
                      id="name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Workout Master"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className={`${theme.text}`}>Description</Label>
                    <Textarea
                      id="description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the achievement..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="icon" className={`${theme.text}`}>Icon</Label>
                      <Select value={templateForm.icon} onValueChange={(value) => setTemplateForm(prev => ({ ...prev, icon: value }))}>
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(option => {
                            const IconComp = option.icon
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <IconComp className="w-4 h-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type" className={`${theme.text}`}>Type</Label>
                      <Select value={templateForm.type} onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="goal">Goal</SelectItem>
                          <SelectItem value="streak">Streak</SelectItem>
                          <SelectItem value="personal_record">PR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="trigger_type" className={`${theme.text}`}>Trigger</Label>
                      <Select value={templateForm.trigger_type} onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, trigger_type: value }))}>
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tiered Toggle */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <input
                      type="checkbox"
                      id="is_tiered"
                      checked={templateForm.is_tiered}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, is_tiered: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_tiered" className={`${theme.text} cursor-pointer flex items-center gap-2`}>
                      <Layers className="w-4 h-4" />
                      Enable Tiered Progression (Bronze → Silver → Gold → Platinum → Diamond)
                    </Label>
                  </div>

                  {/* Tiered Configuration */}
                  {templateForm.is_tiered && (
                    <div className="space-y-3">
                      <Label className={`${theme.text} font-semibold`}>Tier Configuration</Label>
                      {templateForm.tiers.map((tier, idx) => (
                        <div key={tier.tier} className="grid grid-cols-3 gap-3 items-center p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30">
                          <div>
                            {getTierBadge(tier.tier)}
                          </div>
                          <div>
                            <Label className={`${theme.textSecondary} text-xs`}>Value</Label>
                            <Input
                              type="number"
                              value={tier.value}
                              onChange={(e) => updateTierValue(idx, 'value', parseInt(e.target.value) || 0)}
                              className={`${theme.border} ${theme.text} bg-white dark:bg-gray-900 rounded-lg h-8`}
                            />
                          </div>
                          <div>
                            <Label className={`${theme.textSecondary} text-xs`}>Points</Label>
                            <Input
                              type="number"
                              value={tier.points}
                              onChange={(e) => updateTierValue(idx, 'points', parseInt(e.target.value) || 0)}
                              className={`${theme.border} ${theme.text} bg-white dark:bg-gray-900 rounded-lg h-8`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Single Achievement Configuration */}
                  {!templateForm.is_tiered && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="single_value" className={`${theme.text}`}>Trigger Value</Label>
                        <Input
                          id="single_value"
                          type="number"
                          value={templateForm.single_value}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, single_value: parseInt(e.target.value) || 0 }))}
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="single_points" className={`${theme.text}`}>Points Reward</Label>
                        <Input
                          id="single_points"
                          type="number"
                          value={templateForm.single_points}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, single_points: parseInt(e.target.value) || 0 }))}
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={templateForm.is_active}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className={`${theme.text} cursor-pointer`}>
                      Active (automatically awarded when trigger is met)
                    </Label>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Button 
                    onClick={() => {
                      alert('Achievement template saved! Clients will now earn this achievement automatically as they progress.')
                      setShowCreateTemplate(false)
                      setShowEditTemplate(false)
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                    disabled={!templateForm.name || !templateForm.description}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {showCreateTemplate ? 'Create Achievement' : 'Update Achievement'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowCreateTemplate(false)
                    setShowEditTemplate(false)
                  }} className={`${theme.border} ${theme.text} rounded-xl`}>
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
