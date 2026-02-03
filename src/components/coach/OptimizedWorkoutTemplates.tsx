'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Plus, 
  Search, 
  Dumbbell, 
  Clock,
  Edit,
  Trash2,
  Play,
  Users,
  UserPlus,
  Copy,
  ArrowLeft,
  RefreshCw,
  Star,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WorkoutTemplateForm from '@/components/WorkoutTemplateForm'
import WorkoutAssignmentModal from '@/components/WorkoutAssignmentModal'
import WorkoutDetailModal from '@/components/WorkoutDetailModal'

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  category_id: string
  estimated_duration: number
  difficulty_level: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: {
    name: string
    color: string
  }
  exercise_count?: number
  usage_count?: number
  rating?: number
  last_used?: string | null
}

interface WorkoutCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface OptimizedWorkoutTemplatesProps {
  coachId?: string
}

export default function OptimizedWorkoutTemplates({ }: OptimizedWorkoutTemplatesProps) {
  const { getThemeStyles } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [categories, setCategories] = useState<WorkoutCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedDuration, setSelectedDuration] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage' | 'rating' | 'duration'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedTemplateForAssignment, setSelectedTemplateForAssignment] = useState<WorkoutTemplate | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTemplateForDetail, setSelectedTemplateForDetail] = useState<WorkoutTemplate | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())

  const difficultyColors = {
    'Beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'Intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'Advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const difficultyLabels = {
    'Beginner': 'Beginner',
    'Intermediate': 'Intermediate',
    'Advanced': 'Advanced'
  }

  const durationRanges = [
    { label: 'Quick (< 30 min)', min: 0, max: 30 },
    { label: 'Standard (30-60 min)', min: 30, max: 60 },
    { label: 'Extended (60+ min)', min: 60, max: 999 }
  ]

  useEffect(() => {
    loadTemplates()
    loadCategories()
  }, [])

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('workout_templates')
          .select(`
            *,
            category:workout_categories(name, color)
          `)
          .eq('coach_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        const templateIds = (data || []).map((t: { id: string }) => t.id)
        if (templateIds.length === 0) {
          setTemplates(data || [])
          return
        }
        const { data: blocks } = await supabase.from('workout_blocks').select('id, template_id').in('template_id', templateIds)
        const blockIds = (blocks || []).map((b: { id: string }) => b.id)
        const [assignmentsRes, exercisesRes] = await Promise.all([
          supabase.from('workout_assignments').select('workout_template_id, assigned_date, scheduled_date').in('workout_template_id', templateIds),
          blockIds.length > 0 ? supabase.from('workout_block_exercises').select('block_id').in('block_id', blockIds) : { data: [] }
        ])
        const blocksByTemplate: Record<string, string[]> = {}
        ;(blocks || []).forEach((b: { id: string; template_id: string }) => {
          if (!blocksByTemplate[b.template_id]) blocksByTemplate[b.template_id] = []
          blocksByTemplate[b.template_id].push(b.id)
        })
        const blockToTemplate: Record<string, string> = {}
        ;(blocks || []).forEach((b: { id: string; template_id: string }) => { blockToTemplate[b.id] = b.template_id })
        const exerciseCountByTemplate: Record<string, number> = {}
        templateIds.forEach(id => (exerciseCountByTemplate[id] = 0))
        ;((exercisesRes as { data?: { block_id: string }[] }).data || []).forEach((r: { block_id: string }) => {
          const tid = blockToTemplate[r.block_id]
          if (tid) exerciseCountByTemplate[tid] = (exerciseCountByTemplate[tid] || 0) + 1
        })
        const usageByTemplate: Record<string, { count: number; lastDate: string }> = {}
        templateIds.forEach(id => (usageByTemplate[id] = { count: 0, lastDate: '' }))
        ;((assignmentsRes as { data?: { workout_template_id: string; assigned_date?: string; scheduled_date?: string }[] }).data || []).forEach((r: { workout_template_id: string; assigned_date?: string; scheduled_date?: string }) => {
          const d = (r.assigned_date || r.scheduled_date || '').toString().slice(0, 10)
          if (!usageByTemplate[r.workout_template_id]) usageByTemplate[r.workout_template_id] = { count: 0, lastDate: '' }
          usageByTemplate[r.workout_template_id].count++
          if (d > (usageByTemplate[r.workout_template_id].lastDate || '')) usageByTemplate[r.workout_template_id].lastDate = d
        })
        const templatesWithStats = (data || []).map((template: { id: string; updated_at?: string; created_at?: string } & Record<string, unknown>) => {
          const usage = usageByTemplate[template.id] || { count: 0, lastDate: '' }
          return {
            ...template,
            exercise_count: exerciseCountByTemplate[template.id] ?? 0,
            usage_count: usage.count,
            rating: 0,
            last_used: usage.lastDate ? new Date(usage.lastDate + 'T12:00:00Z').toISOString() : (template.updated_at || template.created_at || ''),
            updated_at: template.updated_at || template.created_at
          } as WorkoutTemplate
        })

        setTemplates(templatesWithStats)
      } catch {
        console.log('Database not ready, using localStorage fallback')
        const savedTemplates = localStorage.getItem(`workout_templates_${user.id}`)
        if (savedTemplates) {
          setTemplates(JSON.parse(savedTemplates))
        } else {
          const sampleTemplates = [
            {
              id: '1',
              name: 'Upper Body Strength',
              description: 'Build strength in chest, shoulders, and arms with compound movements',
              category_id: '1',
              estimated_duration: 45,
              difficulty_level: 'Intermediate',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 6,
              usage_count: 15,
              rating: 4.5,
              last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              category: { name: 'Upper Body', color: '#EF4444' }
            },
            {
              id: '2',
              name: 'Leg Day Blast',
              description: 'Complete lower body workout targeting quads, glutes, and hamstrings',
              category_id: '2',
              estimated_duration: 60,
              difficulty_level: 'Advanced',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 8,
              usage_count: 23,
              rating: 4.8,
              last_used: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              category: { name: 'Lower Body', color: '#10B981' }
            },
            {
              id: '3',
              name: 'HIIT Cardio',
              description: 'High-intensity interval training for maximum calorie burn',
              category_id: '3',
              estimated_duration: 30,
              difficulty_level: 'Intermediate',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 5,
              usage_count: 18,
              rating: 4.2,
              last_used: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              category: { name: 'Cardio', color: '#8B5CF6' }
            }
          ]
          setTemplates(sampleTemplates)
          localStorage.setItem(`workout_templates_${user.id}`, JSON.stringify(sampleTemplates))
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error loading categories:', error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const filteredAndSortedTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || template.category?.name === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty_level === selectedDifficulty
      
      let matchesDuration = true
      if (selectedDuration !== 'all') {
        const durationRange = durationRanges.find(range => range.label === selectedDuration)
        if (durationRange) {
          matchesDuration = template.estimated_duration >= durationRange.min && template.estimated_duration <= durationRange.max
        }
      }
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesDuration
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'usage':
          comparison = (a.usage_count || 0) - (b.usage_count || 0)
          break
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0)
          break
        case 'duration':
          comparison = a.estimated_duration - b.estimated_duration
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this workout template?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { error } = await supabase
          .from('workout_templates')
          .update({ is_active: false })
          .eq('id', templateId)

        if (error) throw error
      } catch {
        console.log('Database not ready, using localStorage fallback')
        const savedTemplates = localStorage.getItem(`workout_templates_${user.id}`)
        let templates = savedTemplates ? JSON.parse(savedTemplates) : []
        templates = templates.filter((template: WorkoutTemplate) => template.id !== templateId)
        localStorage.setItem(`workout_templates_${user.id}`, JSON.stringify(templates))
      }

      setTemplates(templates.filter(template => template.id !== templateId))
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const duplicateTemplate = async (template: WorkoutTemplate) => {
    const duplicatedTemplate: WorkoutTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      last_used: undefined
    }
    
    setTemplates([duplicatedTemplate, ...templates])
  }

  const toggleTemplateSelection = (templateId: string) => {
    const newSelected = new Set(selectedTemplates)
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId)
    } else {
      newSelected.add(templateId)
    }
    setSelectedTemplates(newSelected)
  }

  const selectAllTemplates = () => {
    setSelectedTemplates(new Set(filteredAndSortedTemplates.map(t => t.id)))
  }

  const clearSelection = () => {
    setSelectedTemplates(new Set())
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
      <div className={`p-4 sm:p-6 ${theme.background} relative overflow-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                className="fc-btn fc-btn-ghost h-10 w-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)] mb-1 sm:mb-2">
                  Workout Templates 🏋️
                </h1>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)]">
                  Create and manage professional workout templates for your clients
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={loadTemplates}
                className="fc-btn fc-btn-ghost flex items-center gap-2"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="fc-btn fc-btn-primary flex items-center gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="sm:hidden">Create</span>
                <span className="hidden sm:inline">Create Template</span>
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{templates.length}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Templates</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {Math.round(templates.reduce((sum, t) => sum + t.estimated_duration, 0) / templates.length) || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Star className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {templates.length > 0 
                        ? (templates.reduce((sum, t) => sum + (t.rating || 0), 0) / templates.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Search and Filters */}
          <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-[color:var(--fc-text-subtle)] w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input pl-10 sm:pl-12 h-10 sm:h-12 text-base sm:text-lg"
                  />
                </div>

                {/* Filters - Mobile First */}
                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="fc-select h-10 sm:h-12">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="fc-select h-10 sm:h-12">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Beginner">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Beginner
                        </div>
                      </SelectItem>
                      <SelectItem value="Intermediate">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Intermediate
                        </div>
                      </SelectItem>
                      <SelectItem value="Advanced">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Advanced
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger className="fc-select h-10 sm:h-12">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Durations</SelectItem>
                      {durationRanges.map(range => (
                        <SelectItem key={range.label} value={range.label}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {range.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value: 'name' | 'created' | 'usage' | 'rating' | 'duration') => setSortBy(value)}>
                      <SelectTrigger className="fc-select h-10 sm:h-12 flex-1">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="created">Date Created</SelectItem>
                        <SelectItem value="usage">Usage Count</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="fc-btn fc-btn-ghost h-10 sm:h-12 px-3"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* View Controls and Selection */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
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

                  <div className="flex items-center gap-2">
                    {selectedTemplates.size > 0 && (
                      <>
                        <span className="text-sm text-[color:var(--fc-text-dim)]">
                          {selectedTemplates.size} selected
                        </span>
                        <Button variant="outline" size="sm" onClick={clearSelection} className="fc-btn fc-btn-ghost">
                          Clear
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectAllTemplates} className="fc-btn fc-btn-ghost">
                          Select All
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredAndSortedTemplates.map(template => {
                const isSelected = selectedTemplates.has(template.id)
                
                return (
                  <Card 
                    key={template.id} 
                    className={`fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] transition-all duration-300 cursor-pointer group ${
                      isSelected ? 'border-[color:var(--fc-accent-cyan)]/50 bg-[color:var(--fc-glass-soft)] scale-105' : 'hover:border-[color:var(--fc-glass-border-strong)] hover:scale-105'
                    }`}
                    onClick={() => toggleTemplateSelection(template.id)}
                  >
                    {/* Template Header */}
                    <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[color:var(--fc-glass-soft)] to-[color:var(--fc-glass-base)] rounded-t-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                      
                      {/* Category Color Indicator */}
                      {template.category && (
                        <div 
                          className="absolute top-2 sm:top-3 left-2 sm:left-3 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: template.category.color }}
                        />
                      )}

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}

                      {/* Difficulty Badge */}
                      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
                        <Badge className={`${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]} border-0 text-xs px-2 py-1`}>
                          {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
                        </Badge>
                      </div>

                      {/* Duration */}
                      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3">
                        <div className="flex items-center gap-1 px-2 py-1 bg-[color:var(--fc-glass-base)] rounded-lg shadow-sm border border-[color:var(--fc-glass-border)]">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-medium">{template.estimated_duration}m</span>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {/* Template Name and Category */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[color:var(--fc-text-primary)] text-base sm:text-lg mb-1 truncate">
                            {template.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-3 h-3 sm:w-4 sm:h-4 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">
                              {template.category?.name || 'Uncategorized'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {template.description && (
                        <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-[color:var(--fc-text-subtle)]">
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" />
                          <span>{template.exercise_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{template.usage_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          <span className="text-yellow-600 font-medium">Enhanced</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 sm:gap-2 pt-2 border-t border-[color:var(--fc-glass-border)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTemplateForDetail(template)
                            setShowDetailModal(true)
                          }}
                          className="flex-1 text-xs sm:text-sm fc-btn fc-btn-ghost"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTemplate(template)
                            setShowCreateForm(true)
                          }}
                          className="fc-btn fc-btn-ghost text-[color:var(--fc-accent-cyan)] p-2"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateTemplate(template)
                          }}
                          className="fc-btn fc-btn-ghost text-[color:var(--fc-status-success)] p-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTemplate(template.id)
                          }}
                          className="text-red-600 hover:text-red-700 rounded-xl p-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredAndSortedTemplates.map(template => {
                const isSelected = selectedTemplates.has(template.id)
                
                return (
                  <Card 
                    key={template.id} 
                    className={`fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] transition-all duration-300 cursor-pointer group ${
                      isSelected ? 'border-[color:var(--fc-accent-cyan)]/50 bg-[color:var(--fc-glass-soft)]' : 'hover:border-[color:var(--fc-glass-border-strong)]'
                    }`}
                    onClick={() => toggleTemplateSelection(template.id)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Template Image */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[color:var(--fc-glass-soft)] to-[color:var(--fc-glass-base)] rounded-xl overflow-hidden flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="w-6 h-6 sm:w-8 sm:h-8 text-[color:var(--fc-text-subtle)]" />
                          </div>
                          {template.category && (
                            <div 
                              className="absolute top-1 right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-white"
                              style={{ backgroundColor: template.category.color }}
                            />
                          )}
                        </div>

                        {/* Template Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[color:var(--fc-text-primary)] text-base sm:text-lg mb-1 truncate">
                                {template.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs sm:text-sm text-[color:var(--fc-text-dim)]">
                                  {template.category?.name || 'Uncategorized'}
                                </span>
                                <Badge className={`${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]} border-0 text-xs px-2 py-1`}>
                                  {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-[color:var(--fc-text-subtle)]">
                                  <Clock className="w-3 h-3" />
                                  <span>{template.estimated_duration}m</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>

                          {template.description && (
                            <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mb-3 line-clamp-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[color:var(--fc-text-subtle)]">
                            <span>{template.exercise_count || 0} exercises</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{template.usage_count || 0} assignments</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span>{template.rating || 0} rating</span>
                            </div>
                            <span className="hidden sm:inline">Created: {new Date(template.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions - Mobile Optimized */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTemplateForAssignment(template)
                              setShowAssignmentModal(true)
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTemplateForDetail(template)
                              setShowDetailModal(true)
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTemplate(template)
                              setShowCreateForm(true)
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateTemplate(template)
                            }}
                            className="fc-btn fc-btn-ghost text-[color:var(--fc-status-success)] p-2"
                          >
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTemplate(template.id)
                            }}
                            className="fc-btn fc-btn-ghost text-[color:var(--fc-status-error)] p-2"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedTemplates.length === 0 && (
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Dumbbell className="w-16 h-16 sm:w-20 sm:h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-3">
                  {templates.length === 0 ? 'No templates yet' : 'No templates found'}
                </h3>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                  {templates.length === 0 
                    ? 'Start creating professional workout templates for your clients with comprehensive exercise programming.'
                    : 'Try adjusting your search or filter criteria to find the templates you\'re looking for.'
                  }
                </p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="fc-btn fc-btn-primary"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create Your First Template</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="fc-btn fc-btn-primary w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
            >
              <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
            </Button>
          </div>

          {/* Modals */}
          <WorkoutTemplateForm
            isOpen={showCreateForm}
            onClose={() => {
              setShowCreateForm(false)
              setEditingTemplate(null)
            }}
            onSuccess={() => {
              loadTemplates()
              setShowCreateForm(false)
              setEditingTemplate(null)
            }}
            template={editingTemplate || undefined}
          />

          <WorkoutAssignmentModal
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false)
              setSelectedTemplateForAssignment(null)
            }}
            onSuccess={() => {
              console.log('Workout assigned successfully!')
              setShowAssignmentModal(false)
              setSelectedTemplateForAssignment(null)
            }}
            preselectedTemplate={selectedTemplateForAssignment || undefined}
          />

          <WorkoutDetailModal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedTemplateForDetail(null)
            }}
            template={selectedTemplateForDetail}
            onWorkoutUpdated={() => {
              loadTemplates()
            }}
          />
        </div>
      </div>
    </div>
  )
}
