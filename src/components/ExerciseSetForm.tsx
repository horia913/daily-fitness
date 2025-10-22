'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Dumbbell, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ExerciseThumbnail } from '@/components/ui/optimized-image'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  image_url?: string
}

interface ExerciseSetFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  exercise: Exercise
  templateId: string
}

const restTimeOptions = [
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '1.5 minutes' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' }
]

export default function ExerciseSetForm({ isOpen, onClose, onSuccess, exercise, templateId }: ExerciseSetFormProps) {
  const [formData, setFormData] = useState({
    sets: 3,
    reps: '10',
    rest_seconds: 60,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get current exercise count for order_index
      let orderIndex = 1
      try {
        const { count } = await supabase
          .from('workout_template_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', templateId)

        orderIndex = (count || 0) + 1
      } catch (dbError) {
        console.log('Using localStorage fallback for order index')
        const savedExercises = localStorage.getItem(`template_exercises_${templateId}`)
        if (savedExercises) {
          const exercises = JSON.parse(savedExercises)
          orderIndex = exercises.length + 1
        }
      }

      const exerciseData = {
        template_id: templateId,
        exercise_id: exercise.id,
        order_index: orderIndex,
        sets: formData.sets,
        reps: formData.reps,
        rest_seconds: formData.rest_seconds,
        notes: formData.notes,
        created_at: new Date().toISOString()
      }

      try {
        const { error } = await supabase
          .from('workout_template_exercises')
          .insert(exerciseData)

        if (error) throw error
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        
        const savedExercises = localStorage.getItem(`template_exercises_${templateId}`)
        let exercises = savedExercises ? JSON.parse(savedExercises) : []
        exercises.push({ ...exerciseData, id: Date.now().toString() })
        localStorage.setItem(`template_exercises_${templateId}`, JSON.stringify(exercises))
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding exercise to template:', error)
      alert('Error adding exercise. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-start p-4">
      <div className="w-full max-w-sm" style={{maxWidth: '400px'}}>
        <Card className="bg-white border-slate-200 w-full h-screen overflow-y-auto rounded-lg">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Add Exercise</CardTitle>
                <CardDescription className="text-sm">
                  Configure sets, reps, and rest time
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Exercise Preview */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-start gap-3">
                {exercise.image_url ? (
                  <ExerciseThumbnail
                    src={exercise.image_url}
                    alt={exercise.name}
                    size="small"
                    className="w-12 h-12"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800">{exercise.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{exercise.description}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    {exercise.category}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sets */}
              <div className="space-y-2">
                <Label htmlFor="sets">Number of Sets</Label>
                <Input
                  id="sets"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.sets}
                  onChange={(e) => setFormData(prev => ({ ...prev, sets: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>

              {/* Reps */}
              <div className="space-y-2">
                <Label htmlFor="reps">Reps per Set</Label>
                <Input
                  id="reps"
                  value={formData.reps}
                  onChange={(e) => setFormData(prev => ({ ...prev, reps: e.target.value }))}
                  placeholder="e.g., 10, 8-12, AMRAP"
                  required
                />
                <p className="text-xs text-slate-500">
                  Examples: "10", "8-12", "AMRAP", "30 seconds"
                </p>
              </div>

              {/* Rest Time */}
              <div className="space-y-2">
                <Label htmlFor="rest">Rest Time Between Sets</Label>
                <Select
                  value={formData.rest_seconds.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, rest_seconds: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rest time" />
                  </SelectTrigger>
                  <SelectContent>
                    {restTimeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any specific instructions or tips..."
                  rows={3}
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="space-y-2">
                    <div className="font-medium">{exercise.name}</div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="w-4 h-4" />
                        <span>{formData.sets} sets × {formData.reps} reps</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formData.rest_seconds}s rest</span>
                      </div>
                    </div>
                    {formData.notes && (
                      <div className="text-sm text-slate-600">
                        <strong>Notes:</strong> {formData.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full">
                  {loading ? 'Adding...' : 'Add to Template'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="w-full">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
