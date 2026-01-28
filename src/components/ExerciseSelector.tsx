'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Search, Dumbbell, Image } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ExerciseThumbnail } from '@/components/ui/optimized-image'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  image_url?: string
  created_at: string
}

interface ExerciseSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  templateId: string
}

export default function ExerciseSelector({ isOpen, onClose, onSelect, templateId }: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      loadExercises()
    }
  }, [isOpen])

  useEffect(() => {
    filterExercises()
  }, [exercises, searchTerm, selectedCategory])

  const loadExercises = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('coach_id', user.id)
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        const exerciseData = data || []
        setExercises(exerciseData)
        
        // Extract unique categories
        const uniqueCategories = [...new Set(exerciseData.map(ex => ex.category))].sort()
        setCategories(uniqueCategories)
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        const savedExercises = localStorage.getItem(`exercises_${user.id}`)
        if (savedExercises) {
          const exerciseData = JSON.parse(savedExercises)
          setExercises(exerciseData)
          
          // Extract unique categories
          const uniqueCategories = [...new Set(exerciseData.map((ex: any) => ex.category))].sort() as string[]
          setCategories(uniqueCategories)
        } else {
          // Sample data
          const sampleExercises = [
            { id: '1', name: 'Push-ups', description: 'Classic bodyweight exercise', category: 'Upper Body', created_at: new Date().toISOString() },
            { id: '2', name: 'Squats', description: 'Lower body strength exercise', category: 'Lower Body', created_at: new Date().toISOString() },
            { id: '3', name: 'Plank', description: 'Core strengthening exercise', category: 'Core', created_at: new Date().toISOString() },
            { id: '4', name: 'Burpees', description: 'Full body cardio exercise', category: 'Cardio', created_at: new Date().toISOString() },
            { id: '5', name: 'Pull-ups', description: 'Upper body pulling exercise', category: 'Upper Body', created_at: new Date().toISOString() },
            { id: '6', name: 'Lunges', description: 'Lower body unilateral exercise', category: 'Lower Body', created_at: new Date().toISOString() }
          ]
          setExercises(sampleExercises)
          setCategories(['Upper Body', 'Lower Body', 'Core', 'Cardio'])
        }
      }
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExercises = () => {
    let filtered = exercises

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory)
    }

    setFilteredExercises(filtered)
  }

  const handleSelectExercise = (exercise: Exercise) => {
    onSelect(exercise)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-start p-4">
      <div className="w-full max-w-sm" style={{maxWidth: '400px'}}>
        <div className="fc-modal fc-card w-full h-[95vh] overflow-y-auto">
          <div className="p-4 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Exercise Library
                </span>
                <div className="text-lg font-semibold fc-text-primary mt-2">Select Exercise</div>
                <p className="text-sm fc-text-subtle">
                  Choose an exercise to add to your template
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="fc-btn fc-btn-ghost">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 fc-text-subtle w-4 h-4" />
                <Input
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                />
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="fc-text-subtle">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-[color:var(--fc-glass-border)] rounded-lg"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Exercises List */}
              {!loading && (
                <div className="space-y-3">
                  {filteredExercises.map(exercise => (
                    <div 
                      key={exercise.id} 
                      className="fc-glass fc-card border border-[color:var(--fc-glass-border)] transition-all fc-hover-rise cursor-pointer"
                      onClick={() => handleSelectExercise(exercise)}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {exercise.image_url ? (
                              <ExerciseThumbnail
                                src={exercise.image_url}
                                alt={exercise.name}
                                size="small"
                                className="w-12 h-12"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                                <Dumbbell className="w-6 h-6 fc-text-subtle" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium fc-text-primary">{exercise.name}</h3>
                            <p className="text-sm fc-text-subtle mt-1 line-clamp-2">
                              {exercise.description}
                            </p>
                            <div className="mt-2">
                              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                                {exercise.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredExercises.length === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts w-14 h-14">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium fc-text-primary mb-1">No exercises found</h3>
                  <p className="text-sm fc-text-subtle">
                    {exercises.length === 0 
                      ? 'Create some exercises first to add to your template.'
                      : 'Try adjusting your search or filter criteria.'
                    }
                  </p>
                </div>
              )}

              {/* Cancel Button */}
              <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
                <Button variant="outline" onClick={onClose} className="w-full fc-btn fc-btn-secondary">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
