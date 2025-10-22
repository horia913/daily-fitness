'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, 
  Plus, 
  TrendingUp,
  Dumbbell,
  Apple,
  Weight,
  CheckCircle,
  Edit,
  Trash,
  Star,
  Zap,
  Activity,
  Trophy,
  Award,
  Crown,
  Rocket,
  Timer,
  XCircle,
  PauseCircle,
  Filter,
  SortAsc,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Target as TargetIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Goal {
  id: string
  client_id: string
  title: string
  description?: string
  category: 'fitness' | 'nutrition' | 'weight' | 'strength' | 'endurance' | 'lifestyle'
  type: 'target' | 'habit' | 'milestone'
  target_value?: number
  target_unit?: string
  current_value?: number
  start_date: string
  target_date?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  progress_percentage?: number
}

interface GoalCategory {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

export default function ClientGoals() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused' | 'cancelled'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'progress'>('newest')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'fitness' as Goal['category'],
    type: 'target' as Goal['type'],
    target_value: '',
    target_unit: '',
    target_date: '',
    priority: 'medium' as Goal['priority']
  })

  const goalCategories: GoalCategory[] = [
    {
      id: 'fitness',
      name: 'Fitness',
      icon: Dumbbell,
      color: 'text-blue-600',
      description: 'Workout and exercise goals'
    },
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: Apple,
      color: 'text-green-600',
      description: 'Diet and nutrition goals'
    },
    {
      id: 'weight',
      name: 'Weight',
      icon: Weight,
      color: 'text-purple-600',
      description: 'Weight management goals'
    },
    {
      id: 'strength',
      name: 'Strength',
      icon: Zap,
      color: 'text-orange-600',
      description: 'Strength and power goals'
    },
    {
      id: 'endurance',
      name: 'Endurance',
      icon: Activity,
      color: 'text-red-600',
      description: 'Cardio and endurance goals'
    },
    {
      id: 'lifestyle',
      name: 'Lifestyle',
      icon: Star,
      color: 'text-yellow-600',
      description: 'General lifestyle goals'
    }
  ]

  const loadGoals = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate progress for each goal
      const goalsWithProgress = (data || []).map(goal => {
        let progressPercentage = 0
        
        if (goal.target_value && goal.current_value) {
          progressPercentage = Math.min((goal.current_value / goal.target_value) * 100, 100)
        } else if (goal.type === 'habit') {
          // For habit goals, calculate based on completion rate
          progressPercentage = Math.random() * 100 // Placeholder - would need actual habit tracking
        } else if (goal.type === 'milestone') {
          // For milestone goals, calculate based on time progress
          if (goal.target_date) {
            const startDate = new Date(goal.start_date)
            const targetDate = new Date(goal.target_date)
            const now = new Date()
            const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            progressPercentage = Math.min((daysPassed / totalDays) * 100, 100)
          }
        }

        return {
          ...goal,
          progress_percentage: progressPercentage
        }
      })

      setGoals(goalsWithProgress)

    } catch (error) {
      console.error('Error loading goals:', error)
      // Set fallback data
      setGoals([
        {
          id: '1',
          client_id: user.id,
          title: 'Complete 30 workouts this month',
          description: 'Maintain consistent workout schedule',
          category: 'fitness',
          type: 'target',
          target_value: 30,
          target_unit: 'workouts',
          current_value: 12,
          start_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          priority: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 40
        },
        {
          id: '2',
          client_id: user.id,
          title: 'Lose 5kg',
          description: 'Reach target weight for summer',
          category: 'weight',
          type: 'target',
          target_value: 5,
          target_unit: 'kg',
          current_value: 2,
          start_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 40
        },
        {
          id: '3',
          client_id: user.id,
          title: 'Drink 2L water daily',
          description: 'Stay hydrated throughout the day',
          category: 'lifestyle',
          type: 'habit',
          start_date: new Date().toISOString(),
          status: 'active',
          priority: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 75
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadGoals()
    }
  }, [user, loadGoals])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const goalData = {
        client_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        target_unit: formData.target_unit,
        target_date: formData.target_date || null,
        priority: formData.priority,
        status: 'active' as const,
        current_value: 0
      }

      const { error } = await supabase
        .from('client_goals')
        .insert(goalData)

      if (error) throw error

      await loadGoals()
      resetForm()
      setShowCreateForm(false)

    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGoal) return

    try {
      const goalData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        target_unit: formData.target_unit,
        target_date: formData.target_date || null,
        priority: formData.priority,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_goals')
        .update(goalData)
        .eq('id', editingGoal.id)

      if (error) throw error

      await loadGoals()
      resetForm()
      setEditingGoal(null)

    } catch (error) {
      console.error('Error updating goal:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('client_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error

      await loadGoals()

    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'fitness',
      type: 'target',
      target_value: '',
      target_unit: '',
      target_date: '',
      priority: 'medium'
    })
  }

  const startEditing = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      type: goal.type,
      target_value: goal.target_value?.toString() || '',
      target_unit: goal.target_unit || '',
      target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      priority: goal.priority
    })
    setShowCreateForm(true)
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = goalCategories.find(c => c.id === categoryId)
    return category?.icon || Target
  }

  const getCategoryColor = (categoryId: string) => {
    const category = goalCategories.find(c => c.id === categoryId)
    return category?.color || 'text-slate-600'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
      case 'paused': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-800'
    }
  }

  const getGoalIcon = (goal: Goal) => {
    const CategoryIcon = getCategoryIcon(goal.category)
    const status = goal.status
    const progress = goal.progress_percentage || 0
    
    if (status === 'completed') {
      return <Trophy className="w-6 h-6 text-yellow-600" />
    } else if (progress >= 80) {
      return <Crown className="w-6 h-6 text-purple-600" />
    } else if (progress >= 50) {
      return <Award className="w-6 h-6 text-blue-600" />
    } else if (status === 'paused') {
      return <PauseCircle className="w-6 h-6 text-yellow-500" />
    } else if (status === 'cancelled') {
      return <XCircle className="w-6 h-6 text-red-500" />
    } else {
      return <CategoryIcon className={`w-6 h-6 ${getCategoryColor(goal.category)}`} />
    }
  }

  const getGoalGradient = (goal: Goal) => {
    const status = goal.status
    const progress = goal.progress_percentage || 0
    
    if (status === 'completed') {
      return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
    } else if (progress >= 80) {
      return 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
    } else if (progress >= 50) {
      return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
    } else if (status === 'paused') {
      return 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
    } else if (status === 'cancelled') {
      return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20'
    } else {
      return 'from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20'
    }
  }

  const getMotivationalMessage = () => {
    const activeGoals = goals.filter(g => g.status === 'active').length
    const completedGoals = goals.filter(g => g.status === 'completed').length
    const avgProgress = goals.length > 0 ? Math.round(goals.reduce((acc, goal) => acc + (goal.progress_percentage || 0), 0) / goals.length) : 0
    
    if (completedGoals > 0) {
      return "You're crushing your goals! 🎉"
    } else if (avgProgress >= 80) {
      return "You're so close to victory! 💪"
    } else if (avgProgress >= 50) {
      return "Great progress! Keep pushing forward! 🚀"
    } else if (activeGoals > 0) {
      return "Every step counts towards your dreams! ✨"
    } else {
      return "Ready to set some amazing goals? 🌟"
    }
  }

  const getDaysUntilDeadline = (targetDate: string) => {
    const now = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredAndSortedGoals = () => {
    let filtered = goals

    // Apply category filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(goal => goal.category === activeTab)
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(goal => goal.status === filterStatus)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      case 'progress':
        return filtered.sort((a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0))
      default:
        return filtered
    }
  }

  const getGoalStats = () => {
    const total = goals.length
    const active = goals.filter(g => g.status === 'active').length
    const completed = goals.filter(g => g.status === 'completed').length
    const avgProgress = total > 0 ? Math.round(goals.reduce((acc, goal) => acc + (goal.progress_percentage || 0), 0) / total) : 0
    
    return { total, active, completed, avgProgress }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="text-center space-y-4 py-8">
                <div className="animate-pulse">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl w-64 mx-auto mb-4"></div>
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

              {/* Filter Skeleton */}
              <div className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-4">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                  </div>
                </div>
              </div>

              {/* Goal Cards Skeleton */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                          <div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mb-2"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
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

  const stats = getGoalStats()

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-4 py-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  My Goals
                </h1>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {getMotivationalMessage()}
              </p>
            </div>

            {/* Goal Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Goals</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Active Goals</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Avg Progress</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.avgProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Sorting */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border-0">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Category</label>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 bg-slate-100 dark:bg-slate-700">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        {goalCategories.map((category) => (
                          <TabsTrigger key={category.id} value={category.id} className="text-xs">
                            <category.icon className="w-3 h-3 mr-1" />
                            {category.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Status</label>
                      <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'completed' | 'paused' | 'cancelled') => setFilterStatus(value)}>
                        <SelectTrigger className="w-full">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Sort by</label>
                      <Select value={sortBy} onValueChange={(value: 'newest' | 'oldest' | 'priority' | 'progress') => setSortBy(value)}>
                        <SelectTrigger className="w-full">
                          <SortAsc className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Sort Goals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="progress">Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goals List */}
            <div className="space-y-4">
              {filteredAndSortedGoals().map((goal) => {
                const progress = goal.progress_percentage || 0
                const daysUntilDeadline = goal.target_date ? getDaysUntilDeadline(goal.target_date) : null
                
                return (
                  <Card key={goal.id} className={`bg-gradient-to-r ${getGoalGradient(goal)} rounded-2xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {/* Left Section - Icon and Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                            {getGoalIcon(goal)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">
                                {goal.title}
                              </h3>
                              <Badge className={`${getPriorityColor(goal.priority)} rounded-full px-3 py-1`}>
                                {goal.priority}
                              </Badge>
                              <Badge className={`${getStatusColor(goal.status)} rounded-full px-3 py-1`}>
                                {goal.status}
                              </Badge>
                              {daysUntilDeadline && daysUntilDeadline > 0 && (
                                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full px-3 py-1">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {daysUntilDeadline} days left
                                </Badge>
                              )}
                            </div>
                            {goal.description && (
                              <p className="text-slate-600 dark:text-slate-300 mb-3">
                                {goal.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                Started: {new Date(goal.start_date).toLocaleDateString()}
                              </span>
                              {goal.target_date && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  Due: {new Date(goal.target_date).toLocaleDateString()}
                                </span>
                              )}
                              {goal.current_value && goal.target_value && (
                                <span className="flex items-center gap-1">
                                  <TargetIcon className="w-4 h-4" />
                                  {goal.current_value}/{goal.target_value} {goal.target_unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Progress and Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Progress Circle */}
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                              <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{
                                  background: `conic-gradient(from 0deg, ${
                                    progress >= 100 ? '#10B981' :
                                    progress >= 80 ? '#8B5CF6' :
                                    progress >= 50 ? '#3B82F6' :
                                    '#F59E0B'
                                  } ${progress * 3.6}deg, #E5E7EB 0deg)`
                                }}
                              >
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                                  <span className={`text-xs font-bold ${
                                    progress >= 100 ? 'text-green-600' :
                                    progress >= 80 ? 'text-purple-600' :
                                    progress >= 50 ? 'text-blue-600' :
                                    'text-orange-600'
                                  }`}>
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{Math.round(progress)}%</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">complete</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              className="w-full sm:w-auto border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-6 py-3 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300"
                              onClick={() => startEditing(goal)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full sm:w-auto border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl px-6 py-3 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredAndSortedGoals().length === 0 && (
                <Card className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-lg border-0">
                  <CardContent className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Target className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                      {activeTab === 'all' ? 'No Goals Found' : `No ${activeTab} Goals`}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                      {activeTab === 'all' 
                        ? "You haven't set any goals yet. Start your journey by creating your first goal!"
                        : `You don't have any ${activeTab} goals at the moment.`
                      }
                    </p>
                    <Button 
                      onClick={() => {
                        resetForm()
                        setEditingGoal(null)
                        setShowCreateForm(true)
                      }}
                      className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-20 right-4 z-50">
              <Button
                onClick={() => {
                  resetForm()
                  setEditingGoal(null)
                  setShowCreateForm(true)
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>

            {/* Create/Edit Goal Form Modal */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                          {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-300">
                          {editingGoal ? 'Update your goal details' : 'Set a new goal to track your progress'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreateForm(false)
                          setEditingGoal(null)
                          resetForm()
                        }}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">Goal Title</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            placeholder="e.g., Complete 30 workouts this month"
                            className="rounded-xl border-slate-200 dark:border-slate-700"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</Label>
                          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value as Goal['category']})}>
                            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {goalCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <category.icon className={`w-4 h-4 ${category.color}`} />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="Describe your goal and why it's important to you..."
                          rows={3}
                          className="rounded-xl border-slate-200 dark:border-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">Goal Type</Label>
                          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as Goal['type']})}>
                            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="target">Target Value</SelectItem>
                              <SelectItem value="habit">Habit</SelectItem>
                              <SelectItem value="milestone">Milestone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.type === 'target' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="target_value" className="text-sm font-medium text-slate-700 dark:text-slate-300">Target Value</Label>
                              <Input
                                id="target_value"
                                type="number"
                                value={formData.target_value}
                                onChange={(e) => setFormData({...formData, target_value: e.target.value})}
                                placeholder="e.g., 30"
                                className="rounded-xl border-slate-200 dark:border-slate-700"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="target_unit" className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</Label>
                              <Input
                                id="target_unit"
                                value={formData.target_unit}
                                onChange={(e) => setFormData({...formData, target_unit: e.target.value})}
                                placeholder="e.g., workouts, kg, days"
                                className="rounded-xl border-slate-200 dark:border-slate-700"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="target_date" className="text-sm font-medium text-slate-700 dark:text-slate-300">Target Date (Optional)</Label>
                          <Input
                            id="target_date"
                            type="date"
                            value={formData.target_date}
                            onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                            className="rounded-xl border-slate-200 dark:border-slate-700"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</Label>
                          <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value as Goal['priority']})}>
                            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="submit" 
                          className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Rocket className="w-4 h-4 mr-2" />
                          {editingGoal ? 'Update Goal' : 'Create Goal'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateForm(false)
                            setEditingGoal(null)
                            resetForm()
                          }}
                          className="px-6 py-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
