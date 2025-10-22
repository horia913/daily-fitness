'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Dumbbell, 
  Clock,
  Target,
  Edit,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Plus,
  Minus,
  Timer,
  Zap,
  Heart,
  Activity,
  Award,
  Star,
  Bookmark,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  sets: number
  reps: string
  rest_seconds: number
  notes: string
  created_at: string
  exercise?: {
    id: string
    name: string
    description: string
    category: string
    image_url?: string
    muscle_groups?: string[]
    equipment?: string[]
  }
}

interface DraggableExerciseCardProps {
  exercise: TemplateExercise
  index: number
  isExpanded: boolean
  isEditing: boolean
  isDragging?: boolean
  onExpand: () => void
  onEdit: () => void
  onRemove: () => void
  onUpdate: (updates: any) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export default function DraggableExerciseCard({ 
  exercise, 
  index, 
  isExpanded, 
  isEditing, 
  isDragging = false,
  onExpand, 
  onEdit, 
  onRemove, 
  onUpdate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: DraggableExerciseCardProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [editingData, setEditingData] = useState({
    sets: exercise.sets,
    reps: exercise.reps,
    rest_seconds: exercise.rest_seconds,
    notes: exercise.notes
  })

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const parseRestTime = (timeString: string) => {
    const match = timeString.match(/(\d+)([ms])/)
    if (match) {
      const value = parseInt(match[1])
      const unit = match[2]
      return unit === 'm' ? value * 60 : value
    }
    return 60 // default 1 minute
  }

  const handleSaveInlineEdit = () => {
    onUpdate(editingData)
    setIsInlineEditing(false)
  }

  const handleCancelInlineEdit = () => {
    setEditingData({
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes
    })
    setIsInlineEditing(false)
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'strength': return Dumbbell
      case 'cardio': return Heart
      case 'hiit': return Zap
      case 'flexibility': return Activity
      case 'upper body': return Target
      case 'lower body': return Dumbbell
      default: return Dumbbell
    }
  }

  const CategoryIcon = getCategoryIcon(exercise.exercise?.category || '')

  return (
    <Card 
      className={`${theme.card} ${theme.shadow} rounded-2xl border-2 transition-all duration-300 ${
        isExpanded ? 'border-blue-300 dark:border-blue-700' : 'hover:border-slate-300 dark:hover:border-slate-600'
      } ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isInlineEditing ? 'border-green-300 dark:border-green-700' : ''
      }`}
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          {isEditing && (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-move hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <GripVertical className="w-4 h-4 text-slate-500" />
            </div>
          )}

          {/* Exercise Number */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-lg">
            {index + 1}
          </div>

          {/* Exercise Image */}
          <div className="relative w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden flex-shrink-0">
            {exercise.exercise?.image_url ? (
              <img 
                src={exercise.exercise.image_url} 
                alt={exercise.exercise.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CategoryIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
                  {exercise.exercise?.name || 'Unknown Exercise'}
                </h3>
                
                {/* Exercise Parameters */}
                {isInlineEditing ? (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500">Sets:</label>
                      <Input
                        type="number"
                        value={editingData.sets}
                        onChange={(e) => setEditingData({ ...editingData, sets: parseInt(e.target.value) || 1 })}
                        className="w-16 h-8 text-center"
                        min="1"
                        max="20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500">Reps:</label>
                      <Input
                        value={editingData.reps}
                        onChange={(e) => setEditingData({ ...editingData, reps: e.target.value })}
                        className="w-20 h-8"
                        placeholder="8-12"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500">Rest:</label>
                      <Input
                        value={formatRestTime(editingData.rest_seconds)}
                        onChange={(e) => setEditingData({ ...editingData, rest_seconds: parseRestTime(e.target.value) })}
                        className="w-20 h-8"
                        placeholder="60s"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      <span>{exercise.sets} sets × {exercise.reps} reps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatRestTime(exercise.rest_seconds)} rest</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isInlineEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveInlineEdit}
                      className="p-2 text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelInlineEdit}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onExpand}
                      className="p-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    {isEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsInlineEditing(true)}
                          className="p-2 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRemove}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  {/* Exercise Description */}
                  {exercise.exercise?.description && (
                    <div>
                      <h4 className={`text-sm font-medium ${theme.text} mb-2`}>Description</h4>
                      <p className={`text-sm ${theme.textSecondary}`}>
                        {exercise.exercise.description}
                      </p>
                    </div>
                  )}

                  {/* Muscle Groups */}
                  {exercise.exercise?.muscle_groups && exercise.exercise.muscle_groups.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium ${theme.text} mb-2`}>Target Muscles</h4>
                      <div className="flex flex-wrap gap-2">
                        {exercise.exercise.muscle_groups.map(group => (
                          <Badge key={group} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {exercise.exercise?.equipment && exercise.exercise.equipment.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium ${theme.text} mb-2`}>Equipment</h4>
                      <div className="flex flex-wrap gap-2">
                        {exercise.exercise.equipment.map(equipment => (
                          <Badge key={equipment} variant="outline" className="text-xs">
                            {equipment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <h4 className={`text-sm font-medium ${theme.text} mb-2`}>Coach Notes</h4>
                    {isInlineEditing ? (
                      <Textarea
                        value={editingData.notes}
                        onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
                        className="min-h-20"
                        placeholder="Add coaching notes, form cues, or modifications..."
                      />
                    ) : (
                      <div className={`p-3 rounded-lg ${theme.backgroundSecondary}`}>
                        {exercise.notes ? (
                          <p className={`text-sm ${theme.textSecondary}`}>{exercise.notes}</p>
                        ) : (
                          <p className={`text-sm ${theme.textMuted} italic`}>
                            No notes added yet. Click edit to add coaching notes.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {isExpanded && !isInlineEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsInlineEditing(true)}
                        className="rounded-xl"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Quick Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="rounded-xl"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Advanced Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
