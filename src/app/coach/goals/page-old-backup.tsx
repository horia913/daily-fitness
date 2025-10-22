'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Award,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Activity,
  Star,
  Copy,
  UserPlus,
  Filter,
  SortAsc,
  Search,
  Zap,
  BarChart3,
  Flame,
  Trophy,
  Eye,
  MessageCircle,
  Send,
  Flag,
  Timer,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Heart,
  AlertTriangle,
  TrendingDown,
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Goal {
  id: string
  client_id: string
  client_name: string
  title: string
  description: string
  target_value: number
  current_value: number
  unit: string
  target_date: string
  status: 'active' | 'completed' | 'paused'
  category: 'weight' | 'strength' | 'endurance' | 'body_composition' | 'general'
  created_at: string
  progress_percentage: number
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function CoachGoals() {
  const { user } = useAuth()
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  
  // Enhanced filtering and search
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')
  
  // Track Progress state
  const [selectedClientForTracking, setSelectedClientForTracking] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [progressData, setProgressData] = useState<Record<string, any[]>>({})
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  
  // Form states
  const [goalForm, setGoalForm] = useState({
    client_id: '',
    title: '',
    description: '',
    target_value: '',
    current_value: '',
    unit: '',
    target_date: '',
    start_date: '',
    category: 'general' as Goal['category']
  })

  // Enhanced form states
  const [formStep, setFormStep] = useState(1)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showSMARTGuidance, setShowSMARTGuidance] = useState(true)
  const [milestones, setMilestones] = useState<Array<{id: string, title: string, target_value: string, target_date: string}>>([])
  const [reminders, setReminders] = useState({
    enabled: false,
    frequency: 'weekly',
    time: '09:00'
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      await Promise.all([
        loadGoals(),
        loadClients()
      ])
    } catch {
      console.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Enhanced filtering and sorting functions
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClient = selectedClient === 'all' || goal.client_id === selectedClient
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus
    
    return matchesSearch && matchesClient && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      case 'progress-high':
        return b.progress_percentage - a.progress_percentage
      case 'progress-low':
        return a.progress_percentage - b.progress_percentage
      case 'deadline-soon':
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      default:
        return 0
    }
  })

  // Duplicate goal function
  const handleDuplicateGoal = async (goal: Goal) => {
    if (!user) return

    setLoading(true)
    try {
      const newGoal: Goal = {
        ...goal,
        id: Date.now().toString(),
        title: `${goal.title} (Copy)`,
        created_at: new Date().toISOString(),
        progress_percentage: 0,
        current_value: 0
      }

      setGoals(prev => [...prev, newGoal])
      alert('Goal duplicated successfully!')
    } catch {
      console.error('Error duplicating goal')
      alert('Error duplicating goal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send encouragement function
  const handleSendEncouragement = (goal: Goal) => {
    // This would integrate with the messaging system
    alert(`Sending encouragement message to ${goal.client_name} about their goal: ${goal.title}`)
  }

  const loadGoals = async () => {
    try {
      // Get all clients first
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'client')

      if (clientsError) throw clientsError

      // For now, use placeholder data since we don't have a goals table yet
      const placeholderGoals: Goal[] = [
        {
          id: '1',
          client_id: clientsData?.[0]?.id || '1',
          client_name: clientsData?.[0] ? `${clientsData[0].first_name} ${clientsData[0].last_name}` : 'Jane Doe',
          title: 'Lose 10kg',
          description: 'Target weight loss for improved health and fitness',
          target_value: 10,
          current_value: 6.5,
          unit: 'kg',
          target_date: '2024-12-31',
          status: 'active',
          category: 'weight',
          created_at: '2024-01-15',
          progress_percentage: 65
        },
        {
          id: '2',
          client_id: clientsData?.[1]?.id || '2',
          client_name: clientsData?.[1] ? `${clientsData[1].first_name} ${clientsData[1].last_name}` : 'John Smith',
          title: 'Bench Press 100kg',
          description: 'Increase bench press strength to 100kg',
          target_value: 100,
          current_value: 85,
          unit: 'kg',
          target_date: '2024-11-30',
          status: 'active',
          category: 'strength',
          created_at: '2024-02-01',
          progress_percentage: 85
        },
        {
          id: '3',
          client_id: clientsData?.[2]?.id || '3',
          client_name: clientsData?.[2] ? `${clientsData[2].first_name} ${clientsData[2].last_name}` : 'Sarah Wilson',
          title: 'Run 5K in 25 minutes',
          description: 'Improve running endurance and speed',
          target_value: 25,
          current_value: 28,
          unit: 'minutes',
          target_date: '2024-10-15',
          status: 'active',
          category: 'endurance',
          created_at: '2024-03-10',
          progress_percentage: 89
        }
      ]

      setGoals(placeholderGoals)
    } catch (error) {
      console.error('Error loading goals:', error)
      setGoals([])
    }
  }

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'client')
      .order('first_name')

    if (error) {
      console.error('Error loading clients:', error)
      return
    }
    setClients(data || [])
  }

  const createGoal = async () => {
    if (!validateForm()) return

    // For now, just add to local state since we don't have a goals table yet
    const newGoal: Goal = {
      id: Date.now().toString(),
      client_id: goalForm.client_id,
      client_name: clients.find(c => c.id === goalForm.client_id)?.first_name + ' ' + clients.find(c => c.id === goalForm.client_id)?.last_name || 'Unknown Client',
      title: goalForm.title,
      description: goalForm.description,
      target_value: parseFloat(goalForm.target_value) || 0,
      current_value: parseFloat(goalForm.current_value) || 0,
      unit: goalForm.unit,
      target_date: goalForm.target_date,
      status: 'active',
      category: goalForm.category,
      created_at: new Date().toISOString(),
      progress_percentage: parseFloat(goalForm.current_value) / parseFloat(goalForm.target_value) * 100
    }

    setGoals(prev => [...prev, newGoal])
    resetForm()
    setActiveTab('overview')
    alert('Goal created successfully!')
  }

  const updateGoal = async () => {
    if (!editingGoal) return

    const updatedGoal = {
      ...editingGoal,
      title: goalForm.title,
      description: goalForm.description,
      target_value: parseFloat(goalForm.target_value) || 0,
      current_value: parseFloat(goalForm.current_value) || 0,
      unit: goalForm.unit,
      target_date: goalForm.target_date,
      category: goalForm.category,
      progress_percentage: parseFloat(goalForm.current_value) / parseFloat(goalForm.target_value) * 100
    }

    setGoals(prev => prev.map(g => g.id === editingGoal.id ? updatedGoal : g))
    setEditingGoal(null)
    setGoalForm({ client_id: '', title: '', description: '', target_value: '', current_value: '', unit: '', target_date: '', category: 'general' })
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    setGoals(prev => prev.filter(g => g.id !== goalId))
  }

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      client_id: goal.client_id,
      title: goal.title,
      description: goal.description,
      target_value: goal.target_value.toString(),
      current_value: goal.current_value.toString(),
      unit: goal.unit,
      target_date: goal.target_date,
      category: goal.category
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      weight: 'bg-blue-100 text-blue-600',
      strength: 'bg-red-100 text-red-600',
      endurance: 'bg-green-100 text-green-600',
      body_composition: 'bg-purple-100 text-purple-600',
      general: 'bg-gray-100 text-gray-600'
    }
    return colors[category as keyof typeof colors] || colors.general
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-600',
      completed: 'bg-blue-100 text-blue-600',
      paused: 'bg-yellow-100 text-yellow-600'
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Overview analytics helper functions
  const getOverviewStats = () => {
    const totalGoals = goals.length
    const activeGoals = goals.filter(g => g.status === 'active').length
    const completedGoals = goals.filter(g => g.status === 'completed').length
    const pausedGoals = goals.filter(g => g.status === 'paused').length
    
    const onTrackGoals = goals.filter(g => g.status === 'active' && g.progress_percentage >= 60).length
    const atRiskGoals = goals.filter(g => g.status === 'active' && g.progress_percentage < 40).length
    const overdueGoals = goals.filter(g => {
      const targetDate = new Date(g.target_date)
      const today = new Date()
      return g.status === 'active' && targetDate < today && g.progress_percentage < 100
    }).length
    
    const recentlyCompleted = goals.filter(g => {
      const completedDate = new Date(g.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return g.status === 'completed' && completedDate >= thirtyDaysAgo
    }).length

    const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress_percentage, 0) / totalGoals) : 0

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      pausedGoals,
      onTrackGoals,
      atRiskGoals,
      overdueGoals,
      recentlyCompleted,
      avgProgress
    }
  }

  const getClientGoalSummary = () => {
    const clientGoals = clients.map(client => {
      const clientGoalList = goals.filter(g => g.client_id === client.id)
      const activeClientGoals = clientGoalList.filter(g => g.status === 'active')
      const completedClientGoals = clientGoalList.filter(g => g.status === 'completed')
      const avgProgress = clientGoalList.length > 0 
        ? Math.round(clientGoalList.reduce((acc, g) => acc + g.progress_percentage, 0) / clientGoalList.length)
        : 0

      return {
        client,
        totalGoals: clientGoalList.length,
        activeGoals: activeClientGoals.length,
        completedGoals: completedClientGoals.length,
        avgProgress,
        goals: clientGoalList
      }
    }).filter(cg => cg.totalGoals > 0)

    return clientGoals
  }

  const getGoalTrends = () => {
    // Mock trend data for demonstration
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (11 - i))
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        goalsCreated: Math.floor(Math.random() * 5) + 1,
        goalsCompleted: Math.floor(Math.random() * 3) + 1,
        avgProgress: Math.floor(Math.random() * 40) + 40
      }
    })

    return last12Months
  }

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getGoalPriorityColor = (goal: Goal) => {
    const daysUntilDeadline = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    if (goal.status === 'completed') return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    if (daysUntilDeadline < 0) return 'text-red-600 bg-red-100 dark:bg-red-900/20'
    if (daysUntilDeadline <= 7) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
    if (goal.progress_percentage < 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
  }

  const getGoalPriorityLabel = (goal: Goal) => {
    const daysUntilDeadline = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    if (goal.status === 'completed') return 'Completed'
    if (daysUntilDeadline < 0) return 'Overdue'
    if (daysUntilDeadline <= 7) return 'Due Soon'
    if (goal.progress_percentage < 40) return 'Needs Attention'
    return 'On Track'
  }

  // Enhanced create goal helper functions
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!goalForm.client_id) errors.client_id = 'Please select a client'
    if (!goalForm.title.trim()) errors.title = 'Goal title is required'
    if (!goalForm.target_value || parseFloat(goalForm.target_value) <= 0) errors.target_value = 'Target value must be greater than 0'
    if (!goalForm.unit.trim()) errors.unit = 'Unit is required'
    if (!goalForm.target_date) errors.target_date = 'Target date is required'
    if (!goalForm.start_date) errors.start_date = 'Start date is required'
    
    // Validate dates
    if (goalForm.start_date && goalForm.target_date) {
      const startDate = new Date(goalForm.start_date)
      const targetDate = new Date(goalForm.target_date)
      if (startDate >= targetDate) {
        errors.target_date = 'Target date must be after start date'
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setGoalForm({
      client_id: '',
      title: '',
      description: '',
      target_value: '',
      current_value: '',
      unit: '',
      target_date: '',
      start_date: '',
      category: 'general'
    })
    setFormStep(1)
    setFormErrors({})
    setMilestones([])
    setReminders({ enabled: false, frequency: 'weekly', time: '09:00' })
  }

  const addMilestone = () => {
    const newMilestone = {
      id: Date.now().toString(),
      title: '',
      target_value: '',
      target_date: ''
    }
    setMilestones(prev => [...prev, newMilestone])
  }

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  const updateMilestone = (id: string, field: string, value: string) => {
    setMilestones(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ))
  }

  const getSMARTGuidance = (field: string) => {
    const guidance = {
      title: 'Specific: Is this goal clearly defined and specific?',
      description: 'Measurable: Can progress be tracked and measured?',
      target_value: 'Achievable: Is this target realistic and attainable?',
      target_date: 'Time-bound: Is there a clear deadline for completion?',
      category: 'Relevant: Does this align with the client\'s overall fitness goals?'
    }
    return guidance[field as keyof typeof guidance] || ''
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      weight: '⚖️',
      strength: '💪',
      endurance: '🏃',
      body_composition: '📊',
      general: '🎯'
    }
    return icons[category as keyof typeof icons] || '🎯'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      weight: 'from-blue-500 to-blue-600',
      strength: 'from-red-500 to-red-600',
      endurance: 'from-green-500 to-green-600',
      body_composition: 'from-purple-500 to-purple-600',
      general: 'from-gray-500 to-gray-600'
    }
    return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600'
  }

  // Track Progress helper functions
  const getFilteredGoalsForTracking = () => {
    return goals.filter(goal => {
      if (selectedClientForTracking === 'all') return true
      return goal.client_id === selectedClientForTracking
    })
  }

  const getProgressTrend = (goal: Goal) => {
    // Mock trend calculation - in real app, this would use historical data
    const trend = Math.random() > 0.5 ? 'up' : 'down'
    return trend
  }

  const getProgressStatus = (goal: Goal) => {
    const daysUntilDeadline = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    if (goal.status === 'completed') return { status: 'completed', color: 'text-green-600 bg-green-100 dark:bg-green-900/20', label: 'Completed' }
    if (daysUntilDeadline < 0) return { status: 'overdue', color: 'text-red-600 bg-red-100 dark:bg-red-900/20', label: 'Overdue' }
    if (daysUntilDeadline <= 7) return { status: 'due-soon', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20', label: 'Due Soon' }
    if (goal.progress_percentage < 40) return { status: 'at-risk', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20', label: 'At Risk' }
    if (goal.progress_percentage >= 80) return { status: 'on-track', color: 'text-green-600 bg-green-100 dark:bg-green-900/20', label: 'On Track' }
    return { status: 'in-progress', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20', label: 'In Progress' }
  }

  const generateProgressData = (goal: Goal) => {
    // Mock progress data - in real app, this would come from the database
    const data = []
    const startDate = new Date(goal.created_at)
    const endDate = new Date(goal.target_date)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      const progress = Math.min(goal.progress_percentage, (i / daysDiff) * 100)
      const value = goal.current_value + (progress / 100) * (goal.target_value - goal.current_value)
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 10) / 10,
        progress: Math.round(progress)
      })
    }
    
    return data
  }

  const getProgressChartData = (goal: Goal) => {
    if (!progressData[goal.id]) {
      setProgressData(prev => ({
        ...prev,
        [goal.id]: generateProgressData(goal)
      }))
      return generateProgressData(goal)
    }
    return progressData[goal.id]
  }

  const logProgress = (goalId: string, newValue: number) => {
    // Mock progress logging - in real app, this would update the database
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const updatedGoal = {
      ...goal,
      current_value: newValue,
      progress_percentage: (newValue / goal.target_value) * 100
    }

    setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g))
    
    // Update progress data
    const newDataPoint = {
      date: new Date().toISOString().split('T')[0],
      value: newValue,
      progress: updatedGoal.progress_percentage
    }
    
    setProgressData(prev => ({
      ...prev,
      [goalId]: [...(prev[goalId] || []), newDataPoint]
    }))
  }

  const getDaysRemaining = (goal: Goal) => {
    const daysUntilDeadline = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysUntilDeadline)
  }

  const getProgressVelocity = (goal: Goal) => {
    // Mock velocity calculation - in real app, this would use historical data
    const daysRemaining = getDaysRemaining(goal)
    const progressNeeded = 100 - goal.progress_percentage
    
    if (daysRemaining === 0) return 0
    return Math.round((progressNeeded / daysRemaining) * 10) / 10
  }

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`h-64 ${theme.card} ${theme.shadow} rounded-2xl`}>
                    <div className="animate-pulse p-6">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className={`min-h-screen ${theme.background}`}>
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h1 className={`text-4xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                  Client Goals Management
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Set, track, and motivate your clients towards their fitness achievements
              </p>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className={`grid w-full grid-cols-2 lg:grid-cols-6 ${theme.card} ${theme.shadow} rounded-2xl p-2`}>
                <TabsTrigger 
                  value="overview" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="create" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Goal
                </TabsTrigger>
                <TabsTrigger 
                  value="track" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Track Progress
                </TabsTrigger>
                <TabsTrigger 
                  value="goals" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  All Goals
                </TabsTrigger>
                <TabsTrigger 
                  value="clients" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  By Client
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow} transition-all duration-200`}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                {(() => {
                  const stats = getOverviewStats()
                  const clientGoalSummary = getClientGoalSummary()
                  const trends = getGoalTrends()
                  
                  return (
                    <>
                      {/* Key Goal Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Active Goals */}
                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-purple-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                                <Target className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{stats.totalGoals}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Total Goals</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  {stats.activeGoals} active, {stats.completedGoals} completed
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Goals On Track */}
                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-green-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{stats.onTrackGoals}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>On Track</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  {stats.activeGoals > 0 ? Math.round((stats.onTrackGoals / stats.activeGoals) * 100) : 0}% of active goals
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Goals At Risk */}
                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-orange-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                                <AlertTriangle className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{stats.atRiskGoals + stats.overdueGoals}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Need Attention</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  {stats.atRiskGoals} at risk, {stats.overdueGoals} overdue
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Recently Completed */}
                        <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group border-l-4 border-l-blue-500`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                                <Trophy className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className={`text-3xl font-bold ${theme.text}`}>{stats.recentlyCompleted}</div>
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>Recently Completed</div>
                                <div className={`text-xs ${theme.textSecondary} mt-1`}>
                                  Last 30 days
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Client Goal Summary */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${theme.gradient} ${theme.shadow}`}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <h2 className={`text-2xl font-bold ${theme.text}`}>Client Goal Summary</h2>
                          </div>
                          <Badge variant="outline" className="rounded-xl">
                            {clientGoalSummary.length} clients with goals
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {clientGoalSummary.map((clientData) => (
                            <Card key={clientData.client.id} className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                              <CardHeader className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-lg">
                                      {clientData.client.first_name.charAt(0)}{clientData.client.last_name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <CardTitle className={`text-lg font-bold ${theme.text}`}>
                                      {clientData.client.first_name} {clientData.client.last_name}
                                    </CardTitle>
                                    <div className={`text-sm ${theme.textSecondary}`}>
                                      {clientData.totalGoals} goals • {clientData.avgProgress}% avg progress
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6 pt-0">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                      <div className={`text-2xl font-bold ${theme.text}`}>{clientData.activeGoals}</div>
                                      <div className={`text-xs ${theme.textSecondary}`}>Active</div>
                                    </div>
                                    <div>
                                      <div className={`text-2xl font-bold text-green-600`}>{clientData.completedGoals}</div>
                                      <div className={`text-xs ${theme.textSecondary}`}>Completed</div>
                                    </div>
                                    <div>
                                      <div className={`text-2xl font-bold ${theme.text}`}>{clientData.avgProgress}%</div>
                                      <div className={`text-xs ${theme.textSecondary}`}>Progress</div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className={`${theme.textSecondary}`}>Overall Progress</span>
                                      <span className={`font-semibold ${theme.text}`}>{clientData.avgProgress}%</span>
                                    </div>
                                    <Progress value={clientData.avgProgress} className="h-3 rounded-full" />
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                                    onClick={() => setActiveTab('clients')}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Recent Goal Activity */}
                      <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                        <CardHeader className="p-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                              <Activity className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle className={`text-xl font-bold ${theme.text}`}>Recent Goal Activity</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          <div className="space-y-4">
                            {goals.slice(0, 5).map((goal) => (
                              <div key={goal.id} className={`flex items-center gap-4 p-4 rounded-xl ${theme.card} border ${theme.border}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  goal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                                  goal.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                  'bg-yellow-100 dark:bg-yellow-900/20'
                                }`}>
                                  {goal.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                                   goal.status === 'active' ? <Target className="w-5 h-5 text-blue-600" /> :
                                   <Clock className="w-5 h-5 text-yellow-600" />}
                                </div>
                                <div className="flex-1">
                                  <div className={`font-semibold ${theme.text}`}>{goal.title}</div>
                                  <div className={`text-sm ${theme.textSecondary}`}>
                                    {goal.client_name} • {goal.progress_percentage.toFixed(1)}% complete
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`rounded-xl ${getGoalPriorityColor(goal)}`}>
                                    {getGoalPriorityLabel(goal)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(goal)}
                                    className="rounded-xl"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Actions */}
                      <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                        <CardHeader className="p-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                              <Zap className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle className={`text-xl font-bold ${theme.text}`}>Quick Actions</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                              onClick={() => setCreateDialogOpen(true)}
                              className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl p-6 h-auto flex-col gap-3`}
                            >
                              <Plus className="w-6 h-6" />
                              <span className="font-semibold">Set New Goal</span>
                              <span className="text-sm opacity-90">Create a goal for a client</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab('goals')}
                              className="rounded-xl p-6 h-auto flex-col gap-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                            >
                              <Target className="w-6 h-6" />
                              <span className="font-semibold">View All Goals</span>
                              <span className="text-sm opacity-70">Manage existing goals</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab('analytics')}
                              className="rounded-xl p-6 h-auto flex-col gap-3 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all"
                            >
                              <BarChart3 className="w-6 h-6" />
                              <span className="font-semibold">View Analytics</span>
                              <span className="text-sm opacity-70">Track goal trends</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )
                })()}
              </TabsContent>

              {/* Create Goal Tab */}
              <TabsContent value="create" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h2 className={`text-3xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                        Create New Goal
                      </h2>
                    </div>
                    <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                      Set SMART goals for your clients to track their progress and keep them motivated
                    </p>
                  </div>

                  {/* Progress Steps */}
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        {[1, 2, 3].map((step) => (
                          <div key={step} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              formStep >= step 
                                ? `${theme.gradient} text-white ${theme.shadow}` 
                                : `${theme.textSecondary} ${theme.border} border-2`
                            }`}>
                              {step}
                            </div>
                            {step < 3 && (
                              <div className={`w-16 h-1 mx-4 rounded-full ${
                                formStep > step ? theme.gradient : theme.border
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-4 text-sm">
                        <span className={`${formStep >= 1 ? theme.text : theme.textSecondary}`}>Basic Info</span>
                        <span className={`${formStep >= 2 ? theme.text : theme.textSecondary}`}>Details</span>
                        <span className={`${formStep >= 3 ? theme.text : theme.textSecondary}`}>Review</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SMART Goal Guidance Toggle */}
                  <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${theme.text}`}>SMART Goal Guidance</h3>
                            <p className={`text-sm ${theme.textSecondary}`}>Get tips for creating effective goals</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSMARTGuidance(!showSMARTGuidance)}
                          className="rounded-xl"
                        >
                          {showSMARTGuidance ? 'Hide' : 'Show'} Guidance
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form Steps */}
                  {formStep === 1 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 1: Basic Information</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Client Selector */}
                        <div className="space-y-3">
                          <Label htmlFor="client-select" className={`text-base font-semibold ${theme.text}`}>
                            Select Client *
                          </Label>
                          <Select value={goalForm.client_id} onValueChange={(value) => 
                            setGoalForm(prev => ({ ...prev, client_id: value }))
                          }>
                            <SelectTrigger className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}>
                              <Users className="w-5 h-5 mr-3" />
                              <SelectValue placeholder="Choose a client for this goal" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id} className="py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm`}>
                                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                                    </div>
                                    <span className="font-medium">{client.first_name} {client.last_name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.client_id && (
                            <p className="text-red-500 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              {formErrors.client_id}
                            </p>
                          )}
                          {showSMARTGuidance && (
                            <div className={`p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                <strong>Relevant:</strong> Choose a client whose goals align with their fitness journey and current needs.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Goal Title */}
                        <div className="space-y-3">
                          <Label htmlFor="goal-title" className={`text-base font-semibold ${theme.text}`}>
                            Goal Title *
                          </Label>
                          <Input
                            id="goal-title"
                            value={goalForm.title}
                            onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Lose 10kg, Run 5K in 30 minutes, Bench Press 100kg"
                            className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                          />
                          {formErrors.title && (
                            <p className="text-red-500 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              {formErrors.title}
                            </p>
                          )}
                          {showSMARTGuidance && (
                            <div className={`p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                <strong>Specific:</strong> {getSMARTGuidance('title')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Goal Category */}
                        <div className="space-y-3">
                          <Label htmlFor="category" className={`text-base font-semibold ${theme.text}`}>
                            Goal Category *
                          </Label>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                              { value: 'weight', label: 'Weight', icon: '⚖️' },
                              { value: 'strength', label: 'Strength', icon: '💪' },
                              { value: 'endurance', label: 'Endurance', icon: '🏃' },
                              { value: 'body_composition', label: 'Body Comp', icon: '📊' },
                              { value: 'general', label: 'General', icon: '🎯' }
                            ].map((category) => (
                              <button
                                key={category.value}
                                type="button"
                                onClick={() => setGoalForm(prev => ({ ...prev, category: category.value as Goal['category'] }))}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                  goalForm.category === category.value
                                    ? `border-purple-500 bg-purple-50 dark:bg-purple-900/20 ${theme.shadow}`
                                    : `${theme.border} hover:border-purple-300`
                                }`}
                              >
                                <div className="text-2xl mb-2">{category.icon}</div>
                                <div className={`text-sm font-medium ${theme.text}`}>{category.label}</div>
                              </button>
                            ))}
                          </div>
                          {showSMARTGuidance && (
                            <div className={`p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800`}>
                              <p className="text-sm text-purple-600 dark:text-purple-400">
                                <strong>Relevant:</strong> {getSMARTGuidance('category')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => setFormStep(2)}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold`}
                          >
                            Next Step
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formStep === 2 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 2: Goal Details</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Goal Description */}
                        <div className="space-y-3">
                          <Label htmlFor="goal-description" className={`text-base font-semibold ${theme.text}`}>
                            Goal Description
                          </Label>
                          <Textarea
                            id="goal-description"
                            value={goalForm.description}
                            onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe the goal in detail, including the rationale and expected outcomes..."
                            rows={4}
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                          />
                          {showSMARTGuidance && (
                            <div className={`p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                <strong>Measurable:</strong> {getSMARTGuidance('description')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Target Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="target-value" className={`text-base font-semibold ${theme.text}`}>
                              Target Value *
                            </Label>
                            <Input
                              id="target-value"
                              type="number"
                              value={goalForm.target_value}
                              onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                              placeholder="10"
                              className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                            />
                            {formErrors.target_value && (
                              <p className="text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {formErrors.target_value}
                              </p>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="unit" className={`text-base font-semibold ${theme.text}`}>
                              Unit *
                            </Label>
                            <Input
                              id="unit"
                              value={goalForm.unit}
                              onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                              placeholder="kg, minutes, reps, etc."
                              className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                            />
                            {formErrors.unit && (
                              <p className="text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {formErrors.unit}
                              </p>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="current-value" className={`text-base font-semibold ${theme.text}`}>
                              Current Value
                            </Label>
                            <Input
                              id="current-value"
                              type="number"
                              value={goalForm.current_value}
                              onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: e.target.value }))}
                              placeholder="0"
                              className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                            />
                          </div>
                        </div>

                        {showSMARTGuidance && (
                          <div className={`p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800`}>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              <strong>Achievable:</strong> {getSMARTGuidance('target_value')}
                            </p>
                          </div>
                        )}

                        {/* Date Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="start-date" className={`text-base font-semibold ${theme.text}`}>
                              Start Date *
                            </Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={goalForm.start_date}
                              onChange={(e) => setGoalForm(prev => ({ ...prev, start_date: e.target.value }))}
                              className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                            />
                            {formErrors.start_date && (
                              <p className="text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {formErrors.start_date}
                              </p>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="target-date" className={`text-base font-semibold ${theme.text}`}>
                              Target Date *
                            </Label>
                            <Input
                              id="target-date"
                              type="date"
                              value={goalForm.target_date}
                              onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                              className={`h-14 ${theme.border} ${theme.text} bg-transparent rounded-xl text-base`}
                            />
                            {formErrors.target_date && (
                              <p className="text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {formErrors.target_date}
                              </p>
                            )}
                          </div>
                        </div>

                        {showSMARTGuidance && (
                          <div className={`p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              <strong>Time-bound:</strong> {getSMARTGuidance('target_date')}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setFormStep(1)}
                            className="rounded-xl px-8 py-3 text-base font-semibold"
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => setFormStep(3)}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold`}
                          >
                            Next Step
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formStep === 3 && (
                    <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Step 3: Review & Create</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        {/* Goal Summary */}
                        <div className={`p-6 rounded-xl ${theme.card} border ${theme.border}`}>
                          <h3 className={`text-lg font-bold ${theme.text} mb-4`}>Goal Summary</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${getCategoryColor(goalForm.category)} ${theme.shadow} flex items-center justify-center`}>
                                <span className="text-2xl">{getCategoryIcon(goalForm.category)}</span>
                              </div>
                              <div>
                                <div className={`text-xl font-bold ${theme.text}`}>{goalForm.title}</div>
                                <div className={`text-sm ${theme.textSecondary}`}>
                                  {clients.find(c => c.id === goalForm.client_id)?.first_name} {clients.find(c => c.id === goalForm.client_id)?.last_name}
                                </div>
                              </div>
                            </div>
                            
                            {goalForm.description && (
                              <div>
                                <div className={`text-sm font-semibold ${theme.text} mb-2`}>Description:</div>
                                <div className={`text-sm ${theme.textSecondary}`}>{goalForm.description}</div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                                <div className={`text-2xl font-bold ${theme.text}`}>{goalForm.target_value}</div>
                                <div className={`text-xs ${theme.textSecondary}`}>Target {goalForm.unit}</div>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
                                <div className={`text-2xl font-bold ${theme.text}`}>{goalForm.current_value || '0'}</div>
                                <div className={`text-xs ${theme.textSecondary}`}>Current {goalForm.unit}</div>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {goalForm.start_date ? new Date(goalForm.start_date).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Start Date</div>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10">
                                <div className={`text-2xl font-bold ${theme.text}`}>
                                  {goalForm.target_date ? new Date(goalForm.target_date).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Target Date</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setFormStep(2)}
                            className="rounded-xl px-8 py-3 text-base font-semibold"
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Previous
                          </Button>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={resetForm}
                              className="rounded-xl px-8 py-3 text-base font-semibold"
                            >
                              Reset Form
                            </Button>
                            <Button
                              onClick={createGoal}
                              className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-base font-semibold`}
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Create Goal
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Track Progress Tab */}
              <TabsContent value="track" className="space-y-8 mt-6 relative z-0">
                <div className="pt-8"></div>
                
                {(() => {
                  const filteredGoals = getFilteredGoalsForTracking()
                  
                  return (
                    <>
                      {/* Header */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${theme.gradient} ${theme.shadow}`}>
                              <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h2 className={`text-2xl font-bold ${theme.text}`}>Track Client Goals</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-xl">
                              {filteredGoals.length} goals
                            </Badge>
                          </div>
                        </div>

                        {/* Controls */}
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                              <div className="flex-1">
                                <Select value={selectedClientForTracking} onValueChange={setSelectedClientForTracking}>
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
                                <Select value={dateRange} onValueChange={setDateRange}>
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
                                  variant="outline"
                                  className="rounded-xl h-12"
                                  onClick={() => setActiveTab('create')}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Goal
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Goals List */}
                      <div className="space-y-6">
                        {filteredGoals.map((goal) => {
                          const progressStatus = getProgressStatus(goal)
                          const trend = getProgressTrend(goal)
                          const daysRemaining = getDaysRemaining(goal)
                          const velocity = getProgressVelocity(goal)
                          const chartData = getProgressChartData(goal)
                          const isExpanded = expandedGoal === goal.id
                          
                          return (
                            <Card key={goal.id} className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden group`}>
                              <CardHeader className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${getCategoryColor(goal.category)} ${theme.shadow} flex items-center justify-center`}>
                                      <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                                    </div>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`text-xl font-bold ${theme.text}`}>{goal.title}</h3>
                                        <Badge className={`rounded-xl ${progressStatus.color}`}>
                                          {progressStatus.label}
                                        </Badge>
                                      </div>
                                      
                                      <div className={`text-sm ${theme.textSecondary} mb-3`}>
                                        {goal.client_name} • {goal.category.replace('_', ' ')}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="text-center p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                                          <div className={`text-2xl font-bold ${theme.text}`}>{goal.target_value}</div>
                                          <div className={`text-xs ${theme.textSecondary}`}>Target {goal.unit}</div>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
                                          <div className={`text-2xl font-bold ${theme.text}`}>{goal.current_value}</div>
                                          <div className={`text-xs ${theme.textSecondary}`}>Current {goal.unit}</div>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                                          <div className={`text-2xl font-bold ${theme.text}`}>{goal.progress_percentage.toFixed(1)}%</div>
                                          <div className={`text-xs ${theme.textSecondary}`}>Progress</div>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10">
                                          <div className={`text-2xl font-bold ${theme.text}`}>{daysRemaining}</div>
                                          <div className={`text-xs ${theme.textSecondary}`}>Days Left</div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                          <span className={`${theme.textSecondary}`}>Progress</span>
                                          <span className={`font-semibold ${theme.text}`}>{goal.progress_percentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={goal.progress_percentage} className="h-3 rounded-full" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                                      className="rounded-xl"
                                    >
                                      {isExpanded ? <ArrowLeft className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(goal)}
                                      className="rounded-xl"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              {isExpanded && (
                                <CardContent className="p-6 pt-0">
                                  <div className="space-y-6">
                                    {/* Progress Chart */}
                                    <div className="space-y-4">
                                      <h4 className={`text-lg font-semibold ${theme.text}`}>Progress Over Time</h4>
                                      <div className="h-64 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                                        <div className="flex items-end justify-between h-full gap-1">
                                          {chartData.slice(-14).map((point, index) => (
                                            <div key={index} className="flex-1 flex flex-col items-center">
                                              <div
                                                className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm"
                                                style={{ height: `${Math.max(4, (point.progress / 100) * 200)}px` }}
                                                title={`${point.date}: ${point.value} ${goal.unit} (${point.progress}%)`}
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
                                    </div>
                                    
                                    {/* Goal Details */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <h4 className={`text-lg font-semibold ${theme.text}`}>Goal Details</h4>
                                        <div className="space-y-3">
                                          <div className="flex justify-between">
                                            <span className={`${theme.textSecondary}`}>Start Date:</span>
                                            <span className={`font-medium ${theme.text}`}>
                                              {new Date(goal.created_at).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className={`${theme.textSecondary}`}>Target Date:</span>
                                            <span className={`font-medium ${theme.text}`}>
                                              {new Date(goal.target_date).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className={`${theme.textSecondary}`}>Progress Velocity:</span>
                                            <span className={`font-medium ${theme.text}`}>
                                              {velocity}% per day
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className={`${theme.textSecondary}`}>Trend:</span>
                                            <div className="flex items-center gap-1">
                                              {trend === 'up' ? (
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                              ) : (
                                                <TrendingDown className="w-4 h-4 text-red-500" />
                                              )}
                                              <span className={`font-medium ${theme.text}`}>
                                                {trend === 'up' ? 'Improving' : 'Declining'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className={`text-lg font-semibold ${theme.text}`}>Quick Actions</h4>
                                        <div className="space-y-3">
                                          <Button
                                            variant="outline"
                                            className="w-full rounded-xl justify-start"
                                            onClick={() => {
                                              const newValue = prompt(`Enter new ${goal.unit} value:`, goal.current_value.toString())
                                              if (newValue && !isNaN(parseFloat(newValue))) {
                                                logProgress(goal.id, parseFloat(newValue))
                                              }
                                            }}
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Log Progress
                                          </Button>
                                          <Button
                                            variant="outline"
                                            className="w-full rounded-xl justify-start"
                                            onClick={() => handleSendEncouragement(goal)}
                                          >
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Send Encouragement
                                          </Button>
                                          <Button
                                            variant="outline"
                                            className="w-full rounded-xl justify-start"
                                            onClick={() => openEditDialog(goal)}
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Goal
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {goal.description && (
                                      <div className="space-y-2">
                                        <h4 className={`text-lg font-semibold ${theme.text}`}>Description</h4>
                                        <p className={`text-sm ${theme.textSecondary}`}>{goal.description}</p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          )
                        })}
                      </div>

                      {filteredGoals.length === 0 && (
                        <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                          <CardContent className="p-12 text-center">
                            <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                              <Activity className="w-12 h-12 text-white" />
                            </div>
                            <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                              {goals.length === 0 ? 'No goals to track yet' : 'No goals found for selected client'}
                            </h3>
                            <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                              {goals.length === 0 
                                ? 'Start by creating goals for your clients to track their progress.'
                                : 'Try selecting a different client or create new goals.'
                              }
                            </p>
                            <Button 
                              onClick={() => setActiveTab('create')}
                              className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                            >
                              <Plus className="w-5 h-5 mr-3" />
                              Create New Goal
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )
                })()}
              </TabsContent>

              {/* All Goals Tab */}
              <TabsContent value="goals" className="space-y-6 mt-6 relative z-0">
                <div className="pt-8"></div>

            {/* Enhanced Search and Filters */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                  <Input
                    placeholder="Search goals by title, description, or client name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Users className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SortAsc className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                      <SelectItem value="progress-high">Highest Progress</SelectItem>
                      <SelectItem value="progress-low">Lowest Progress</SelectItem>
                      <SelectItem value="deadline-soon">Deadline Soon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3`}>
                    <Plus className="w-5 h-5 mr-2" />
                    Set New Goal
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </DialogTrigger>
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                <DialogHeader>
                  <DialogTitle className={`${theme.text}`}>Create New Goal</DialogTitle>
                  <DialogDescription className={`${theme.textSecondary}`}>
                    Set a new fitness goal for one of your clients.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client-select" className={`${theme.text}`}>Client</Label>
                    <Select value={goalForm.client_id} onValueChange={(value) => 
                      setGoalForm(prev => ({ ...prev, client_id: value }))
                    }>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <SelectValue placeholder="Select a client" />
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
                  <div>
                    <Label htmlFor="goal-title" className={`${theme.text}`}>Goal Title</Label>
                    <Input
                      id="goal-title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Lose 10kg"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="goal-description" className={`${theme.text}`}>Description</Label>
                    <Textarea
                      id="goal-description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the goal in detail"
                      rows={3}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="target-value" className={`${theme.text}`}>Target Value</Label>
                      <Input
                        id="target-value"
                        type="number"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                        placeholder="10"
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="current-value" className={`${theme.text}`}>Current Value</Label>
                      <Input
                        id="current-value"
                        type="number"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: e.target.value }))}
                        placeholder="0"
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit" className={`${theme.text}`}>Unit</Label>
                      <Input
                        id="unit"
                        value={goalForm.unit}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="kg, minutes, reps"
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target-date" className={`${theme.text}`}>Target Date</Label>
                      <Input
                        id="target-date"
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category" className={`${theme.text}`}>Category</Label>
                    <Select value={goalForm.category} onValueChange={(value: Goal['category']) => 
                      setGoalForm(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="body_composition">Body Composition</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createGoal} className={`w-full ${theme.gradient} ${theme.shadow} rounded-xl`}>
                    Create Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Enhanced Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{goals.length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Total Goals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {goals.filter(g => g.status === 'completed').length}
                      </p>
                      <p className={`text-sm ${theme.textSecondary}`}>Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {goals.filter(g => g.status === 'active').length}
                      </p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {Math.round(goals.reduce((acc, g) => acc + g.progress_percentage, 0) / goals.length || 0)}%
                      </p>
                      <p className={`text-sm ${theme.textSecondary}`}>Avg Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

            {/* Enhanced Goals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGoals.map(goal => (
                <Card key={goal.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className={`text-xl font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                              {goal.title}
                            </CardTitle>
                            <div className={`${theme.textSecondary} text-sm mt-1`}>
                              {goal.client_name}
                            </div>
                          </div>
                        </div>
                        
                        {goal.description && (
                          <p className={`${theme.textSecondary} text-sm leading-relaxed mb-3`}>
                            {goal.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={`${getCategoryColor(goal.category)} rounded-xl`}>
                            {goal.category.replace('_', ' ')}
                          </Badge>
                          <Badge className={`${getStatusColor(goal.status)} rounded-xl`}>
                            {goal.status}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className={`${theme.textSecondary}`}>Progress</span>
                            <span className={`font-semibold ${theme.text}`}>{goal.progress_percentage.toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={goal.progress_percentage} 
                            className="h-3 rounded-full"
                          />
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{goal.current_value} {goal.unit}</span>
                            <span>{goal.target_value} {goal.unit}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm mt-4">
                          <span className={`flex items-center gap-1 ${theme.textSecondary}`}>
                            <Calendar className="w-4 h-4 text-blue-500" />
                            {new Date(goal.target_date).toLocaleDateString()}
                          </span>
                          <span className={`flex items-center gap-1 ${theme.textSecondary}`}>
                            <Timer className="w-4 h-4 text-orange-500" />
                            {goal.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(goal)}
                          className={`text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateGoal(goal)}
                          className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendEncouragement(goal)}
                          className={`text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                          className={`text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl`}
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
                        onClick={() => openEditDialog(goal)}
                        className={`flex-1 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateGoal(goal)}
                        className={`rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendEncouragement(goal)}
                        className={`rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGoal(goal.id)}
                        className={`text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredGoals.length === 0 && (
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                <CardContent className="p-12 text-center">
                  <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                    <Target className="w-12 h-12 text-white" />
                  </div>
                  <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                    {goals.length === 0 ? 'No goals set yet' : 'No goals found'}
                  </h3>
                  <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                    {goals.length === 0 
                      ? 'Start setting fitness goals for your clients to track their progress and keep them motivated.'
                      : 'Try adjusting your search criteria or filters.'
                    }
                  </p>
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Set New Goal
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
              </TabsContent>

              {/* By Client Tab */}
              <TabsContent value="clients" className="space-y-6 mt-6 relative z-0">
                <div className="pt-8"></div>
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardContent className="p-12 text-center">
                    <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                      <Users className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>Client Goals View</h3>
                    <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                      View goals organized by client for detailed individual progress tracking.
                    </p>
                    <Button 
                      onClick={() => setCreateDialogOpen(true)}
                      className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Set New Goal
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-6 relative z-0">
                <div className="pt-8"></div>
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardContent className="p-12 text-center">
                    <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                      <BarChart3 className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>Goal Analytics</h3>
                    <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                      Advanced analytics and insights for goal performance and trends.
                    </p>
                    <Button 
                      onClick={() => setCreateDialogOpen(true)}
                      className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Set New Goal
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Enhanced Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl`}>
          <DialogHeader>
            <DialogTitle className={`${theme.text}`}>Edit Goal</DialogTitle>
            <DialogDescription className={`${theme.textSecondary}`}>
              Update the goal details and progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-goal-title" className={`${theme.text}`}>Goal Title</Label>
              <Input
                id="edit-goal-title"
                value={goalForm.title}
                onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Lose 10kg"
                className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
              />
            </div>
            <div>
              <Label htmlFor="edit-goal-description" className={`${theme.text}`}>Description</Label>
              <Textarea
                id="edit-goal-description"
                value={goalForm.description}
                onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the goal in detail"
                rows={3}
                className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-target-value" className={`${theme.text}`}>Target Value</Label>
                <Input
                  id="edit-target-value"
                  type="number"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                  placeholder="10"
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
              <div>
                <Label htmlFor="edit-current-value" className={`${theme.text}`}>Current Value</Label>
                <Input
                  id="edit-current-value"
                  type="number"
                  value={goalForm.current_value}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: e.target.value }))}
                  placeholder="0"
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-unit" className={`${theme.text}`}>Unit</Label>
                <Input
                  id="edit-unit"
                  value={goalForm.unit}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="kg, minutes, reps"
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
              <div>
                <Label htmlFor="edit-target-date" className={`${theme.text}`}>Target Date</Label>
                <Input
                  id="edit-target-date"
                  type="date"
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                  className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-category" className={`${theme.text}`}>Category</Label>
              <Select value={goalForm.category} onValueChange={(value: Goal['category']) => 
                setGoalForm(prev => ({ ...prev, category: value }))
              }>
                <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="endurance">Endurance</SelectItem>
                  <SelectItem value="body_composition">Body Composition</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={updateGoal} className={`w-full ${theme.gradient} ${theme.shadow} rounded-xl`}>
              Update Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
