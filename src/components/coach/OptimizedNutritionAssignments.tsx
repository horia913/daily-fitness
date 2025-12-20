'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
    'active': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'upcoming': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'completed': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    'paused': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'inactive': 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
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
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
      {/* Enhanced Header */}
      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                style={{ padding: '8px', borderRadius: '20px' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
                    Nutrition Assignments
                  </h1>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                    Manage and track client nutrition plan assignments
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={loadAssignments}
                style={{ borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600' }}
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => {/* Handle assign plan action */}}
                style={{ backgroundColor: '#6C5CE7', borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Assign Plan</span>
                <span className="sm:hidden">Assign</span>
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px', minHeight: '120px' }}>
              <div className="flex flex-col items-center text-center gap-3">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                </div>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignments.length}</p>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Assignments</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px', minHeight: '120px' }}>
              <div className="flex flex-col items-center text-center gap-3">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                </div>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {assignments.filter(a => getAssignmentStatus(a) === 'active').length}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Active</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px', minHeight: '120px' }}>
              <div className="flex flex-col items-center text-center gap-3">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                </div>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {assignments.length > 0 
                      ? Math.round(assignments.reduce((sum, a) => sum + getCompliancePercentage(a), 0) / assignments.length)
                      : 0
                    }%
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Avg Compliance</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px', minHeight: '120px' }}>
              <div className="flex flex-col items-center text-center gap-3">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                </div>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <p style={{ fontSize: '40px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.1', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {assignments.reduce((sum, a) => sum + (a.compliance?.streak_days || 0), 0)}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Total Streaks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Search and Filters */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
            <div className="space-y-4 sm:space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '48px', height: '48px', borderRadius: '16px', border: '2px solid #E5E7EB', fontSize: '16px', backgroundColor: '#FFFFFF' }}
                />
              </div>

              {/* Filters - Mobile First */}
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger style={{ height: '48px', borderRadius: '16px', border: '2px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
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
                  <SelectTrigger style={{ height: '48px', borderRadius: '16px', border: '2px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
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
                    <SelectTrigger style={{ height: '48px', borderRadius: '16px', border: '2px solid #E5E7EB', backgroundColor: '#FFFFFF', flex: 1 }}>
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
                    style={{ height: '48px', padding: '12px', borderRadius: '20px' }}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>View:</span>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    style={{ borderRadius: '20px', padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    style={{ borderRadius: '20px', padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </div>
          </div>

          {/* Spacing between search/filter and assignment cards */}
          <div style={{ marginBottom: '32px' }}></div>

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
                    style={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '24px', 
                      padding: '24px', 
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', 
                      marginBottom: '20px',
                      border: '2px solid #E5E7EB',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4CAF50'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                      {/* Header with Client Info */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '600' }}>
                            {assignment.client?.first_name?.[0]}{assignment.client?.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                              {assignment.client?.first_name} {assignment.client?.last_name}
                            </h3>
                            <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                              {assignment.meal_plan?.name}
                            </p>
                          </div>
                        </div>
                        
                      </div>

                      {/* Status and Date */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge style={{ 
                          backgroundColor: status === 'active' ? '#D1FAE5' : status === 'upcoming' ? '#DBEAFE' : status === 'completed' ? '#EDE7F6' : status === 'paused' ? '#FEF3C7' : '#F3F4F6',
                          color: status === 'active' ? '#065F46' : status === 'upcoming' ? '#1E40AF' : status === 'completed' ? '#6B21A8' : status === 'paused' ? '#92400E' : '#374151',
                          borderRadius: '12px', 
                          padding: '4px 10px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          border: '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabels[status]}
                        </Badge>
                        <div style={{ fontSize: '12px', fontWeight: '400', color: '#6B7280' }}>
                          {new Date(assignment.start_date).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Compliance Indicator */}
                      {assignment.compliance && (
                        <div style={{ marginBottom: '20px' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span style={{ fontSize: '12px', fontWeight: '400', color: '#6B7280' }}>Compliance</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: compliancePercentage >= 80 ? '#059669' : compliancePercentage >= 60 ? '#D97706' : '#DC2626' }}>
                              {compliancePercentage}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '36px', backgroundColor: '#E0E0E0', borderRadius: '18px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '36px', 
                                borderRadius: '18px', 
                                backgroundColor: compliancePercentage >= 80 ? '#4CAF50' : compliancePercentage >= 60 ? '#FFC107' : '#EF4444',
                                width: `${compliancePercentage}%`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                                {compliancePercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // View details action
                          }}
                          style={{ flex: 1, borderRadius: '20px', padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}
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
                          style={{ borderRadius: '20px', padding: '12px' }}
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
                          style={{ borderRadius: '20px', padding: '12px', color: '#EF4444' }}
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
                    style={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '24px', 
                      padding: '24px', 
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', 
                      marginBottom: '16px',
                      border: '2px solid #E5E7EB',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4CAF50'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Client Avatar */}
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '600', flexShrink: 0 }}>
                        {assignment.client?.first_name?.[0]}{assignment.client?.last_name?.[0]}
                      </div>

                        {/* Assignment Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold ${theme.text} text-base sm:text-lg mb-1 truncate`}>
                                {assignment.client?.first_name} {assignment.client?.last_name}
                              </h3>
                              <p className={`text-sm ${theme.textSecondary} mb-2`}>
                                {assignment.meal_plan?.name}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${statusColors[status]} border-0 text-xs px-2 py-1`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusLabels[status]}
                                </Badge>
                                <span className={`text-xs ${theme.textSecondary}`}>
                                  {new Date(assignment.start_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Compliance Progress */}
                          {assignment.compliance && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs ${theme.textSecondary}`}>Compliance</span>
                                <span className={`text-xs font-medium ${getComplianceColor(compliancePercentage)}`}>
                                  {compliancePercentage}% ({assignment.compliance.completed_days}/{assignment.compliance.total_days})
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    compliancePercentage >= 80 ? 'bg-green-500' :
                                    compliancePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${compliancePercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {assignment.notes && (
                            <p className={`text-xs ${theme.textSecondary} line-clamp-2`}>
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
                            className="rounded-xl p-2"
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
                            className="rounded-xl p-2"
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
                            className="rounded-xl p-2 text-red-600 hover:text-red-700"
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
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px', textAlign: 'center' }}>
              <div className="relative">
                <Users className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mx-auto mb-6" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
                {assignments.length === 0 ? 'No assignments yet' : 'No assignments found'}
              </h3>
              <p style={{ fontSize: '16px', fontWeight: '400', color: '#6B7280', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px auto' }}>
                {assignments.length === 0 
                  ? 'Start by creating meal plans and assigning them to your clients.'
                  : 'Try adjusting your search or filter criteria to find the assignments you\'re looking for.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => {/* Handle assign plan action */}}
                  style={{ backgroundColor: '#6C5CE7', borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Assign Meal Plan
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/coach/nutrition')}
                  style={{ borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600' }}
                >
                  <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Create Plans
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
    </div>
  )
}
