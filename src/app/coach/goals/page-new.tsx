'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Target,
  Plus,
  Users,
  Search,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  RefreshCw,
  Award,
  Zap,
  Activity,
  Scale,
  Heart
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Goal {
  id: string
  client_id: string
  title: string
  description: string | null
  target_value: number
  current_value: number
  unit: string
  target_date: string
  status: 'active' | 'completed' | 'paused'
  category: 'weight' | 'strength' | 'endurance' | 'body_composition' | 'general'
  created_at: string
  client?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function CoachGoals() {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [goals, setGoals] = useState<Goal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const [goalForm, setGoalForm] = useState({
    client_id: '',
    title: '',
    description: '',
    target_value: 0,
    current_value: 0,
    unit: 'kg',
    target_date: '',
    status: 'active' as 'active' | 'completed' | 'paused',
    category: 'general' as 'weight' | 'strength' | 'endurance' | 'body_composition' | 'general'
  })

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('client_id')
        .eq('coach_id', user.id)
        .eq('status', 'active')

      if (clientsError) {
        console.log('Clients error:', clientsError)
        setClients([])
        setGoals([])
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

        // Load goals
        try {
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })

          if (goalsError) {
            console.log('Goals table error:', goalsError)
            setGoals([])
          } else if (goalsData) {
            const goalsWithClients = goalsData.map(goal => ({
              ...goal,
              client: profilesData?.find(p => p.id === goal.client_id)
            }))

            console.log('Goals loaded successfully:', goalsWithClients.length, 'items')
            setGoals(goalsWithClients)
          }
        } catch (error) {
          console.log('Goals table error:', error)
          setGoals([])
        }
      } else {
        setClients([])
        setGoals([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setGoals([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createGoal = async () => {
    try {
      const { error } = await supabase
        .from('goals')
        .insert(goalForm)

      if (error) {
        console.error('Error creating goal:', error)
        alert('Error creating goal. Please try again.')
        return
      }

      setShowCreateGoal(false)
      setGoalForm({
        client_id: '',
        title: '',
        description: '',
        target_value: 0,
        current_value: 0,
        unit: 'kg',
        target_date: '',
        status: 'active',
        category: 'general'
      })
      loadData()
    } catch (error) {
      console.error('Error creating goal:', error)
      alert('Error creating goal. Please try again.')
    }
  }

  const updateGoal = async () => {
    try {
      if (!selectedGoal) return

      const { error } = await supabase
        .from('goals')
        .update(goalForm)
        .eq('id', selectedGoal.id)

      if (error) {
        console.error('Error updating goal:', error)
        alert('Error updating goal. Please try again.')
        return
      }

      setShowEditGoal(false)
      setSelectedGoal(null)
      loadData()
    } catch (error) {
      console.error('Error updating goal:', error)
      alert('Error updating goal. Please try again.')
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        console.error('Error deleting goal:', error)
        alert('Error deleting goal. Please try again.')
        return
      }

      loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Error deleting goal. Please try again.')
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setGoalForm({
      client_id: goal.client_id,
      title: goal.title,
      description: goal.description || '',
      target_value: goal.target_value,
      current_value: goal.current_value,
      unit: goal.unit,
      target_date: goal.target_date,
      status: goal.status,
      category: goal.category
    })
    setShowEditGoal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Paused</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'weight':
        return <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'strength':
        return <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case 'endurance':
        return <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'body_composition':
        return <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      default:
        return <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goal.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus
    const matchesCategory = filterCategory === 'all' || goal.category === filterCategory

    return matchesSearch && matchesStatus && matchesCategory
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
      <div className={`min-h-screen ${theme.background}`}>
        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-8">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-normal pb-1">
                  Client Goals
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Set and track fitness goals for your clients
              </p>
            </div>

            {/* Search and Filters */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                  <Input
                    placeholder="Search goals or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="weight">Weight</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="endurance">Endurance</SelectItem>
                      <SelectItem value="body_composition">Body Composition</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg px-6 py-3">
                    <Plus className="w-5 h-5" />
                    Create Goal
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

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
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
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{goals.filter(g => g.status === 'active').length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{goals.filter(g => g.status === 'completed').length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Completed</p>
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

            {/* Goals List */}
            <div className="space-y-6">
              <h2 className={`text-2xl font-bold ${theme.text} flex items-center gap-3`}>
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                Client Goals
              </h2>
              {filteredGoals.length === 0 ? (
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardContent className="p-12 text-center">
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Target className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                      No Goals Set
                    </h3>
                    <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                      Start setting fitness goals for your clients to track their progress
                    </p>
                    <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:scale-105 transition-all duration-200 px-8 py-3 text-lg font-semibold">
                          <Plus className="w-5 h-5 mr-2" />
                          Set First Goal
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map(goal => {
                    const progress = calculateProgress(goal.current_value, goal.target_value)
                    return (
                      <Card key={goal.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                                    {getCategoryIcon(goal.category)}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                      {goal.title}
                                    </h3>
                                    {goal.client && (
                                      <p className={`text-sm ${theme.textSecondary}`}>
                                        {goal.client.first_name} {goal.client.last_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between text-sm">
                                    <span className={theme.textSecondary}>Progress</span>
                                    <span className={`font-bold ${theme.text}`}>{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  <div className="flex justify-between text-xs">
                                    <span className={theme.textSecondary}>
                                      Current: {goal.current_value} {goal.unit}
                                    </span>
                                    <span className={theme.textSecondary}>
                                      Target: {goal.target_value} {goal.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`${theme.textSecondary} text-sm flex items-center gap-1`}>
                                      <Calendar className="w-4 h-4" />
                                      {new Date(goal.target_date).toLocaleDateString()}
                                    </span>
                                    {getStatusBadge(goal.status)}
                                  </div>
                                  {goal.description && (
                                    <p className={`text-sm ${theme.textSecondary} line-clamp-2 mt-2`}>
                                      {goal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditGoal(goal)}
                                className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteGoal(goal.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create Goal Modal */}
            <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[85vh] !w-[min(600px,95vw)] !m-0 !p-0 overflow-hidden`} style={{
                backgroundColor: theme.card.includes('dark') ? '#1E1E1E' : '#FFFFFF',
                border: theme.card.includes('dark') ? '1px solid #374151' : '1px solid #E5E7EB',
                boxShadow: theme.card.includes('dark') 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Create Goal</DialogTitle>
                    <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                      Set a new fitness goal for a client
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                  <div>
                    <Label htmlFor="client" className={`${theme.text}`}>Select Client</Label>
                    <Select value={goalForm.client_id} onValueChange={(value) => setGoalForm(prev => ({ ...prev, client_id: value }))}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <Users className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title" className={`${theme.text}`}>Goal Title</Label>
                    <Input
                      id="title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Lose 10kg by Summer"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Goal details..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className={`${theme.text}`}>Category</Label>
                      <Select value={goalForm.category} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, category: value }))}>
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
                    <div>
                      <Label htmlFor="unit" className={`${theme.text}`}>Unit</Label>
                      <Input
                        id="unit"
                        value={goalForm.unit}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="kg, lbs, reps..."
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="current_value" className={`${theme.text}`}>Current Value</Label>
                      <Input
                        id="current_value"
                        type="number"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_value" className={`${theme.text}`}>Target Value</Label>
                      <Input
                        id="target_value"
                        type="number"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="target_date" className={`${theme.text}`}>Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Button 
                    onClick={createGoal} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                    disabled={!goalForm.client_id || !goalForm.title || !goalForm.target_date}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateGoal(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Goal Modal */}
            <Dialog open={showEditGoal} onOpenChange={setShowEditGoal}>
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[85vh] !w-[min(600px,95vw)] !m-0 !p-0 overflow-hidden`} style={{
                backgroundColor: theme.card.includes('dark') ? '#1E1E1E' : '#FFFFFF',
                border: theme.card.includes('dark') ? '1px solid #374151' : '1px solid #E5E7EB',
                boxShadow: theme.card.includes('dark') 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Edit Goal</DialogTitle>
                    <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                      Update goal progress and details
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                  <div>
                    <Label htmlFor="edit-title" className={`${theme.text}`}>Goal Title</Label>
                    <Input
                      id="edit-title"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Lose 10kg by Summer"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="edit-description"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Goal details..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-current_value" className={`${theme.text}`}>Current Value</Label>
                      <Input
                        id="edit-current_value"
                        type="number"
                        value={goalForm.current_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-target_value" className={`${theme.text}`}>Target Value</Label>
                      <Input
                        id="edit-target_value"
                        type="number"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-status" className={`${theme.text}`}>Status</Label>
                    <Select value={goalForm.status} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-target_date" className={`${theme.text}`}>Target Date</Label>
                    <Input
                      id="edit-target_date"
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <Button 
                    onClick={updateGoal} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Goal
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditGoal(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                    Cancel
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

