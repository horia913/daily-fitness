'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Search,
  Users, 
  Plus,
  Trash2,
  MessageCircle,
  ArrowLeft,
  RefreshCw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Eye,
  Clock,
  AlertCircle,
  Play,
  User,
  ChefHat,
  TrendingUp,
  Star
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface MealPlanAssignment {
  id: string
  client_id: string
  meal_plan_id: string
  start_date: string
  end_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
  meal_plan?: {
    id: string
    name: string
    description?: string
    target_calories?: number
    target_protein?: number
    target_carbs?: number
    target_fat?: number
  }
  compliance?: {
    completed_days: number
    total_days: number
    last_logged: string
    streak_days: number
    average_calories: number
    average_protein: number
  }
}

interface OptimizedNutritionAssignmentsProps {
  coachId?: string
}

export default function OptimizedNutritionAssignments({ }: OptimizedNutritionAssignmentsProps) {
  const { getThemeStyles } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [assignments, setAssignments] = useState<MealPlanAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedClient, setSelectedClient] = useState('all')
  const [sortBy, setSortBy] = useState<'client' | 'date' | 'status' | 'compliance'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const statusColors = {
    'active': 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-success)]',
    'upcoming': 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-cyan)]',
    'completed': 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-accent-purple)]',
    'paused': 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-status-warning)]',
    'inactive': 'bg-[color:var(--fc-glass-soft)] text-[color:var(--fc-text-subtle)]'
  }

  const statusLabels = {
    'active': 'Active',
    'upcoming': 'Upcoming',
    'completed': 'Completed',
    'paused': 'Paused',
    'inactive': 'Inactive'
  }

  const statusIcons = {
    'active': Play,
    'upcoming': Clock,
    'completed': AlertCircle,
    'paused': AlertCircle,
    'inactive': AlertCircle
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        // Fetch assignments first
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('meal_plan_assignments')
          .select('*')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })

        if (assignmentsError) throw assignmentsError

        if (!assignmentsData || assignmentsData.length === 0) {
          setAssignments([])
          return
        }

        // Get unique client IDs and meal plan IDs
        const clientIds = [...new Set(assignmentsData.map(a => a.client_id))]
        const mealPlanIds = [...new Set(assignmentsData.map(a => a.meal_plan_id))]

        // Fetch profiles for clients
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientIds)

        if (profilesError) throw profilesError

        // Fetch meal plans
        const { data: mealPlansData, error: mealPlansError } = await supabase
          .from('meal_plans')
          .select('id, name, target_calories')
          .in('id', mealPlanIds)

        if (mealPlansError) throw mealPlansError

        // Combine the data
        const assignmentsWithJoins = assignmentsData.map(assignment => {
          const client = profilesData?.find(p => p.id === assignment.client_id)
          const mealPlan = mealPlansData?.find(mp => mp.id === assignment.meal_plan_id)
          
          return {
            ...assignment,
            client,
            meal_plan: mealPlan
          }
        })

        // Add mock compliance data for demo
        const assignmentsWithCompliance = assignmentsWithJoins.map(assignment => ({
          ...assignment,
          compliance: {
            completed_days: Math.floor(Math.random() * 30),
            total_days: 30,
            last_logged: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            streak_days: Math.floor(Math.random() * 7),
            average_calories: Math.floor(Math.random() * 500) + 1500,
            average_protein: Math.floor(Math.random() * 50) + 100
          }
        }))

        setAssignments(assignmentsWithCompliance)
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        const savedAssignments = localStorage.getItem(`nutrition_assignments_${user.id}`)
        if (savedAssignments) {
          setAssignments(JSON.parse(savedAssignments))
        } else {
          const sampleAssignments = [
            {
              id: '1',
              client_id: 'client1',
              meal_plan_id: 'mealplan1',
              start_date: new Date().toISOString(),
              end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true,
              notes: 'Focus on protein intake',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              client: {
                id: 'client1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                avatar_url: undefined
              },
              meal_plan: {
                id: 'mealplan1',
                name: 'High Protein Muscle Gain',
                target_calories: 2800
              },
              compliance: {
                completed_days: 25,
                total_days: 30,
                last_logged: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                streak_days: 5,
                average_calories: 2750,
                average_protein: 195
              }
            },
            {
              id: '2',
              client_id: 'client2',
              meal_plan_id: 'mealplan2',
              start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: false,
              notes: 'Weight loss focus',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              client: {
                id: 'client2',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane@example.com',
                avatar_url: undefined
              },
              meal_plan: {
                id: 'mealplan2',
                name: 'Weight Loss Plan',
                target_calories: 1600
              },
              compliance: {
                completed_days: 0,
                total_days: 30,
                last_logged: new Date().toISOString(),
                streak_days: 0,
                average_calories: 0,
                average_protein: 0
              }
            },
            {
              id: '3',
              client_id: 'client3',
              meal_plan_id: 'mealplan3',
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: false,
              notes: 'Completed successfully',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              client: {
                id: 'client3',
                first_name: 'Mike',
                last_name: 'Johnson',
                email: 'mike@example.com',
                avatar_url: undefined
              },
              meal_plan: {
                id: 'mealplan3',
                name: 'Maintenance Plan',
                target_calories: 2200
              },
              compliance: {
                completed_days: 28,
                total_days: 30,
                last_logged: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                streak_days: 0,
                average_calories: 2180,
                average_protein: 148
              }
            }
          ]
          setAssignments(sampleAssignments)
          localStorage.setItem(`nutrition_assignments_${user.id}`, JSON.stringify(sampleAssignments))
        }
      }
    } catch (error) {
      console.error('Error loading nutrition assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedAssignments = assignments
    .filter(assignment => {
      const matchesSearch = assignment.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.meal_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || getAssignmentStatus(assignment) === selectedStatus
      const matchesClient = selectedClient === 'all' || assignment.client_id === selectedClient
      return matchesSearch && matchesStatus && matchesClient
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'client':
          comparison = `${a.client?.first_name} ${a.client?.last_name}`.localeCompare(`${b.client?.first_name} ${b.client?.last_name}`)
          break
        case 'date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          break
        case 'status':
          comparison = getAssignmentStatus(a).localeCompare(getAssignmentStatus(b))
          break
        case 'compliance':
          const aCompliance = a.compliance ? (a.compliance.completed_days / a.compliance.total_days) : 0
          const bCompliance = b.compliance ? (b.compliance.completed_days / b.compliance.total_days) : 0
          comparison = aCompliance - bCompliance
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const getAssignmentStatus = (assignment: MealPlanAssignment) => {
    const now = new Date()
    const startDate = new Date(assignment.start_date)
    const endDate = assignment.end_date ? new Date(assignment.end_date) : null

    if (!assignment.is_active) return 'inactive'
    if (now < startDate) return 'upcoming'
    if (endDate && now > endDate) return 'completed'
    if (assignment.compliance?.streak_days === 0 && now > new Date(assignment.compliance.last_logged)) return 'paused'
    return 'active'
  }


  const getCompliancePercentage = (assignment: MealPlanAssignment) => {
    if (!assignment.compliance) return 0
    return Math.round((assignment.compliance.completed_days / assignment.compliance.total_days) * 100)
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-[color:var(--fc-status-success)]'
    if (percentage >= 60) return 'text-[color:var(--fc-status-warning)]'
    return 'text-[color:var(--fc-status-error)]'
  }

  const getUniqueClients = () => {
    const clients = assignments.map(a => a.client).filter(Boolean)
    return Array.from(new Set(clients.map(c => c?.id))).map(id => 
      clients.find(c => c?.id === id)
    ).filter(Boolean)
  }

  const handleUnassignMealPlan = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to unassign this meal plan?')) return

    try {
      const { error } = await supabase
        .from('meal_plan_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      loadAssignments()
    } catch (error) {
      console.error('Error unassigning meal plan:', error)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                <div className="space-y-4">
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
    <div className={`min-h-screen ${theme.background}`}>
      {/* Enhanced Header */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/coach')}
                    className="fc-btn fc-btn-ghost h-10 w-10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="space-y-2">
                    <Badge className="fc-badge">Nutrition Assignments</Badge>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)]">
                      Nutrition Assignments
                    </h1>
                    <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)]">
                      Manage and track client nutrition plan assignments
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={loadAssignments}
                    className="fc-btn fc-btn-ghost flex items-center gap-2"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Button
                    onClick={() => {/* Handle assign plan action */}}
                    className="fc-btn fc-btn-primary flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Assign Plan</span>
                    <span className="sm:hidden">Assign</span>
                  </Button>
                </div>
              </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Users className="w-6 h-6 text-[color:var(--fc-domain-meals)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">{assignments.length}</p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <AlertCircle className="w-6 h-6 text-[color:var(--fc-status-success)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {assignments.filter(a => getAssignmentStatus(a) === 'active').length}
                    </p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <TrendingUp className="w-6 h-6 text-[color:var(--fc-accent-purple)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {assignments.length > 0 
                        ? Math.round(assignments.reduce((sum, a) => sum + getCompliancePercentage(a), 0) / assignments.length)
                        : 0
                      }%
                    </p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Avg Compliance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Star className="w-6 h-6 text-[color:var(--fc-status-warning)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {assignments.reduce((sum, a) => sum + (a.compliance?.streak_days || 0), 0)}
                    </p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Total Streaks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Search and Filters */}
          <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-[color:var(--fc-text-subtle)] w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="fc-input pl-10 sm:pl-12 h-12 text-base"
                />
              </div>

              {/* Filters - Mobile First */}
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="fc-select h-12">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => {
                      const Icon = statusIcons[value as keyof typeof statusIcons]
                      return (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="fc-select h-12">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {getUniqueClients().map(client => (
                      <SelectItem key={client?.id} value={client?.id || ''}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {client?.first_name} {client?.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: 'client' | 'date' | 'status' | 'compliance') => setSortBy(value)}>
                    <SelectTrigger className="fc-select h-12 flex-1">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client Name</SelectItem>
                      <SelectItem value="date">Start Date</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="fc-btn fc-btn-ghost h-12 px-3"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-[color:var(--fc-text-dim)]">View:</span>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Spacing between search/filter and assignment cards */}
          <div className="h-8" />

          {/* Assignment Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredAndSortedAssignments.map(assignment => {
                const status = getAssignmentStatus(assignment)
                const StatusIcon = statusIcons[status]
                const compliancePercentage = getCompliancePercentage(assignment)
                
                return (
                  <div 
                    key={assignment.id} 
                    className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-200"
                  >
                      {/* Header with Client Info */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-semibold">
                            {assignment.client?.first_name?.[0]}{assignment.client?.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-[color:var(--fc-text-primary)] mb-1">
                              {assignment.client?.first_name} {assignment.client?.last_name}
                            </h3>
                            <p className="text-sm text-[color:var(--fc-text-dim)]">
                              {assignment.meal_plan?.name}
                            </p>
                          </div>
                        </div>
                        
                      </div>

                      {/* Status and Date */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={`${statusColors[status]} border border-[color:var(--fc-glass-border)] text-xs px-2 py-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabels[status]}
                        </Badge>
                        <div className="text-xs text-[color:var(--fc-text-subtle)]">
                          {new Date(assignment.start_date).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Compliance Indicator */}
                      {assignment.compliance && (
                        <div className="mb-5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[color:var(--fc-text-subtle)]">Compliance</span>
                            <span className={`text-xs font-medium ${getComplianceColor(compliancePercentage)}`}>
                              {compliancePercentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[color:var(--fc-glass-soft)] rounded-full overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                compliancePercentage >= 80
                                  ? 'bg-[color:var(--fc-status-success)]'
                                  : compliancePercentage >= 60
                                  ? 'bg-[color:var(--fc-status-warning)]'
                                  : 'bg-[color:var(--fc-status-error)]'
                              }`}
                              style={{ width: `${compliancePercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[color:var(--fc-glass-border)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // View details action
                          }}
                          className="fc-btn fc-btn-ghost flex-1 text-xs sm:text-sm"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Message client action
                          }}
                          className="fc-btn fc-btn-ghost p-2"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignMealPlan(assignment.id)
                          }}
                          className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-status-error)]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredAndSortedAssignments.map(assignment => {
                const status = getAssignmentStatus(assignment)
                const StatusIcon = statusIcons[status]
                const compliancePercentage = getCompliancePercentage(assignment)
                
                return (
                  <div 
                    key={assignment.id}
                    className="fc-glass fc-card rounded-2xl p-6 border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Client Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center font-semibold flex-shrink-0">
                        {assignment.client?.first_name?.[0]}{assignment.client?.last_name?.[0]}
                      </div>

                        {/* Assignment Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[color:var(--fc-text-primary)] text-base sm:text-lg mb-1 truncate">
                                {assignment.client?.first_name} {assignment.client?.last_name}
                              </h3>
                              <p className="text-sm text-[color:var(--fc-text-dim)] mb-2">
                                {assignment.meal_plan?.name}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${statusColors[status]} border-0 text-xs px-2 py-1`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusLabels[status]}
                                </Badge>
                                <span className="text-xs text-[color:var(--fc-text-subtle)]">
                                  {new Date(assignment.start_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Compliance Progress */}
                          {assignment.compliance && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-[color:var(--fc-text-subtle)]">Compliance</span>
                                <span className={`text-xs font-medium ${getComplianceColor(compliancePercentage)}`}>
                                  {compliancePercentage}% ({assignment.compliance.completed_days}/{assignment.compliance.total_days})
                                </span>
                              </div>
                              <div className="w-full bg-[color:var(--fc-glass-soft)] rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    compliancePercentage >= 80 ? 'bg-[color:var(--fc-status-success)]' :
                                    compliancePercentage >= 60 ? 'bg-[color:var(--fc-status-warning)]' : 'bg-[color:var(--fc-status-error)]'
                                  }`}
                                  style={{ width: `${compliancePercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {assignment.notes && (
                            <p className="text-xs text-[color:var(--fc-text-dim)] line-clamp-2">
                              {assignment.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              // View details action
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Message client action
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUnassignMealPlan(assignment.id)
                            }}
                            className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-status-error)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedAssignments.length === 0 && (
            <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Users className="w-16 h-16 sm:w-20 sm:h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[color:var(--fc-accent-cyan)] rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-3">
                  {assignments.length === 0 ? 'No assignments yet' : 'No assignments found'}
                </h3>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                  {assignments.length === 0 
                    ? 'Start by creating meal plans and assigning them to your clients.'
                    : 'Try adjusting your search or filter criteria to find the assignments you\'re looking for.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => {/* Handle assign plan action */}}
                    className="fc-btn fc-btn-primary"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Assign Meal Plan
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/coach/nutrition')}
                    className="fc-btn fc-btn-ghost"
                  >
                    <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Create Plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
    </div>
  )
}
