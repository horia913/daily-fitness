'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/contexts/ThemeContext'
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
  equipment: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  difficulty: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  injury: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  preference: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
}

export default function ExerciseAlternativesModal({
  isOpen,
  onClose,
  exercise,
  allExercises
}: ExerciseAlternativesModalProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-24 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div 
        className={`${theme.card} rounded-3xl shadow-2xl w-full border-2 border-slate-200 dark:border-slate-700`}
        style={{ 
          maxWidth: 'min(95vw, 50rem)',
          maxHeight: 'min(85vh, calc(100vh - 7rem))',
          height: 'min(85vh, calc(100vh - 7rem))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible'
        }}
      >
        {/* Header - Sticky */}
        <CardHeader className={`border-b border-slate-200 dark:border-slate-700 py-5 px-6 flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Shuffle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>
                  Exercise Alternatives
                </CardTitle>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>
                  {exercise.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content - Scrollable */}
        <CardContent className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    What are exercise alternatives?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Alternative Exercise
              </Button>
            ) : (
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-600 rounded-2xl">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-semibold ${theme.text}`}>Add New Alternative</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAdding(false)
                        setSelectedAlternativeId('')
                        setNotes('')
                        setSearchTerm('')
                      }}
                      className="p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-2"
                    />
                  </div>

                  {/* Select Alternative Exercise */}
                  <div>
                    <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Alternative Exercise
                    </label>
                    <Select value={selectedAlternativeId} onValueChange={setSelectedAlternativeId}>
                      <SelectTrigger className="rounded-xl border-2 w-full">
                        <SelectValue placeholder="Select an alternative exercise..." />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-60" 
                        position="popper"
                        style={{ zIndex: 10000 }}
                      >
                        {availableExercises.length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            {searchTerm ? 'No exercises found matching your search' : 'No available exercises'}
                          </div>
                        ) : (
                          availableExercises.map(ex => (
                            <SelectItem key={ex.id} value={ex.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{ex.name}</span>
                                {ex.category && (
                                  <span className="text-xs text-slate-500">{ex.category}</span>
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
                    <label className={`block text-sm font-medium ${theme.text} mb-2`}>
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
                            className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                              isSelected
                                ? reasonColors[reason]
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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
                    <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Notes (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Use lighter weight, Focus on form, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl border-2"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={addAlternative}
                      disabled={addingInProgress || !selectedAlternativeId}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50"
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
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Alternatives List */}
            <div className="space-y-3">
              <h4 className={`font-semibold ${theme.text} flex items-center gap-2`}>
                <Shuffle className="w-4 h-4" />
                Current Alternatives ({alternatives.length})
              </h4>

              {loading && alternatives.length === 0 ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  ))}
                </div>
              ) : alternatives.length === 0 ? (
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className={`text-sm ${theme.textSecondary}`}>
                      No alternatives added yet. Add alternatives to give your clients flexibility in their workouts.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {alternatives.map((alternative) => {
                    const Icon = reasonIcons[alternative.reason as keyof typeof reasonIcons]
                    const altExercise = allExercises.find(ex => ex.id === alternative.alternative_exercise_id)
                    
                    return (
                      <Card 
                        key={alternative.id}
                        className={`${theme.card} border-2 rounded-2xl hover:shadow-lg transition-all duration-200`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className={`font-semibold ${theme.text} text-base mb-1`}>
                                    {alternative.alternative_exercise?.name || altExercise?.name || 'Unknown Exercise'}
                                  </h5>
                                  {(alternative.alternative_exercise?.description || altExercise?.description) && (
                                    <p className={`text-sm ${theme.textSecondary} line-clamp-2 mb-2`}>
                                      {alternative.alternative_exercise?.description || altExercise?.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`${reasonColors[alternative.reason as keyof typeof reasonColors]} border text-xs px-2 py-1`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {reasonLabels[alternative.reason as keyof typeof reasonLabels]}
                                </Badge>
                                {(alternative.alternative_exercise?.category || altExercise?.category) && (
                                  <Badge variant="outline" className="text-xs px-2 py-1">
                                    {alternative.alternative_exercise?.category || altExercise?.category}
                                  </Badge>
                                )}
                              </div>
                              
                              {alternative.notes && (
                                <p className={`text-sm ${theme.textSecondary} mt-2 italic`}>
                                  "{alternative.notes}"
                                </p>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAlternative(alternative.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl p-2 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Footer - Sticky */}
        <div className={`border-t border-slate-200 dark:border-slate-700 p-4 pb-6 flex-shrink-0`}>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-xl border-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

