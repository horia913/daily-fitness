'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Plus, 
  Search, 
  Dumbbell, 
  Heart, 
  Zap, 
  Target, 
  Trophy, 
  Shield,
  Edit,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Play,
  Star,
  TrendingUp,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Shuffle,
  Globe
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import ExerciseForm from '@/components/ExerciseForm'
import ExerciseAlternativesModal from '@/components/coach/ExerciseAlternativesModal'
import VideoPlayerModal from '@/components/VideoPlayerModal'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: string
  instructions: string[]
  tips: string[]
  video_url?: string
  image_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
  usage_count?: number
  rating?: number
}

interface ExerciseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface OptimizedExerciseLibraryProps {
  coachId?: string
}

export default function OptimizedExerciseLibrary({ }: OptimizedExerciseLibraryProps) {
  const { getThemeStyles, performanceSettings } = useTheme()
  const { addToast } = useToast()
  const router = useRouter()
  const theme = getThemeStyles()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)
  const didLoadRef = useRef(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedEquipment, setSelectedEquipment] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage' | 'rating'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [alternativesModalExercise, setAlternativesModalExercise] = useState<Exercise | null>(null)
  const [videoPlayerExercise, setVideoPlayerExercise] = useState<Exercise | null>(null)

  const categoryIcons = {
    'Strength': Dumbbell,
    'Cardio': Heart,
    'Flexibility': Zap,
    'Balance': Target,
    'Sports': Trophy,
    'Rehabilitation': Shield
  }

  const difficultyColors = {
    'beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const difficultyLabels = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  }

  /** Difficulty as 1–5 filled dots (beginner=1, intermediate=2–3, advanced=4, athlete=5). */
  function getDifficultyDotCount(difficulty: string): number {
    const map: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 4,
      athlete: 5,
    }
    return map[difficulty?.toLowerCase()] ?? 2
  }

  function DifficultyDots({ difficulty }: { difficulty: string }) {
    const filled = getDifficultyDotCount(difficulty)
    return (
      <div className="flex items-center gap-0.5" title={difficultyLabels[difficulty as keyof typeof difficultyLabels] ?? difficulty}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`inline-block w-1.5 h-1.5 rounded-full ${i <= filled ? 'bg-[color:var(--fc-text-primary)]' : 'bg-[color:var(--fc-text-subtle)] opacity-50'}`}
          />
        ))}
      </div>
    )
  }

  const equipmentOptions = [
    'Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
    'Cable Machine', 'Smith Machine', 'Bench', 'Pull-up Bar', 'Medicine Ball',
    'Stability Ball', 'Foam Roller', 'Yoga Mat', 'Treadmill', 'Bike',
    'Rowing Machine', 'Elliptical', 'Jump Rope'
  ]

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (didLoadRef.current) return
    if (loadingRef.current) return
    didLoadRef.current = true
    loadingRef.current = true
    try {
      setLoading(true)
      const res = await fetch('/api/coach/exercises', { signal: signal ?? null })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const { exercises: exList, categories: catList } = await res.json()
      setExercises(Array.isArray(exList) ? exList : [])
      setCategories(Array.isArray(catList) ? catList : [])
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        didLoadRef.current = false
        return
      }
      console.error('Error loading exercises:', err)
      didLoadRef.current = false
      setExercises([])
      setCategories([])
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    loadData(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [loadData])

  const filteredAndSortedExercises = exercises
    .filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (exercise.muscle_groups || []).some(group => group.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || exercise.difficulty === selectedDifficulty
      const matchesEquipment = selectedEquipment === 'all' || (exercise.equipment || []).includes(selectedEquipment)
      return matchesSearch && matchesCategory && matchesDifficulty && matchesEquipment
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
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) {
        console.error('Error deleting exercise:', error)
        
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          addToast({ title: 'Cannot delete this exercise because it is currently being used in workout templates. Please remove it from all workouts first, or deactivate it instead.', variant: 'destructive' })
          return
        }
        
        // Generic error message
        addToast({ title: 'Failed to delete exercise. Please try again.', variant: 'destructive' })
        return
      }

      setExercises(exercises.filter(exercise => exercise.id !== exerciseId))
    } catch (error) {
      console.error('Error deleting exercise:', error)
      addToast({ title: 'An error occurred while deleting the exercise. Please try again.', variant: 'destructive' })
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
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen">
        {/* Enhanced Header */}
      <div className={`p-4 sm:p-6 ${theme.background} relative overflow-hidden`}>
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
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
                <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)] mb-1 sm:mb-2">
                  Exercise Library 💪
                </h1>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)]">
                  Manage your comprehensive exercise collection with visual richness
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => { didLoadRef.current = false; loadData(); }}
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
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Exercise</span>
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
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">{exercises.length}</p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Exercises</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {exercises.filter(e => e.is_public).length}
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Public</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-[color:var(--fc-glass-soft)]">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-[color:var(--fc-domain-workouts)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      {exercises.reduce((sum, e) => sum + (e.usage_count || 0), 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Usage</p>
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
                      {exercises.length > 0 
                        ? (exercises.reduce((sum, e) => sum + (e.rating || 0), 0) / exercises.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] truncate">Rating</p>
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
                    placeholder="Search exercises..."
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
                      <SelectItem value="beginner">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Beginner
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Intermediate
                        </div>
                      </SelectItem>
                      <SelectItem value="advanced">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Advanced
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger className="fc-select h-10 sm:h-12">
                      <SelectValue placeholder="Equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Equipment</SelectItem>
                      {equipmentOptions.map(equipment => (
                        <SelectItem key={equipment} value={equipment}>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            {equipment}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value: 'name' | 'created' | 'usage' | 'rating') => setSortBy(value)}>
                      <SelectTrigger className="fc-select h-10 sm:h-12 flex-1">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="created">Date Created</SelectItem>
                        <SelectItem value="usage">Usage Count</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
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
                        <span className="text-sm text-[color:var(--fc-text-dim)]">
                      {filteredAndSortedExercises.length} exercise{filteredAndSortedExercises.length !== 1 ? 's' : ''}
                        </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredAndSortedExercises.map(exercise => {
                const IconComponent = categoryIcons[exercise.category as keyof typeof categoryIcons] || Dumbbell
                const primaryMuscle = exercise.muscle_groups?.[0] ?? exercise.category ?? '—'
                const equipmentStr = (exercise.equipment?.length ? exercise.equipment.slice(0, 2).join(', ') : 'No equipment') + (exercise.equipment?.length > 2 ? '…' : '')
                return (
                  <Card
                    key={exercise.id}
                    className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 group hover:scale-105"
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      {/* Image or placeholder */}
                      <div className="aspect-video rounded-xl bg-[color:var(--fc-glass-highlight)] flex items-center justify-center overflow-hidden">
                        {exercise.image_url ? (
                          <img src={exercise.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <IconComponent className="w-10 h-10 text-[color:var(--fc-text-subtle)]" />
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-[color:var(--fc-text-primary)] text-lg leading-tight line-clamp-2 flex-1 min-w-0">
                          {exercise.name}
                        </h3>
                        {exercise.video_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoPlayerExercise(exercise)
                            }}
                            className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-accent-purple)] shrink-0"
                            title="Watch Video"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        {primaryMuscle} · {equipmentStr}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <DifficultyDots difficulty={exercise.difficulty} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[color:var(--fc-glass-border)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingExercise(exercise)
                            setShowCreateForm(true)
                          }}
                          className="text-xs sm:text-sm fc-btn fc-btn-ghost"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAlternativesModalExercise(exercise)
                          }}
                          className="text-xs sm:text-sm fc-btn fc-btn-ghost text-[color:var(--fc-status-warning)]"
                          title="Manage Alternatives"
                        >
                          <Shuffle className="w-3 h-3 mr-1" />
                          Swaps
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteExercise(exercise.id)
                          }}
                          className="text-xs sm:text-sm fc-btn fc-btn-ghost text-[color:var(--fc-status-error)]"
                          title="Delete Exercise"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedExercises.map(exercise => {
                const IconComponent = categoryIcons[exercise.category as keyof typeof categoryIcons] || Dumbbell
                const primaryMuscle = exercise.muscle_groups?.[0] ?? exercise.category ?? '—'
                const equipmentStr = (exercise.equipment?.length ? exercise.equipment.slice(0, 2).join(', ') : 'No equipment') + (exercise.equipment?.length > 2 ? '…' : '')
                return (
                  <Card
                    key={exercise.id}
                    className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[color:var(--fc-glass-highlight)] flex items-center justify-center shrink-0 overflow-hidden">
                          {exercise.image_url ? (
                            <img src={exercise.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <IconComponent className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[color:var(--fc-text-primary)] truncate">
                            {exercise.name}
                          </h3>
                          <p className="text-sm text-[color:var(--fc-text-dim)] truncate">
                            {primaryMuscle} · {equipmentStr}
                          </p>
                        </div>
                        <DifficultyDots difficulty={exercise.difficulty} />
                        <div className="flex items-center gap-1 shrink-0">
                          {exercise.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setVideoPlayerExercise(exercise)
                              }}
                              className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-accent-purple)]"
                              title="Watch Video"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingExercise(exercise)
                              setShowCreateForm(true)
                            }}
                            className="fc-btn fc-btn-ghost p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAlternativesModalExercise(exercise)
                            }}
                            className="fc-btn fc-btn-ghost text-[color:var(--fc-status-warning)] p-2"
                            title="Manage Alternatives"
                          >
                            <Shuffle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteExercise(exercise.id)
                            }}
                            className="fc-btn fc-btn-ghost text-[color:var(--fc-status-error)] p-2"
                            title="Delete Exercise"
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

          {/* Empty State */}
          {filteredAndSortedExercises.length === 0 && (
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Dumbbell className="w-16 h-16 sm:w-20 sm:h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-3">
                  {exercises.length === 0 ? 'No exercises yet' : 'No exercises found'}
                </h3>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                  {exercises.length === 0 
                    ? 'Start building your exercise library by adding your first exercise with rich media and detailed instructions.'
                    : 'Try adjusting your search or filter criteria to find the exercises you\'re looking for.'
                  }
                </p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="fc-btn fc-btn-primary"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="sm:hidden">Add</span>
                  <span className="hidden sm:inline">Add Your First Exercise</span>
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

          {/* Exercise Form Modal */}
          <ExerciseForm
            isOpen={showCreateForm}
            onClose={() => {
              setShowCreateForm(false)
              setEditingExercise(null)
            }}
            onSuccess={() => {
              didLoadRef.current = false
              loadData()
              setShowCreateForm(false)
              setEditingExercise(null)
            }}
            exercise={editingExercise}
          />

          {/* Exercise Alternatives Modal */}
          {alternativesModalExercise && (
            <ExerciseAlternativesModal
              isOpen={!!alternativesModalExercise}
              onClose={() => setAlternativesModalExercise(null)}
              exercise={alternativesModalExercise}
              allExercises={exercises}
            />
          )}

          {/* Video Player Modal */}
          {videoPlayerExercise && (
            <VideoPlayerModal
              isOpen={!!videoPlayerExercise}
              onClose={() => setVideoPlayerExercise(null)}
              videoUrl={videoPlayerExercise.video_url || ''}
              title={videoPlayerExercise.name}
            />
          )}
        </div>
      </div>
      </div>
    </AnimatedBackground>
  )
}
