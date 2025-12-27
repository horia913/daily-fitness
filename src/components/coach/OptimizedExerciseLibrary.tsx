'use client'

import { useState, useEffect } from 'react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
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
  Clock,
  Users,
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
  const { isDark, getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(true)
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

  const equipmentOptions = [
    'Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
    'Cable Machine', 'Smith Machine', 'Bench', 'Pull-up Bar', 'Medicine Ball',
    'Stability Ball', 'Foam Roller', 'Yoga Mat', 'Treadmill', 'Bike',
    'Rowing Machine', 'Elliptical', 'Jump Rope'
  ]

  useEffect(() => {
    loadExercises()
    loadCategories()
  }, [])

  const loadExercises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let exercisesFromDB: Exercise[] = []
      let useLocalStorage = false

      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        exercisesFromDB = data || []
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        useLocalStorage = true
      }

      // Always check localStorage as fallback or merge with DB data
      const savedExercises = localStorage.getItem(`exercises_${user.id}`)
      const exercisesFromStorage = savedExercises ? JSON.parse(savedExercises) : []

      if (useLocalStorage) {
        // Use localStorage if database failed
        if (exercisesFromStorage.length > 0) {
          setExercises(exercisesFromStorage)
        } else {
          // Initialize with sample exercises if nothing in localStorage
          const sampleExercises = [
            {
              id: '1',
              name: 'Push-ups',
              description: 'Classic bodyweight exercise for chest, shoulders, and triceps',
              category: 'Strength',
              muscle_groups: ['Chest', 'Shoulders', 'Triceps'],
              equipment: ['Bodyweight'],
              difficulty: 'beginner',
              instructions: ['Start in plank position', 'Lower body to ground', 'Push back up'],
              tips: ['Keep core tight', 'Full range of motion'],
              is_public: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              usage_count: 15,
              rating: 4.5
            },
            {
              id: '2',
              name: 'Squats',
              description: 'Fundamental lower body exercise',
              category: 'Strength',
              muscle_groups: ['Quadriceps', 'Glutes', 'Hamstrings'],
              equipment: ['Bodyweight'],
              difficulty: 'beginner',
              instructions: ['Stand with feet shoulder-width apart', 'Lower down as if sitting', 'Return to standing'],
              tips: ['Keep knees behind toes', 'Chest up'],
              is_public: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              usage_count: 23,
              rating: 4.8
            },
            {
              id: '3',
              name: 'Deadlifts',
              description: 'Compound movement for posterior chain development',
              category: 'Strength',
              muscle_groups: ['Hamstrings', 'Glutes', 'Lower Back'],
              equipment: ['Barbell'],
              difficulty: 'advanced',
              instructions: ['Stand with feet hip-width apart', 'Hinge at hips to lower bar', 'Drive hips forward to stand'],
              tips: ['Keep bar close to body', 'Maintain neutral spine'],
              is_public: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              usage_count: 8,
              rating: 4.2
            }
          ]
          setExercises(sampleExercises)
          localStorage.setItem(`exercises_${user.id}`, JSON.stringify(sampleExercises))
        }
      } else {
        // Database worked - use DB data, but merge with localStorage if DB is empty
        if (exercisesFromDB.length > 0) {
          setExercises(exercisesFromDB)
        } else if (exercisesFromStorage.length > 0) {
          // DB is empty but localStorage has data - use localStorage
          setExercises(exercisesFromStorage)
        } else {
          setExercises([])
        }
      }
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_categories')
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

  const filteredAndSortedExercises = exercises
    .filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exercise.muscle_groups.some(group => group.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || exercise.difficulty === selectedDifficulty
      const matchesEquipment = selectedEquipment === 'all' || exercise.equipment.includes(selectedEquipment)
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
        return
      }

      setExercises(exercises.filter(exercise => exercise.id !== exerciseId))
    } catch (error) {
      console.error('Error deleting exercise:', error)
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
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text} mb-1 sm:mb-2`}>
                  Exercise Library 💪
                </h1>
                <p className={`text-base sm:text-lg ${theme.textSecondary}`}>
                  Manage your comprehensive exercise collection with visual richness
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={loadExercises}
                className="flex items-center gap-2 rounded-xl border-2 hover:border-blue-300 transition-all duration-200"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex-1 sm:flex-none"
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
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-blue-300 transition-all duration-300 hover:scale-105`}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-bold ${theme.text}`}>{exercises.length}</p>
                    <p className={`text-xs sm:text-sm ${theme.textSecondary} truncate`}>Exercises</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-green-300 transition-all duration-300 hover:scale-105`}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                      {exercises.filter(e => e.is_public).length}
                    </p>
                    <p className={`text-xs sm:text-sm ${theme.textSecondary} truncate`}>Public</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-purple-300 transition-all duration-300 hover:scale-105`}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                      {exercises.reduce((sum, e) => sum + (e.usage_count || 0), 0)}
                    </p>
                    <p className={`text-xs sm:text-sm ${theme.textSecondary} truncate`}>Usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:border-orange-300 transition-all duration-300 hover:scale-105`}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <Star className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                      {exercises.length > 0 
                        ? (exercises.reduce((sum, e) => sum + (e.rating || 0), 0) / exercises.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <p className={`text-xs sm:text-sm ${theme.textSecondary} truncate`}>Rating</p>
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
          <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-2 text-base sm:text-lg focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                {/* Filters - Mobile First */}
                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 focus:border-blue-500 transition-all duration-200">
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
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 focus:border-blue-500 transition-all duration-200">
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
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 focus:border-blue-500 transition-all duration-200">
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
                      <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 flex-1 focus:border-blue-500 transition-all duration-200">
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
                      className="h-10 sm:h-12 px-3 rounded-xl border-2 hover:border-blue-300 transition-all duration-200"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* View Controls and Selection */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${theme.textSecondary}`}>View:</span>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-xl"
                    >
                      <Grid3X3 className="w-4 h-4" />
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

                  <div className="flex items-center gap-2">
                        <span className={`text-sm ${theme.textSecondary}`}>
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
                
                return (
                  <Card 
                    key={exercise.id} 
                    className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-xl transition-all duration-300 group hover:border-purple-300 dark:hover:border-purple-600 hover:scale-105`}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                      {/* Header with Icon and Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30">
                            <IconComponent className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${difficultyColors[exercise.difficulty as keyof typeof difficultyColors]} border-0 text-xs px-2 py-1 w-fit`}>
                          {difficultyLabels[exercise.difficulty as keyof typeof difficultyLabels]}
                        </Badge>
                            {exercise.is_public ? (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-0 text-xs px-2 py-1 w-fit">
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs px-2 py-1 w-fit">
                                Private
                              </Badge>
                            )}
                      </div>
                        </div>
                        {exercise.video_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoPlayerExercise(exercise)
                            }}
                            className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-xl p-2"
                            title="Watch Video"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                    </div>

                      {/* Exercise Name and Category */}
                      <div>
                        <h3 className={`font-bold ${theme.text} text-lg sm:text-xl mb-2`}>
                            {exercise.name}
                          </h3>
                          <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className={`text-sm ${theme.textSecondary}`}>
                              {exercise.category}
                            </span>
                        </div>
                      </div>

                      {/* Description */}
                      {exercise.description && (
                        <p className={`text-xs sm:text-sm ${theme.textSecondary} line-clamp-2`}>
                          {exercise.description}
                        </p>
                      )}

                      {/* Muscle Groups */}
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscle_groups?.slice(0, 2).map(group => (
                          <Badge key={group} variant="outline" className="text-xs px-2 py-1">
                            {group}
                          </Badge>
                        ))}
                        {exercise.muscle_groups && exercise.muscle_groups.length > 2 && (
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            +{exercise.muscle_groups.length - 2}
                          </Badge>
                        )}
                      </div>

                      {/* Equipment */}
                      <div className={`text-xs ${theme.textSecondary} truncate`}>
                        {exercise.equipment?.join(', ') || 'No equipment'}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{exercise.usage_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span>{exercise.rating || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:inline">{new Date(exercise.created_at).toLocaleDateString()}</span>
                          <span className="sm:hidden">{new Date(exercise.created_at).toLocaleDateString().split('/')[0]}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingExercise(exercise)
                            setShowCreateForm(true)
                          }}
                          className="text-xs sm:text-sm rounded-xl"
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
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl text-xs sm:text-sm"
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
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-xl text-xs sm:text-sm"
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
            <div className="space-y-3 sm:space-y-4">
              {filteredAndSortedExercises.map(exercise => {
                const IconComponent = categoryIcons[exercise.category as keyof typeof categoryIcons] || Dumbbell
                
                return (
                  <Card 
                    key={exercise.id} 
                    className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-xl transition-all duration-300 group hover:border-purple-300 dark:hover:border-purple-600`}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Icon and Badges */}
                        <div className="flex flex-col gap-2 items-center">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30">
                            <IconComponent className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                          {exercise.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setVideoPlayerExercise(exercise)
                              }}
                              className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-xl p-2"
                              title="Watch Video"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Exercise Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold ${theme.text} text-lg sm:text-xl mb-2`}>
                                {exercise.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <div className="flex items-center gap-1">
                                  <IconComponent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  <span className={`text-sm ${theme.textSecondary}`}>
                                  {exercise.category}
                                </span>
                                </div>
                                <Badge className={`${difficultyColors[exercise.difficulty as keyof typeof difficultyColors]} border-0 text-xs px-2 py-1`}>
                                  {difficultyLabels[exercise.difficulty as keyof typeof difficultyLabels]}
                                </Badge>
                                {exercise.is_public ? (
                                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-0 text-xs px-2 py-1">
                                    Public
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs px-2 py-1">
                                    Private
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {exercise.description && (
                            <p className={`text-sm ${theme.textSecondary} mb-3 line-clamp-2`}>
                              {exercise.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="truncate">Muscles: {exercise.muscle_groups.slice(0, 2).join(', ')}{exercise.muscle_groups.length > 2 ? '...' : ''}</span>
                            <span className="truncate">Equipment: {exercise.equipment.slice(0, 2).join(', ')}{exercise.equipment.length > 2 ? '...' : ''}</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{exercise.usage_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span>{exercise.rating || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions - Mobile Optimized */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingExercise(exercise)
                              setShowCreateForm(true)
                            }}
                            className="rounded-xl p-2"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAlternativesModalExercise(exercise)
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl p-2"
                            title="Manage Alternatives"
                          >
                            <Shuffle className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteExercise(exercise.id)
                            }}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-xl p-2"
                            title="Delete Exercise"
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
          {filteredAndSortedExercises.length === 0 && (
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Dumbbell className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className={`text-xl sm:text-2xl font-semibold ${theme.text} mb-3`}>
                  {exercises.length === 0 ? 'No exercises yet' : 'No exercises found'}
                </h3>
                <p className={`text-base sm:text-lg ${theme.textSecondary} mb-8 max-w-md mx-auto`}>
                  {exercises.length === 0 
                    ? 'Start building your exercise library by adding your first exercise with rich media and detailed instructions.'
                    : 'Try adjusting your search or filter criteria to find the exercises you\'re looking for.'
                  }
                </p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
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
              loadExercises()
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
