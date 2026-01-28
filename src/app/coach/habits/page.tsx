'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Search, 
  Filter, 
  Plus, 
  Edit,
  Trash2,
  Copy,
  Users,
  Calendar,
  Activity,
  Star,
  Award,
  Zap,
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  AlertCircle,
  Flame,
  Layers,
  Target,
  Clock,
  CheckCircle,
  Eye,
  MessageCircle,
  Send,
  BarChart3,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Library,
  Tag,
  SortAsc,
  Grid,
  List,
  MoreVertical,
  X
} from 'lucide-react'
import { 
  Habit, 
  HabitCategory 
} from '@/lib/habitTracker'
import { supabase } from '@/lib/supabase'

export default function CoachHabitsManagement() {
  const { user } = useAuth()
  const { getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()

  // State management
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [clients, setClients] = useState<any[]>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState('library')
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedHabitForAssign, setSelectedHabitForAssign] = useState<Habit | null>(null)
  
  // Form states
  const [habitForm, setHabitForm] = useState({
    name: '',
    description: '',
    category_id: '',
    frequency_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    target_value: '',
    unit: '',
    icon: '🎯',
    color: '#8B5CF6',
    is_public: true
  })

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    client_id: '',
    custom_name: '',
    custom_description: '',
    target_value: '',
    start_date: '',
    reminder_time: '09:00',
    reminder_enabled: true
  })

  // Multi-step assignment state
  const [assignmentStep, setAssignmentStep] = useState(1)
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [habitSearchTerm, setHabitSearchTerm] = useState('')
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [habitCategoryFilter, setHabitCategoryFilter] = useState('all')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [assignmentSettings, setAssignmentSettings] = useState({
    start_date: new Date().toISOString().split('T')[0],
    reminder_time: '09:00',
    reminder_enabled: true,
    custom_target_values: {} as Record<string, string>
  })

  // Progress tracking state
  const [selectedClientForProgress, setSelectedClientForProgress] = useState('all')
  const [progressDateRange, setProgressDateRange] = useState('30')
  const [progressView, setProgressView] = useState<'calendar' | 'charts' | 'list'>('calendar')
  const [userHabits, setUserHabits] = useState<any[]>([])
  const [habitEntries, setHabitEntries] = useState<Record<string, any[]>>({})
  const [progressStats, setProgressStats] = useState<any>({})

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Load habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (habitsError) throw habitsError
      setHabits(habitsData || [])

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('habit_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'client')
        .order('first_name')

      if (clientsError) throw clientsError
      setClients(clientsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      // Set mock data for demonstration
      setHabits([
        {
          id: '1',
          coach_id: user?.id || '',
          category_id: '1',
          name: 'Drink Water',
          description: 'Stay hydrated by drinking enough water throughout the day',
          icon: '💧',
          color: '#3B82F6',
          frequency_type: 'daily',
          target_value: 8,
          unit: 'glasses',
          is_public: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          coach_id: user?.id || '',
          category_id: '2',
          name: 'Morning Meditation',
          description: 'Start your day with 10 minutes of mindfulness meditation',
          icon: '🧘',
          color: '#10B981',
          frequency_type: 'daily',
          target_value: 10,
          unit: 'minutes',
          is_public: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          coach_id: user?.id || '',
          category_id: '3',
          name: 'Strength Training',
          description: 'Complete strength training workouts 3 times per week',
          icon: '💪',
          color: '#F59E0B',
          frequency_type: 'weekly',
          target_value: 3,
          unit: 'sessions',
          is_public: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      
      setCategories([
        {
          id: '1',
          name: 'Health & Wellness',
          description: 'Habits related to physical and mental health',
          icon: '❤️',
          color: '#EF4444',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Mindfulness',
          description: 'Habits for mental clarity and emotional well-being',
          icon: '🧘',
          color: '#10B981',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Fitness',
          description: 'Physical exercise and movement habits',
          icon: '💪',
          color: '#F59E0B',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper functions
  const getFilteredHabits = () => {
    return habits.filter(habit => {
      const matchesSearch = habit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           habit.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || habit.category_id === selectedCategory
      return matchesSearch && matchesCategory
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'category':
          return a.category_id.localeCompare(b.category_id)
        default:
          return 0
      }
    })
  }

  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)
  }

  const getFrequencyLabel = (frequency: string, targetValue: number) => {
    switch (frequency) {
      case 'daily':
        return `Daily (${targetValue}x)`
      case 'weekly':
        return `${targetValue}x per week`
      case 'monthly':
        return `${targetValue}x per month`
      default:
        return frequency
    }
  }

  const getCategoryColor = (categoryId: string) => {
    const category = getCategoryById(categoryId)
    return category?.color || '#8B5CF6'
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = getCategoryById(categoryId)
    return category?.icon || '🎯'
  }

  // Form handlers
  const resetForm = () => {
    setHabitForm({
      name: '',
      description: '',
      category_id: '',
      frequency_type: 'daily',
      target_value: '',
      unit: '',
      icon: '🎯',
      color: '#8B5CF6',
      is_public: true
    })
    setEditingHabit(null)
  }

  const createHabit = async () => {
    if (!user || !habitForm.name.trim()) return

    try {
      const newHabit: Habit = {
        id: Date.now().toString(),
        coach_id: user?.id || '',
        category_id: habitForm.category_id,
        name: habitForm.name,
        description: habitForm.description,
        icon: habitForm.icon,
        color: habitForm.color,
        frequency_type: habitForm.frequency_type,
        target_value: parseFloat(habitForm.target_value) || 1,
        unit: habitForm.unit,
        is_public: habitForm.is_public,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setHabits(prev => [newHabit, ...prev])
      resetForm()
      setCreateDialogOpen(false)
      alert('Habit template created successfully!')
    } catch (error) {
      console.error('Error creating habit:', error)
      alert('Error creating habit template')
    }
  }

  const updateHabit = async () => {
    if (!editingHabit) return

    try {
      const updatedHabit = {
        ...editingHabit,
        name: habitForm.name,
        description: habitForm.description,
        category_id: habitForm.category_id,
        frequency_type: habitForm.frequency_type,
        target_value: parseFloat(habitForm.target_value) || 1,
        unit: habitForm.unit,
        icon: habitForm.icon,
        color: habitForm.color,
        is_public: habitForm.is_public,
        updated_at: new Date().toISOString()
      }

      setHabits(prev => prev.map(h => h.id === editingHabit.id ? updatedHabit : h))
      resetForm()
      setCreateDialogOpen(false)
      alert('Habit template updated successfully!')
    } catch (error) {
      console.error('Error updating habit:', error)
      alert('Error updating habit template')
    }
  }

  const deleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit template?')) return

    try {
      setHabits(prev => prev.filter(h => h.id !== habitId))
      alert('Habit template deleted successfully!')
    } catch (error) {
      console.error('Error deleting habit:', error)
      alert('Error deleting habit template')
    }
  }

  const duplicateHabit = (habit: Habit) => {
    const duplicatedHabit = {
      ...habit,
      id: Date.now().toString(),
      name: `${habit.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setHabits(prev => [duplicatedHabit, ...prev])
    alert('Habit template duplicated successfully!')
  }

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit)
    setHabitForm({
      name: habit.name,
      description: habit.description || '',
      category_id: habit.category_id,
      frequency_type: habit.frequency_type,
      target_value: habit.target_value.toString(),
      unit: habit.unit,
      icon: habit.icon,
      color: habit.color,
      is_public: habit.is_public
    })
    setCreateDialogOpen(true)
  }

  const openAssignDialog = (habit: Habit) => {
    setSelectedHabitForAssign(habit)
    setAssignmentForm({
      client_id: '',
      custom_name: habit.name,
      custom_description: habit.description || '',
      target_value: habit.target_value.toString(),
      start_date: new Date().toISOString().split('T')[0],
      reminder_time: '09:00',
      reminder_enabled: true
    })
    setAssignDialogOpen(true)
  }

  const assignHabit = async () => {
    if (!selectedHabitForAssign || !assignmentForm.client_id) return

    try {
      // In a real app, this would create a UserHabit record
      alert(`Habit "${selectedHabitForAssign.name}" assigned to client successfully!`)
      setAssignDialogOpen(false)
      setSelectedHabitForAssign(null)
    } catch (error) {
      console.error('Error assigning habit:', error)
      alert('Error assigning habit to client')
    }
  }

  // Multi-step assignment helper functions
  const getFilteredHabitsForAssignment = () => {
    return habits.filter(habit => {
      const matchesSearch = habit.name.toLowerCase().includes(habitSearchTerm.toLowerCase()) ||
                           habit.description?.toLowerCase().includes(habitSearchTerm.toLowerCase())
      const matchesCategory = habitCategoryFilter === 'all' || habit.category_id === habitCategoryFilter
      return matchesSearch && matchesCategory
    })
  }

  const getFilteredClientsForAssignment = () => {
    return clients.filter(client => {
      const matchesSearch = `${client.first_name} ${client.last_name}`.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                           client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
      // In a real app, you'd filter by client status here
      return matchesSearch
    })
  }

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    )
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const selectAllHabits = () => {
    const filteredHabits = getFilteredHabitsForAssignment()
    setSelectedHabits(filteredHabits.map(h => h.id))
  }

  const deselectAllHabits = () => {
    setSelectedHabits([])
  }

  const selectAllClients = () => {
    const filteredClients = getFilteredClientsForAssignment()
    setSelectedClients(filteredClients.map(c => c.id))
  }

  const deselectAllClients = () => {
    setSelectedClients([])
  }

  const resetAssignment = () => {
    setAssignmentStep(1)
    setSelectedHabits([])
    setSelectedClients([])
    setHabitSearchTerm('')
    setClientSearchTerm('')
    setHabitCategoryFilter('all')
    setClientStatusFilter('all')
    setAssignmentSettings({
      start_date: new Date().toISOString().split('T')[0],
      reminder_time: '09:00',
      reminder_enabled: true,
      custom_target_values: {}
    })
  }

  const confirmAssignment = async () => {
    if (selectedHabits.length === 0 || selectedClients.length === 0) {
      alert('Please select at least one habit and one client')
      return
    }

    try {
      // In a real app, this would create UserHabit records for each client-habit combination
      const habitNames = selectedHabits.map(id => habits.find(h => h.id === id)?.name).join(', ')
      const clientNames = selectedClients.map(id => {
        const client = clients.find(c => c.id === id)
        return client ? `${client.first_name} ${client.last_name}` : ''
      }).join(', ')
      
      alert(`Successfully assigned ${selectedHabits.length} habit(s) to ${selectedClients.length} client(s)!`)
      resetAssignment()
    } catch (error) {
      console.error('Error assigning habits:', error)
      alert('Error assigning habits to clients')
    }
  }

  const getSelectedHabitsData = () => {
    return selectedHabits.map(id => habits.find(h => h.id === id)).filter(Boolean) as Habit[]
  }

  const getSelectedClientsData = () => {
    return selectedClients.map(id => clients.find(c => c.id === id)).filter(Boolean)
  }

  // Progress tracking helper functions
  const generateMockUserHabits = () => {
    if (selectedClientForProgress === 'all') return []
    
    const client = clients.find(c => c.id === selectedClientForProgress)
    if (!client) return []

    // Generate mock user habits for the selected client
    return habits.slice(0, 3).map(habit => ({
      id: `user-habit-${habit.id}-${client.id}`,
      user_id: client.id,
      habit_id: habit.id,
      coach_id: user?.id || '',
      custom_name: habit.name,
      custom_description: habit.description,
      target_value: habit.target_value,
      frequency_type: habit.frequency_type,
      is_active: true,
      start_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: null,
      reminder_time: '09:00',
      reminder_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      habit: habit,
      streak: {
        current: Math.floor(Math.random() * 10),
        longest: Math.floor(Math.random() * 20) + 10
      }
    }))
  }

  const generateMockHabitEntries = (userHabit: any) => {
    const entries = []
    const startDate = new Date(userHabit.start_date)
    const days = parseInt(progressDateRange)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      // Generate realistic completion data
      const isCompleted = Math.random() > 0.3 // 70% completion rate
      const value = isCompleted ? userHabit.target_value : Math.floor(Math.random() * userHabit.target_value)
      
      entries.push({
        id: `entry-${userHabit.id}-${i}`,
        user_habit_id: userHabit.id,
        date: date.toISOString().split('T')[0],
        value: value,
        is_completed: isCompleted,
        notes: isCompleted ? 'Great job!' : '',
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      })
    }
    
    return entries
  }

  const calculateProgressStats = (userHabits: any[], habitEntries: Record<string, any[]>) => {
    if (userHabits.length === 0) {
      return {
        totalHabits: 0,
        overallCompletionRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        totalTargets: 0
      }
    }

    let totalCompletions = 0
    let totalTargets = 0
    let currentStreak = 0
    let longestStreak = 0

    userHabits.forEach(userHabit => {
      const entries = habitEntries[userHabit.id] || []
      const completedEntries = entries.filter(entry => entry.is_completed)
      
      totalCompletions += completedEntries.length
      totalTargets += entries.length
      
      // Calculate streaks
      let streak = 0
      let maxStreak = 0
      
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].is_completed) {
          streak++
          maxStreak = Math.max(maxStreak, streak)
        } else {
          if (streak > 0) break
        }
      }
      
      currentStreak = Math.max(currentStreak, streak)
      longestStreak = Math.max(longestStreak, maxStreak)
    })

    return {
      totalHabits: userHabits.length,
      overallCompletionRate: totalTargets > 0 ? Math.round((totalCompletions / totalTargets) * 100) : 0,
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      totalCompletions: totalCompletions,
      totalTargets: totalTargets
    }
  }

  const getHabitCompletionRate = (userHabit: any) => {
    const entries = habitEntries[userHabit.id] || []
    const completedEntries = entries.filter(entry => entry.is_completed)
    return entries.length > 0 ? Math.round((completedEntries.length / entries.length) * 100) : 0
  }

  const getHabitTrend = (userHabit: any) => {
    const entries = habitEntries[userHabit.id] || []
    if (entries.length < 7) return 'stable'
    
    const recent = entries.slice(-7)
    const older = entries.slice(-14, -7)
    
    const recentRate = recent.filter(e => e.is_completed).length / recent.length
    const olderRate = older.length > 0 ? older.filter(e => e.is_completed).length / older.length : recentRate
    
    if (recentRate > olderRate + 0.1) return 'improving'
    if (recentRate < olderRate - 0.1) return 'declining'
    return 'stable'
  }

  const getCalendarData = () => {
    const data: Record<string, { completed: number; total: number; habits: string[] }> = {}
    
    Object.values(habitEntries).flat().forEach(entry => {
      if (!data[entry.date]) {
        data[entry.date] = { completed: 0, total: 0, habits: [] }
      }
      data[entry.date].total++
      if (entry.is_completed) {
        data[entry.date].completed++
      }
    })
    
    return data
  }

  const getChartData = () => {
    const days = parseInt(progressDateRange)
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      let completed = 0
      let total = 0
      
      Object.values(habitEntries).forEach(entries => {
        const dayEntries = entries.filter(e => e.date === dateStr)
        total += dayEntries.length
        completed += dayEntries.filter(e => e.is_completed).length
      })
      
      data.push({
        date: dateStr,
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0
      })
    }
    
    return data
  }

  // Load progress data when client changes
  useEffect(() => {
    if (selectedClientForProgress !== 'all') {
      const mockUserHabits = generateMockUserHabits()
      setUserHabits(mockUserHabits)
      
      const entries: Record<string, any[]> = {}
      mockUserHabits.forEach(userHabit => {
        entries[userHabit.id] = generateMockHabitEntries(userHabit)
      })
      setHabitEntries(entries)
      
      const stats = calculateProgressStats(mockUserHabits, entries)
      setProgressStats(stats)
    } else {
      setUserHabits([])
      setHabitEntries({})
      setProgressStats({})
    }
  }, [selectedClientForProgress, progressDateRange, habits, clients, user])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="animate-pulse">
            <div className="h-64 bg-slate-200 dark:bg-slate-800"></div>
            <div className="p-6 space-y-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className={`${theme.card} rounded-2xl p-6`}>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                  <div className="space-y-4">
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  </div>
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
        <div className="relative px-6 pb-16 pt-10">
          <div className="max-w-7xl mx-auto space-y-6">
            <GlassCard className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <Badge className="fc-badge fc-badge-strong w-fit">Habit Studio</Badge>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                      <Library className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold text-[color:var(--fc-text-primary)]">
                        Habits Management
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Build habit templates, assign routines, and track client consistency.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <GlassCard className="p-2">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-transparent h-14">
                  <TabsTrigger 
                    value="library" 
                    className="rounded-xl text-sm font-semibold text-[color:var(--fc-text-primary)] data-[state=active]:bg-[color:var(--fc-surface)]"
                  >
                    <Library className="w-4 h-4 mr-2" />
                    Habit Library
                  </TabsTrigger>
                  <TabsTrigger 
                    value="create" 
                    className="rounded-xl text-sm font-semibold text-[color:var(--fc-text-primary)] data-[state=active]:bg-[color:var(--fc-surface)]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Habit
                  </TabsTrigger>
                  <TabsTrigger 
                    value="assign" 
                    className="rounded-xl text-sm font-semibold text-[color:var(--fc-text-primary)] data-[state=active]:bg-[color:var(--fc-surface)]"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Assign to Clients
                  </TabsTrigger>
                  <TabsTrigger 
                    value="progress" 
                    className="rounded-xl text-sm font-semibold text-[color:var(--fc-text-primary)] data-[state=active]:bg-[color:var(--fc-surface)]"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Progress Tracking
                  </TabsTrigger>
                </TabsList>
              </GlassCard>

              {/* Habit Library Tab */}
              <TabsContent value="library" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                {/* Search and Filters */}
                <GlassCard className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
                        <Input
                          placeholder="Search habits by name or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="fc-input h-12 w-full pl-12"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="fc-select h-12 w-48">
                            <Tag className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <span>{category.icon}</span>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="fc-select h-12 w-48">
                            <SortAsc className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="created">Date Created</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex gap-1">
                          <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="rounded-xl"
                          >
                            <Grid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="rounded-xl"
                          >
                            <List className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                </GlassCard>

                {/* Habits Grid/List */}
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {getFilteredHabits().map(habit => {
                    const category = getCategoryById(habit.category_id)
                    
                    return (
                      <Card key={habit.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                                style={{ backgroundColor: habit.color + '20' }}
                              >
                                {habit.icon}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className={`text-xl font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                    {habit.name}
                                  </h3>
                                  <Badge 
                                    variant="outline" 
                                    className="rounded-xl"
                                    style={{ borderColor: habit.color, color: habit.color }}
                                  >
                                    {category?.name || 'Uncategorized'}
                                  </Badge>
                                </div>
                                
                                {habit.description && (
                                  <p className={`${theme.textSecondary} text-sm leading-relaxed mb-3`}>
                                    {habit.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span className={`${theme.textSecondary}`}>
                                      {getFrequencyLabel(habit.frequency_type, habit.target_value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4 text-green-500" />
                                    <span className={`${theme.textSecondary}`}>
                                      {habit.target_value} {habit.unit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(habit)}
                                className="rounded-xl"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateHabit(habit)}
                                className="rounded-xl"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAssignDialog(habit)}
                                className="rounded-xl"
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHabit(habit.id)}
                                className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(habit)}
                              className="flex-1 rounded-xl"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateHabit(habit)}
                              className="rounded-xl"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(habit)}
                              className="rounded-xl"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteHabit(habit.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {getFilteredHabits().length === 0 && (
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardContent className="p-12 text-center">
                      <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                        <Library className="w-12 h-12 text-white" />
                      </div>
                      <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                        {habits.length === 0 ? 'No habit templates yet' : 'No habits found'}
                      </h3>
                      <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                        {habits.length === 0 
                          ? 'Start by creating habit templates for your clients to build healthy routines.'
                          : 'Try adjusting your search criteria or filters.'
                        }
                      </p>
                      <Button 
                        onClick={() => setActiveTab('create')}
                        className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                      >
                        <Plus className="w-5 h-5 mr-3" />
                        Create Habit Template
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Create Habit Tab */}
              <TabsContent value="create" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                <div className="max-w-4xl mx-auto">
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${theme.gradient} ${theme.shadow}`}>
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                          {editingHabit ? 'Edit Habit Template' : 'Create New Habit Template'}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="habit-name" className={`text-base font-semibold ${theme.text}`}>
                            Habit Name *
                          </Label>
                          <Input
                            id="habit-name"
                            value={habitForm.name}
                            onChange={(e) => setHabitForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Drink Water, Morning Meditation"
                            className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="category" className={`text-base font-semibold ${theme.text}`}>
                            Category *
                          </Label>
                          <Select value={habitForm.category_id} onValueChange={(value) => 
                            setHabitForm(prev => ({ ...prev, category_id: value }))
                          }>
                            <SelectTrigger className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{category.icon}</span>
                                    <span>{category.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="habit-description" className={`text-base font-semibold ${theme.text}`}>
                          Description
                        </Label>
                        <Textarea
                          id="habit-description"
                          value={habitForm.description}
                          onChange={(e) => setHabitForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the habit and its benefits..."
                          rows={3}
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="frequency" className={`text-base font-semibold ${theme.text}`}>
                            Frequency *
                          </Label>
                          <Select value={habitForm.frequency_type} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                            setHabitForm(prev => ({ ...prev, frequency_type: value }))
                          }>
                            <SelectTrigger className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="target-value" className={`text-base font-semibold ${theme.text}`}>
                            Target Value *
                          </Label>
                          <Input
                            id="target-value"
                            type="number"
                            value={habitForm.target_value}
                            onChange={(e) => setHabitForm(prev => ({ ...prev, target_value: e.target.value }))}
                            placeholder="1"
                            className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="unit" className={`text-base font-semibold ${theme.text}`}>
                            Unit *
                          </Label>
                          <Input
                            id="unit"
                            value={habitForm.unit}
                            onChange={(e) => setHabitForm(prev => ({ ...prev, unit: e.target.value }))}
                            placeholder="glasses, minutes, reps"
                            className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="icon" className={`text-base font-semibold ${theme.text}`}>
                            Icon
                          </Label>
                          <Input
                            id="icon"
                            value={habitForm.icon}
                            onChange={(e) => setHabitForm(prev => ({ ...prev, icon: e.target.value }))}
                            placeholder="🎯"
                            className={`h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="color" className={`text-base font-semibold ${theme.text}`}>
                            Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="color"
                              type="color"
                              value={habitForm.color}
                              onChange={(e) => setHabitForm(prev => ({ ...prev, color: e.target.value }))}
                              className="w-16 h-12 rounded-xl border-0"
                            />
                            <Input
                              value={habitForm.color}
                              onChange={(e) => setHabitForm(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="#8B5CF6"
                              className={`flex-1 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-public"
                          checked={habitForm.is_public}
                          onChange={(e) => setHabitForm(prev => ({ ...prev, is_public: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <Label htmlFor="is-public" className={`text-sm ${theme.text}`}>
                          Make this habit template public for other coaches
                        </Label>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={resetForm}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={editingHabit ? updateHabit : createHabit}
                          className={`${theme.gradient} ${theme.shadow} rounded-xl`}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editingHabit ? 'Update Habit' : 'Create Habit'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Assign to Clients Tab */}
              <TabsContent value="assign" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                <div className="max-w-6xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <h2 className={`text-3xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                        Assign Habits to Clients
                      </h2>
                    </div>
                    <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                      Select habit templates and assign them to your clients with custom parameters
                    </p>
                  </div>

                  {/* Progress Steps */}
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        {[1, 2, 3].map((step) => (
                          <div key={step} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              assignmentStep >= step 
                                ? `${theme.gradient} text-white ${theme.shadow}` 
                                : `${theme.textSecondary} ${theme.border} border-2`
                            }`}>
                              {step}
                            </div>
                            {step < 3 && (
                              <div className={`w-16 h-1 mx-4 rounded-full ${
                                assignmentStep > step ? theme.gradient : theme.border
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-4 text-sm">
                        <span className={`${assignmentStep >= 1 ? theme.text : theme.textSecondary}`}>Select Habits</span>
                        <span className={`${assignmentStep >= 2 ? theme.text : theme.textSecondary}`}>Select Clients</span>
                        <span className={`${assignmentStep >= 3 ? theme.text : theme.textSecondary}`}>Review & Assign</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 1: Select Habits */}
                  {assignmentStep === 1 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                              <Target className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 1: Select Habits</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-xl">
                              {selectedHabits.length} selected
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectedHabits.length === getFilteredHabitsForAssignment().length ? deselectAllHabits : selectAllHabits}
                              className="rounded-xl"
                            >
                              {selectedHabits.length === getFilteredHabitsForAssignment().length ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Search and Filters */}
                        <div className="flex flex-col lg:flex-row gap-4">
                          <div className="flex-1 relative">
                            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                            <Input
                              placeholder="Search habits by name or description..."
                              value={habitSearchTerm}
                              onChange={(e) => setHabitSearchTerm(e.target.value)}
                              className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                            />
                          </div>
                          
                          <Select value={habitCategoryFilter} onValueChange={setHabitCategoryFilter}>
                            <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                              <Tag className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{category.icon}</span>
                                    <span>{category.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Habits Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getFilteredHabitsForAssignment().map(habit => {
                            const category = getCategoryById(habit.category_id)
                            const isSelected = selectedHabits.includes(habit.id)
                            
                            return (
                              <Card 
                                key={habit.id} 
                                className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                                    : 'hover:scale-105 hover:shadow-xl'
                                }`}
                                onClick={() => toggleHabitSelection(habit.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                        style={{ backgroundColor: habit.color + '20' }}
                                      >
                                        {habit.icon}
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`text-lg font-bold ${theme.text} truncate`}>
                                          {habit.name}
                                        </h3>
                                        {isSelected && (
                                          <CheckCircle className="w-5 h-5 text-purple-600" />
                                        )}
                                      </div>
                                      
                                      {habit.description && (
                                        <p className={`${theme.textSecondary} text-sm line-clamp-2 mb-2`}>
                                          {habit.description}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-2 text-xs">
                                        <Badge 
                                          variant="outline" 
                                          className="rounded-lg"
                                          style={{ borderColor: habit.color, color: habit.color }}
                                        >
                                          {category?.name || 'Uncategorized'}
                                        </Badge>
                                        <span className={`${theme.textSecondary}`}>
                                          {getFrequencyLabel(habit.frequency_type, habit.target_value)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>

                        {getFilteredHabitsForAssignment().length === 0 && (
                          <div className="text-center py-12">
                            <div className={`p-4 rounded-2xl ${theme.gradient} ${theme.shadow} w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                              <Search className="w-8 h-8 text-white" />
                            </div>
                            <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>No habits found</h3>
                            <p className={`${theme.textSecondary}`}>Try adjusting your search criteria or create new habits.</p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            onClick={() => setAssignmentStep(2)}
                            disabled={selectedHabits.length === 0}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Next Step
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 2: Select Clients */}
                  {assignmentStep === 2 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 2: Select Clients</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-xl">
                              {selectedClients.length} selected
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectedClients.length === getFilteredClientsForAssignment().length ? deselectAllClients : selectAllClients}
                              className="rounded-xl"
                            >
                              {selectedClients.length === getFilteredClientsForAssignment().length ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Search and Filters */}
                        <div className="flex flex-col lg:flex-row gap-4">
                          <div className="flex-1 relative">
                            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                            <Input
                              placeholder="Search clients by name or email..."
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                            />
                          </div>
                          
                          <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                            <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                              <Filter className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="All Clients" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Clients</SelectItem>
                              <SelectItem value="active">Active Clients</SelectItem>
                              <SelectItem value="inactive">Inactive Clients</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Clients Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getFilteredClientsForAssignment().map(client => {
                            const isSelected = selectedClients.includes(client.id)
                            
                            return (
                              <Card 
                                key={client.id} 
                                className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                                    : 'hover:scale-105 hover:shadow-xl'
                                }`}
                                onClick={() => toggleClientSelection(client.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow} flex items-center justify-center text-white font-bold`}>
                                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`text-lg font-bold ${theme.text} truncate`}>
                                          {client.first_name} {client.last_name}
                                        </h3>
                                        {isSelected && (
                                          <CheckCircle className="w-5 h-5 text-purple-600" />
                                        )}
                                      </div>
                                      
                                      <p className={`${theme.textSecondary} text-sm truncate`}>
                                        {client.email}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>

                        {getFilteredClientsForAssignment().length === 0 && (
                          <div className="text-center py-12">
                            <div className={`p-4 rounded-2xl ${theme.gradient} ${theme.shadow} w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                              <Users className="w-8 h-8 text-white" />
                            </div>
                            <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>No clients found</h3>
                            <p className={`${theme.textSecondary}`}>Try adjusting your search criteria.</p>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setAssignmentStep(1)}
                            className="rounded-xl px-8 py-3 text-base font-semibold"
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => setAssignmentStep(3)}
                            disabled={selectedClients.length === 0}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Next Step
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Review & Assign */}
                  {assignmentStep === 3 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 3: Review & Assign</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Assignment Summary */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Selected Habits */}
                          <div className="space-y-4">
                            <h3 className={`text-lg font-semibold ${theme.text}`}>Selected Habits ({selectedHabits.length})</h3>
                            <div className="space-y-3">
                              {getSelectedHabitsData().map(habit => {
                                const category = getCategoryById(habit.category_id)
                                return (
                                  <div key={habit.id} className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                        style={{ backgroundColor: habit.color + '20' }}
                                      >
                                        {habit.icon}
                                      </div>
                                      <div className="flex-1">
                                        <h4 className={`font-semibold ${theme.text}`}>{habit.name}</h4>
                                        <p className={`text-sm ${theme.textSecondary}`}>
                                          {category?.name} • {getFrequencyLabel(habit.frequency_type, habit.target_value)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Selected Clients */}
                          <div className="space-y-4">
                            <h3 className={`text-lg font-semibold ${theme.text}`}>Selected Clients ({selectedClients.length})</h3>
                            <div className="space-y-3">
                              {getSelectedClientsData().map(client => (
                                <div key={client.id} className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm`}>
                                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className={`font-semibold ${theme.text}`}>
                                        {client.first_name} {client.last_name}
                                      </h4>
                                      <p className={`text-sm ${theme.textSecondary}`}>{client.email}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Assignment Settings */}
                        <div className="space-y-4">
                          <h3 className={`text-lg font-semibold ${theme.text}`}>Assignment Settings</h3>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="assignment-start-date" className={`${theme.text}`}>Start Date</Label>
                              <Input
                                id="assignment-start-date"
                                type="date"
                                value={assignmentSettings.start_date}
                                onChange={(e) => setAssignmentSettings(prev => ({ ...prev, start_date: e.target.value }))}
                                className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                              />
                            </div>
                            <div>
                              <Label htmlFor="assignment-reminder-time" className={`${theme.text}`}>Reminder Time</Label>
                              <Input
                                id="assignment-reminder-time"
                                type="time"
                                value={assignmentSettings.reminder_time}
                                onChange={(e) => setAssignmentSettings(prev => ({ ...prev, reminder_time: e.target.value }))}
                                className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <input
                                type="checkbox"
                                id="assignment-reminder-enabled"
                                checked={assignmentSettings.reminder_enabled}
                                onChange={(e) => setAssignmentSettings(prev => ({ ...prev, reminder_enabled: e.target.checked }))}
                                className="w-4 h-4 rounded"
                              />
                              <Label htmlFor="assignment-reminder-enabled" className={`text-sm ${theme.text}`}>
                                Enable reminders
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setAssignmentStep(2)}
                            className="rounded-xl px-8 py-3 text-base font-semibold"
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Previous
                          </Button>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={resetAssignment}
                              className="rounded-xl px-8 py-3 text-base font-semibold"
                            >
                              Start Over
                            </Button>
                            <Button
                              onClick={confirmAssignment}
                              className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold`}
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Confirm Assignment
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Progress Tracking Tab */}
              <TabsContent value="progress" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                <div className="max-w-7xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <h2 className={`text-3xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                        Habit Progress Tracking
                      </h2>
                    </div>
                    <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                      Monitor client habit completion and adherence with detailed analytics
                    </p>
                  </div>

                  {/* Controls */}
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <Select value={selectedClientForProgress} onValueChange={setSelectedClientForProgress}>
                            <SelectTrigger className="w-full h-12 rounded-xl">
                              <Users className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="Select Client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Clients</SelectItem>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs`}>
                                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                                    </div>
                                    <span>{client.first_name} {client.last_name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex-1">
                          <Select value={progressDateRange} onValueChange={setProgressDateRange}>
                            <SelectTrigger className="w-full h-12 rounded-xl">
                              <Calendar className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">Last 7 Days</SelectItem>
                              <SelectItem value="30">Last 30 Days</SelectItem>
                              <SelectItem value="90">Last 90 Days</SelectItem>
                              <SelectItem value="365">All Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant={progressView === 'calendar' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setProgressView('calendar')}
                            className="rounded-xl"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Calendar
                          </Button>
                          <Button
                            variant={progressView === 'charts' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setProgressView('charts')}
                            className="rounded-xl"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Charts
                          </Button>
                          <Button
                            variant={progressView === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setProgressView('list')}
                            className="rounded-xl"
                          >
                            <List className="w-4 h-4 mr-2" />
                            List
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedClientForProgress === 'all' ? (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardContent className="p-12 text-center">
                        <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                          <BarChart3 className="w-12 h-12 text-white" />
                        </div>
                        <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>Select a Client to View Progress</h3>
                        <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                          Choose a specific client to view their habit completion progress and analytics.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Progress Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-blue-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                <Target className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{progressStats.totalHabits}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Total Habits</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  Assigned to client
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-green-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{progressStats.overallCompletionRate}%</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Completion Rate</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  {progressStats.totalCompletions} of {progressStats.totalTargets} completed
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-orange-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                <Flame className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{progressStats.currentStreak}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Current Streak</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  Days in a row
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-purple-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                <Award className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{progressStats.longestStreak}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Best Streak</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  Longest streak
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Progress Views */}
                      {progressView === 'calendar' && (
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                <Calendar className="w-5 h-5 text-white" />
                              </div>
                              <CardTitle className={`text-xl font-bold ${theme.text}`}>Habit Calendar</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="grid grid-cols-7 gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className={`text-center text-sm font-semibold ${theme.textSecondary} p-2`}>
                                  {day}
                                </div>
                              ))}
                              {Array.from({ length: 35 }, (_, i) => {
                                const date = new Date()
                                date.setDate(date.getDate() - (34 - i))
                                const dateStr = date.toISOString().split('T')[0]
                                const dayData = getCalendarData()[dateStr]
                                const isToday = dateStr === new Date().toISOString().split('T')[0]
                                
                                return (
                                  <div
                                    key={i}
                                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                                      dayData
                                        ? dayData.completed === dayData.total
                                          ? 'bg-green-500 text-white'
                                          : dayData.completed > 0
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-red-500 text-white'
                                        : isToday
                                        ? `${theme.border} border-2 ${theme.text}`
                                        : `${theme.textSecondary} ${theme.border}`
                                    }`}
                                  >
                                    {dayData ? `${dayData.completed}/${dayData.total}` : date.getDate()}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-6">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                <span className={`text-sm ${theme.textSecondary}`}>All completed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                                <span className={`text-sm ${theme.textSecondary}`}>Partially completed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-500"></div>
                                <span className={`text-sm ${theme.textSecondary}`}>Not completed</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {progressView === 'charts' && (
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                <BarChart3 className="w-5 h-5 text-white" />
                              </div>
                              <CardTitle className={`text-xl font-bold ${theme.text}`}>Progress Trends</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="h-64 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                              <div className="flex items-end justify-between h-full gap-1">
                                {getChartData().slice(-14).map((point, index) => (
                                  <div key={index} className="flex-1 flex flex-col items-center">
                                    <div
                                      className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-sm"
                                      style={{ height: `${Math.max(4, (point.rate / 100) * 200)}px` }}
                                      title={`${point.date}: ${point.rate}% completion`}
                                    />
                                    {index % 3 === 0 && (
                                      <div className="text-xs text-slate-500 mt-2">
                                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {progressView === 'list' && (
                        <div className="space-y-6">
                          <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                            <CardHeader className="p-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                  <List className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className={`text-xl font-bold ${theme.text}`}>Habit Details</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              <div className="space-y-4">
                                {userHabits.map(userHabit => {
                                  const completionRate = getHabitCompletionRate(userHabit)
                                  const trend = getHabitTrend(userHabit)
                                  
                                  return (
                                    <div key={userHabit.id} className={`p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <div 
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                                            style={{ backgroundColor: userHabit.habit.color + '20' }}
                                          >
                                            {userHabit.habit.icon}
                                          </div>
                                          
                                          <div className="flex-1">
                                            <h3 className={`text-lg font-bold ${theme.text}`}>{userHabit.custom_name}</h3>
                                            <p className={`text-sm ${theme.textSecondary}`}>
                                              {getFrequencyLabel(userHabit.frequency_type, userHabit.target_value)}
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="text-center">
                                            <div className={`text-2xl font-bold ${theme.text}`}>{completionRate}%</div>
                                            <div className={`text-xs ${theme.textSecondary}`}>Completion</div>
                                          </div>
                                          
                                          <div className="text-center">
                                            <div className={`text-2xl font-bold ${theme.text}`}>{userHabit.streak.current}</div>
                                            <div className={`text-xs ${theme.textSecondary}`}>Current Streak</div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            {trend === 'improving' ? (
                                              <TrendingUp className="w-5 h-5 text-green-500" />
                                            ) : trend === 'declining' ? (
                                              <TrendingDown className="w-5 h-5 text-red-500" />
                                            ) : (
                                              <Activity className="w-5 h-5 text-blue-500" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                              trend === 'improving' ? 'text-green-600' :
                                              trend === 'declining' ? 'text-red-600' :
                                              'text-blue-600'
                                            }`}>
                                              {trend === 'improving' ? 'Improving' :
                                               trend === 'declining' ? 'Declining' :
                                               'Stable'}
                                            </span>
                                          </div>
                                          
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl"
                                          >
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Message
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-2">
                                          <span className={`${theme.textSecondary}`}>Progress</span>
                                          <span className={`font-semibold ${theme.text}`}>{completionRate}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                          <div
                                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${completionRate}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Create/Edit Habit Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl max-w-2xl`}>
            <DialogHeader>
              <DialogTitle className={`${theme.text}`}>
                {editingHabit ? 'Edit Habit Template' : 'Create New Habit Template'}
              </DialogTitle>
              <DialogDescription className={`${theme.textSecondary}`}>
                {editingHabit ? 'Update the habit template details.' : 'Create a new habit template for your clients.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dialog-habit-name" className={`${theme.text}`}>Habit Name</Label>
                  <Input
                    id="dialog-habit-name"
                    value={habitForm.name}
                    onChange={(e) => setHabitForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Drink Water"
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-category" className={`${theme.text}`}>Category</Label>
                  <Select value={habitForm.category_id} onValueChange={(value) => 
                    setHabitForm(prev => ({ ...prev, category_id: value }))
                  }>
                    <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="dialog-description" className={`${theme.text}`}>Description</Label>
                <Textarea
                  id="dialog-description"
                  value={habitForm.description}
                  onChange={(e) => setHabitForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the habit..."
                  rows={3}
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dialog-frequency" className={`${theme.text}`}>Frequency</Label>
                  <Select value={habitForm.frequency_type} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                    setHabitForm(prev => ({ ...prev, frequency_type: value }))
                  }>
                    <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dialog-target" className={`${theme.text}`}>Target Value</Label>
                  <Input
                    id="dialog-target"
                    type="number"
                    value={habitForm.target_value}
                    onChange={(e) => setHabitForm(prev => ({ ...prev, target_value: e.target.value }))}
                    placeholder="1"
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-unit" className={`${theme.text}`}>Unit</Label>
                  <Input
                    id="dialog-unit"
                    value={habitForm.unit}
                    onChange={(e) => setHabitForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="glasses"
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
              </div>
              <Button 
                onClick={editingHabit ? updateHabit : createHabit} 
                className={`w-full ${theme.gradient} ${theme.shadow} rounded-xl`}
              >
                {editingHabit ? 'Update Habit' : 'Create Habit'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Habit Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl max-w-2xl`}>
            <DialogHeader>
              <DialogTitle className={`${theme.text}`}>Assign Habit to Client</DialogTitle>
              <DialogDescription className={`${theme.textSecondary}`}>
                Assign "{selectedHabitForAssign?.name}" to a client with custom parameters.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="assign-client" className={`${theme.text}`}>Select Client</Label>
                <Select value={assignmentForm.client_id} onValueChange={(value) => 
                  setAssignmentForm(prev => ({ ...prev, client_id: value }))
                }>
                  <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assign-custom-name" className={`${theme.text}`}>Custom Name (Optional)</Label>
                  <Input
                    id="assign-custom-name"
                    value={assignmentForm.custom_name}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, custom_name: e.target.value }))}
                    placeholder={selectedHabitForAssign?.name}
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="assign-start-date" className={`${theme.text}`}>Start Date</Label>
                  <Input
                    id="assign-start-date"
                    type="date"
                    value={assignmentForm.start_date}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="assign-custom-description" className={`${theme.text}`}>Custom Description (Optional)</Label>
                <Textarea
                  id="assign-custom-description"
                  value={assignmentForm.custom_description}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, custom_description: e.target.value }))}
                  placeholder={selectedHabitForAssign?.description}
                  rows={3}
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
              <Button 
                onClick={assignHabit} 
                className={`w-full ${theme.gradient} ${theme.shadow} rounded-xl`}
              >
                <Users className="w-4 h-4 mr-2" />
                Assign Habit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}