'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  X, 
  Plus, 
  Trash2, 
  AlertCircle,
  Shuffle,
  Search,
  Lightbulb,
  Wrench,
  TrendingDown,
  Heart,
  User
} from 'lucide-react'
import WorkoutTemplateService, { ExerciseAlternative } from '@/lib/workoutTemplateService'

interface Exercise {
  id: string
  name: string
  description?: string
  category?: string
  muscle_groups?: string[]
  equipment?: string[]
  difficulty?: string
}

interface ExerciseAlternativesModalProps {
  isOpen: boolean
  onClose: () => void
  exercise: Exercise
  allExercises: Exercise[]
}

const reasonIcons = {
  equipment: Wrench,
  difficulty: TrendingDown,
  injury: Heart,
  preference: User
}

const reasonLabels = {
  equipment: 'Equipment',
  difficulty: 'Difficulty',
  injury: 'Injury',
  preference: 'Preference'
}

const reasonColors = {
  equipment: 'fc-text-workouts',
  difficulty: 'fc-text-warning',
  injury: 'fc-text-error',
  preference: 'fc-text-habits'
}

export default function ExerciseAlternativesModal({
  isOpen,
  onClose,
  exercise,
  allExercises
}: ExerciseAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false) // Controls showing/hiding the form
  const [addingInProgress, setAddingInProgress] = useState(false) // Tracks if the add operation is in progress
  
  // Add alternative form state
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>('')
  const [selectedReason, setSelectedReason] = useState<'equipment' | 'difficulty' | 'injury' | 'preference'>('equipment')
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAlternatives()
    }
  }, [isOpen, exercise.id])

  const loadAlternatives = async () => {
    setLoading(true)
    try {
      console.log('Loading alternatives for exercise:', exercise.id)
      const data = await WorkoutTemplateService.getExerciseAlternatives(exercise.id)
      console.log('Loaded alternatives:', data)
      setAlternatives(data || [])
    } catch (error) {
      console.error('Error loading alternatives:', error)
      setAlternatives([])
    } finally {
      setLoading(false)
    }
  }

  const addAlternative = async () => {
    if (!selectedAlternativeId) {
      alert('Please select an alternative exercise')
      return
    }

    if (addingInProgress) return // Prevent multiple clicks

    setAddingInProgress(true)
    try {
      console.log('Adding alternative:', {
        primaryExerciseId: exercise.id,
        alternativeExerciseId: selectedAlternativeId,
        reason: selectedReason,
        notes
      })

      const result = await WorkoutTemplateService.addExerciseAlternative(
        exercise.id,
        selectedAlternativeId,
        selectedReason,
        notes || undefined
      )

      console.log('Add alternative result:', result)

      // Reload alternatives list
      await loadAlternatives()
      // Reset form
      setSelectedAlternativeId('')
      setSelectedReason('equipment')
      setNotes('')
      setSearchTerm('')
    } catch (error) {
      console.error('Error adding alternative:', error)
      alert(`Error adding alternative: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Always reset the loading state
      setAddingInProgress(false)
    }
  }

  const removeAlternative = async (alternativeId: string) => {
    if (!confirm('Are you sure you want to remove this alternative?')) return

    setLoading(true)
    try {
      const success = await WorkoutTemplateService.removeExerciseAlternative(alternativeId)
      if (success) {
        await loadAlternatives()
      } else {
        alert('Failed to remove alternative')
      }
    } catch (error) {
      console.error('Error removing alternative:', error)
      alert('Error removing alternative')
    } finally {
      setLoading(false)
    }
  }

  // Filter available exercises (exclude current exercise and already added alternatives)
  const availableExercises = allExercises.filter(ex => {
    if (ex.id === exercise.id) return false // Exclude the current exercise
    if (alternatives.some(alt => alt.alternative_exercise_id === ex.id)) return false // Exclude already added alternatives
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return ex.name.toLowerCase().includes(search) ||
             ex.description?.toLowerCase().includes(search) ||
             ex.category?.toLowerCase().includes(search)
    }
    
    return true
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-24 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="fc-modal fc-card w-full overflow-hidden flex flex-col"
        style={{ 
          maxWidth: 'min(95vw, 50rem)',
          maxHeight: 'min(85vh, calc(100vh - 7rem))',
          height: 'min(85vh, calc(100vh - 7rem))'
        }}
      >
        {/* Header - Sticky */}
        <div className="border-b border-[color:var(--fc-glass-border)] py-5 px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <Shuffle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold fc-text-primary">
                  Exercise Alternatives
                </div>
                <p className="text-sm fc-text-dim mt-1">
                  {exercise.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 rounded-xl fc-btn fc-btn-ghost"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 fc-text-workouts flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold fc-text-primary mb-1">
                    What are exercise alternatives?
                  </h4>
                  <p className="text-sm fc-text-dim">
                    Alternatives allow clients to swap exercises during workouts when equipment isn't available,
                    an exercise is too difficult, or they have an injury. Set up smart alternatives to keep
                    your clients' workouts flexible and effective.
                  </p>
                </div>
              </div>
            </div>

            {/* Add Alternative Section */}
            {!adding ? (
              <Button
                onClick={() => setAdding(true)}
                className="w-full fc-btn fc-btn-primary fc-press rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Alternative Exercise
              </Button>
            ) : (
              <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold fc-text-primary">Add New Alternative</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAdding(false)
                        setSelectedAlternativeId('')
                        setNotes('')
                        setSearchTerm('')
                      }}
                      className="p-1 rounded-lg fc-btn fc-btn-ghost"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 fc-text-subtle w-4 h-4" />
                    <Input
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                    />
                  </div>

                  {/* Select Alternative Exercise */}
                  <div>
                    <label className="block text-sm font-medium fc-text-primary mb-2">
                      Alternative Exercise
                    </label>
                    <Select value={selectedAlternativeId} onValueChange={setSelectedAlternativeId}>
                      <SelectTrigger className="rounded-xl border border-[color:var(--fc-glass-border)] w-full">
                        <SelectValue placeholder="Select an alternative exercise..." />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-60" 
                        position="popper"
                        style={{ zIndex: 10000 }}
                      >
                        {availableExercises.length === 0 ? (
                          <div className="p-4 text-center text-sm fc-text-subtle">
                            {searchTerm ? 'No exercises found matching your search' : 'No available exercises'}
                          </div>
                        ) : (
                          availableExercises.map(ex => (
                            <SelectItem key={ex.id} value={ex.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{ex.name}</span>
                                {ex.category && (
                                  <span className="text-xs fc-text-subtle">{ex.category}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Reason */}
                  <div>
                    <label className="block text-sm font-medium fc-text-primary mb-2">
                      Reason for Alternative
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(reasonLabels) as Array<keyof typeof reasonLabels>).map((reason) => {
                        const Icon = reasonIcons[reason]
                        const isSelected = selectedReason === reason
                        return (
                          <button
                            key={reason}
                            onClick={() => setSelectedReason(reason)}
                            className={`p-3 rounded-xl border transition-all duration-200 ${
                              isSelected
                                ? `fc-glass border-[color:var(--fc-glass-border-strong)] ${reasonColors[reason]}`
                                : 'border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] fc-glass-soft fc-text-subtle'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{reasonLabels[reason]}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium fc-text-primary mb-2">
                      Notes (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Use lighter weight, Focus on form, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={addAlternative}
                      disabled={addingInProgress || !selectedAlternativeId}
                      className="flex-1 fc-btn fc-btn-primary fc-press rounded-xl disabled:opacity-50"
                    >
                      {addingInProgress ? 'Adding...' : 'Add Alternative'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setSelectedAlternativeId('')
                        setNotes('')
                        setSearchTerm('')
                      }}
                      className="rounded-xl fc-btn fc-btn-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
              </div>
            )}

            {/* Existing Alternatives List */}
            <div className="space-y-3">
              <h4 className="font-semibold fc-text-primary flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Current Alternatives ({alternatives.length})
              </h4>

              {loading && alternatives.length === 0 ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-24 bg-[color:var(--fc-glass-border)] rounded-xl"></div>
                  ))}
                </div>
              ) : alternatives.length === 0 ? (
                <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] border-dashed rounded-2xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 fc-text-subtle mx-auto mb-3" />
                  <p className="text-sm fc-text-dim">
                    No alternatives added yet. Add alternatives to give your clients flexibility in their workouts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alternatives.map((alternative) => {
                    const Icon = reasonIcons[alternative.reason as keyof typeof reasonIcons]
                    const altExercise = allExercises.find(ex => ex.id === alternative.alternative_exercise_id)
                    
                    return (
                      <div 
                        key={alternative.id}
                        className="fc-list-row rounded-2xl hover:shadow-lg transition-all duration-200"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold fc-text-primary text-base mb-1">
                                    {alternative.alternative_exercise?.name || altExercise?.name || 'Unknown Exercise'}
                                  </h5>
                                  {(alternative.alternative_exercise?.description || altExercise?.description) && (
                                    <p className="text-sm fc-text-dim line-clamp-2 mb-2">
                                      {alternative.alternative_exercise?.description || altExercise?.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`fc-pill fc-pill-glass text-xs ${reasonColors[alternative.reason as keyof typeof reasonColors]}`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {reasonLabels[alternative.reason as keyof typeof reasonLabels]}
                                </span>
                                {(alternative.alternative_exercise?.category || altExercise?.category) && (
                                  <span className="fc-pill fc-pill-glass text-xs fc-text-subtle">
                                    {alternative.alternative_exercise?.category || altExercise?.category}
                                  </span>
                                )}
                              </div>
                              
                              {alternative.notes && (
                                <p className="text-sm fc-text-dim mt-2 italic">
                                  "{alternative.notes}"
                                </p>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAlternative(alternative.id)}
                              disabled={loading}
                              className="fc-btn fc-btn-ghost fc-text-error rounded-xl p-2 flex-shrink-0"
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
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="border-t border-[color:var(--fc-glass-border)] p-4 pb-6 flex-shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-xl fc-btn fc-btn-secondary"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

