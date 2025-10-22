'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  X, 
  Plus, 
  Trash2, 
  Upload, 
  Dumbbell, 
  Target, 
  Clock, 
  Users, 
  Image, 
  Video, 
  FileText, 
  Save, 
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ImageTransform } from '@/lib/imageTransform'
import { useImageUpload } from '@/hooks/useImageOptimization'
import { useTheme } from '@/contexts/ThemeContext'

interface ExerciseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface ExerciseFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  exercise?: any
}

const muscleGroups = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Abs', 'Obliques', 'Lower Back', 'Glutes', 'Quadriceps', 'Hamstrings',
  'Calves', 'Neck', 'Traps', 'Lats', 'Delts'
]

const equipmentOptions = [
  'Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
  'Cable Machine', 'Smith Machine', 'Bench', 'Pull-up Bar', 'Medicine Ball',
  'Stability Ball', 'Foam Roller', 'Yoga Mat', 'Treadmill', 'Bike',
  'Rowing Machine', 'Elliptical', 'Jump Rope'
]

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

export default function ExerciseForm({ isOpen, onClose, onSuccess, exercise }: ExerciseFormProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    muscle_groups: [] as string[],
    equipment: [] as string[],
    difficulty: 'beginner',
    instructions: [''],
    tips: [''],
    video_url: '',
    is_public: false
  })
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [newInstruction, setNewInstruction] = useState('')
  const [newTip, setNewTip] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
      if (exercise) {
        setFormData({
          name: exercise.name || '',
          description: exercise.description || '',
          category: exercise.category || '',
          muscle_groups: exercise.muscle_groups || [],
          equipment: exercise.equipment || [],
          difficulty: exercise.difficulty || 'beginner',
          instructions: exercise.instructions?.length > 0 ? exercise.instructions : [''],
          tips: exercise.tips?.length > 0 ? exercise.tips : [''],
          video_url: exercise.video_url || '',
          is_public: exercise.is_public || false
        })
      } else {
        resetForm()
      }
    }
  }, [isOpen, exercise])

  const loadCategories = useCallback(async () => {
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
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      muscle_groups: [],
      equipment: [],
      difficulty: 'beginner',
      instructions: [''],
      tips: [''],
      video_url: '',
      is_public: false
    })
    setNewInstruction('')
    setNewTip('')
    setShowAdvanced(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const exerciseData = {
        ...formData,
        coach_id: user.id,
        instructions: formData.instructions.filter(instruction => instruction.trim() !== ''),
        tips: formData.tips.filter(tip => tip.trim() !== ''),
        muscle_groups: formData.muscle_groups,
        equipment: formData.equipment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        if (exercise) {
          const { error } = await supabase
            .from('exercises')
            .update(exerciseData)
            .eq('id', exercise.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('exercises')
            .insert(exerciseData)

          if (error) throw error
        }
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        
        const savedExercises = localStorage.getItem(`exercises_${user.id}`)
        let exercises = savedExercises ? JSON.parse(savedExercises) : []
        
        if (exercise) {
          exercises = exercises.map((ex: any) => 
            ex.id === exercise.id ? { ...exerciseData, id: exercise.id } : ex
          )
        } else {
          exercises.push({ ...exerciseData, id: Date.now().toString() })
        }
        
        localStorage.setItem(`exercises_${user.id}`, JSON.stringify(exercises))
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error saving exercise:', error)
      alert('Error saving exercise. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addMuscleGroup = () => {
    if (newMuscleGroup.trim() && !formData.muscle_groups.includes(newMuscleGroup.trim())) {
      setFormData(prev => ({
        ...prev,
        muscle_groups: [...prev.muscle_groups, newMuscleGroup.trim()]
      }))
      setNewMuscleGroup('')
    }
  }

  const removeMuscleGroup = (group: string) => {
    setFormData(prev => ({
      ...prev,
      muscle_groups: prev.muscle_groups.filter(g => g !== group)
    }))
  }

  const addEquipment = () => {
    if (newEquipment.trim() && !formData.equipment.includes(newEquipment.trim())) {
      setFormData(prev => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment.trim()]
      }))
      setNewEquipment('')
    }
  }

  const removeEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e !== equipment)
    }))
  }

  const addInstruction = () => {
    if (newInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction.trim()]
      }))
      setNewInstruction('')
    }
  }

  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }))
  }

  const addTip = () => {
    if (newTip.trim()) {
      setFormData(prev => ({
        ...prev,
        tips: [...prev.tips, newTip.trim()]
      }))
      setNewTip('')
    }
  }

  const removeTip = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tips: prev.tips.filter((_, i) => i !== index)
    }))
  }

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative ${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} w-full overflow-hidden transform transition-all duration-300 ease-out flex flex-col`}
        style={{
          animation: 'modalSlideIn 0.3s ease-out',
          maxWidth: 'min(95vw, 50rem)',
          height: 'min(88vh, calc(100vh - 4rem))',
          maxHeight: 'min(88vh, calc(100vh - 4rem))'
        }}
      >
        {/* Header - Sticky */}
        <div className={`${theme.card} border-b ${theme.border} px-6 py-5 rounded-t-3xl flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {exercise ? 'Edit Exercise' : 'Create New Exercise'}
                </h2>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>
                  {exercise ? 'Update exercise details' : 'Add a new exercise to your library'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                    <Info className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className={`text-sm font-medium ${theme.text}`}>Exercise Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Push-ups"
                    required
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className={`text-sm font-medium ${theme.text}`}>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className={`text-sm font-medium ${theme.text}`}>Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the exercise..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className={`text-sm font-medium ${theme.text}`}>Difficulty Level</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Muscle Groups & Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Muscle Groups */}
              <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                      <Target className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <CardTitle className={`text-lg font-bold ${theme.text}`}>Muscle Groups</CardTitle>
                  </div>
                  <p className={`text-sm ${theme.textSecondary} mt-2`}>
                    Select all that apply ({formData.muscle_groups.length} selected)
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {muscleGroups.map(group => {
                      const isSelected = formData.muscle_groups.includes(group)
                      return (
                        <label
                          key={group}
                          className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                              : 'border-2 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  muscle_groups: [...prev.muscle_groups, group]
                                }))
                              } else {
                                removeMuscleGroup(group)
                              }
                            }}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          <span className={`text-sm font-medium ${isSelected ? 'text-orange-900 dark:text-orange-100' : theme.text}`}>
                            {group}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Equipment */}
              <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                      <Dumbbell className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <CardTitle className={`text-lg font-bold ${theme.text}`}>Equipment</CardTitle>
                  </div>
                  <p className={`text-sm ${theme.textSecondary} mt-2`}>
                    Select all required equipment ({formData.equipment.length} selected)
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {equipmentOptions.map(equipment => {
                      const isSelected = formData.equipment.includes(equipment)
                      return (
                        <label
                          key={equipment}
                          className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                              : 'border-2 border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  equipment: [...prev.equipment, equipment]
                                }))
                              } else {
                                removeEquipment(equipment)
                              }
                            }}
                            className="rounded text-green-600 focus:ring-green-500"
                          />
                          <span className={`text-sm font-medium ${isSelected ? 'text-green-900 dark:text-green-100' : theme.text}`}>
                            {equipment}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                    <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <CardTitle className={`text-lg font-bold ${theme.text}`}>Instructions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-4">
                  {formData.instructions.map((instruction, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${theme.textSecondary}`}>Step {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstruction(index)}
                          className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:text-red-600 hover:${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={instruction}
                        onChange={(e) => {
                          const newInstructions = [...formData.instructions]
                          newInstructions[index] = e.target.value
                          setFormData(prev => ({ ...prev, instructions: newInstructions }))
                        }}
                        placeholder="Step instruction..."
                        rows={2}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Add new instruction..."
                      rows={2}
                      className="rounded-xl"
                    />
                    <Button type="button" onClick={addInstruction} size="sm" className={`${theme.primary} rounded-xl w-full`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Instruction
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-yellow-100'}`}>
                    <AlertCircle className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  </div>
                  <CardTitle className={`text-lg font-bold ${theme.text}`}>Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-4">
                  {formData.tips.map((tip, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${theme.textSecondary}`}>Tip {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTip(index)}
                          className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:text-red-600 hover:${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={tip}
                        onChange={(e) => {
                          const newTips = [...formData.tips]
                          newTips[index] = e.target.value
                          setFormData(prev => ({ ...prev, tips: newTips }))
                        }}
                        placeholder="Helpful tip..."
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Input
                      value={newTip}
                      onChange={(e) => setNewTip(e.target.value)}
                      placeholder="Add new tip..."
                      className="rounded-xl"
                    />
                    <Button type="button" onClick={addTip} size="sm" className={`${theme.warning} rounded-xl w-full`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                    <Video className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <CardTitle className={`text-lg font-bold ${theme.text}`}>Demonstration Video</CardTitle>
                </div>
                <p className={`text-sm ${theme.textSecondary} mt-2`}>
                  Add a YouTube or video URL showing proper form
                </p>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video_url" className={`text-sm font-medium ${theme.text}`}>Video URL (Optional)</Label>
                  <div className="relative">
                    <Video className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
                    <Input
                      id="video_url"
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10 rounded-xl"
                    />
                  </div>
                  <p className={`text-xs ${theme.textSecondary}`}>
                    Supports YouTube, Vimeo, and direct video links
                  </p>
                </div>
                
                {formData.video_url && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      Video URL added successfully
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <Users className={`w-5 h-5 ${theme.textSecondary}`} />
                    </div>
                    <CardTitle className={`text-lg font-bold ${theme.text}`}>Visibility</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                  >
                    {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="p-6 pt-0">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: !!checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="is_public" className={`text-sm ${theme.textSecondary}`}>
                      Make this exercise public (other coaches can see it)
                    </Label>
                  </div>
                </CardContent>
              )}
            </Card>
          </form>
        </div>

        {/* Footer - Sticky at Bottom */}
        <div className={`${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl flex-shrink-0`}>
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              onClick={handleSubmit}
              className={`${theme.primary} flex items-center gap-2 rounded-xl`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : (exercise ? 'Update Exercise' : 'Create Exercise')}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
