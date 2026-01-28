'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dumbbell, 
  Clock,
  Target,
  Edit,
  Trash2,
  Play,
  Users,
  UserPlus,
  Copy,
  Star,
  Zap,
  Heart,
  Activity
} from 'lucide-react'

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
  last_used?: string
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate
  viewMode: 'grid' | 'list'
  isSelected: boolean
  onSelect: (templateId: string) => void
  onEdit: (template: WorkoutTemplate) => void
  onDelete: (templateId: string) => void
  onDuplicate: (template: WorkoutTemplate) => void
  onAssign: (template: WorkoutTemplate) => void
  onView: (template: WorkoutTemplate) => void
}

export default function WorkoutTemplateCard({
  template,
  viewMode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onAssign,
  onView
}: WorkoutTemplateCardProps) {
  const [showActions, setShowActions] = useState(false)

  const difficultyStyles = {
    'Beginner': 'fc-text-success',
    'Intermediate': 'fc-text-warning',
    'Advanced': 'fc-text-error'
  }

  const difficultyLabels = {
    'Beginner': 'Beginner',
    'Intermediate': 'Intermediate',
    'Advanced': 'Advanced'
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

  const getDurationColor = (duration: number) => {
    if (duration <= 30) return 'fc-text-success'
    if (duration <= 60) return 'fc-text-workouts'
    return 'fc-text-warning'
  }

  const getUsageColor = (usage: number) => {
    if (usage >= 20) return 'fc-text-success'
    if (usage >= 10) return 'fc-text-workouts'
    if (usage >= 5) return 'fc-text-warning'
    return 'fc-text-dim'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'fc-text-success'
    if (rating >= 4.0) return 'fc-text-workouts'
    if (rating >= 3.5) return 'fc-text-warning'
    return 'fc-text-dim'
  }

  const CategoryIcon = getCategoryIcon(template.category?.name || '')

  if (viewMode === 'list') {
    return (
      <div 
        className={`fc-glass fc-card fc-hover-rise fc-press rounded-2xl border border-[color:var(--fc-glass-border)] transition-all duration-300 cursor-pointer ${
          isSelected ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
        }`}
        onClick={() => onSelect(template.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="p-6">
          <div className="flex items-center gap-4">
            {/* Template Image */}
            <div className="relative w-20 h-20 fc-glass-soft rounded-2xl overflow-hidden flex-shrink-0 border border-[color:var(--fc-glass-border)]">
              <div className="w-full h-full flex items-center justify-center">
                <div className="fc-icon-tile fc-icon-workouts">
                  <CategoryIcon className="w-6 h-6" />
                </div>
              </div>
              {template.category && (
                <div 
                  className="absolute top-2 right-2 w-3 h-3 rounded-full border border-[color:var(--fc-glass-border-strong)]"
                  style={{ backgroundColor: template.category.color }}
                />
              )}
            </div>

            {/* Template Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold fc-text-primary text-lg mb-1">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm fc-text-dim">
                      {template.category?.name || 'Uncategorized'}
                    </span>
                    <span className={`fc-pill fc-pill-glass text-xs ${difficultyStyles[template.difficulty_level as keyof typeof difficultyStyles]}`}>
                      {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
                    </span>
                    <div className={`flex items-center gap-1 text-xs ${getDurationColor(template.estimated_duration)}`}>
                      <Clock className="w-3 h-3" />
                      <span>{template.estimated_duration}m</span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 fc-icon-tile fc-icon-workouts">
                    <div className="w-2 h-2 rounded-full bg-[color:var(--fc-text-primary)]"></div>
                  </div>
                )}
              </div>

              {template.description && (
                <p className="text-sm fc-text-dim mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs fc-text-subtle">
                <span>{template.exercise_count || 0} exercises</span>
                <div className={`flex items-center gap-1 ${getUsageColor(template.usage_count || 0)}`}>
                  <Users className="w-3 h-3" />
                  <span>{template.usage_count || 0} assignments</span>
                </div>
                <div className={`flex items-center gap-1 ${getRatingColor(template.rating || 0)}`}>
                  <Star className="w-3 h-3" />
                  <span>{template.rating || 0}</span>
                </div>
                <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-2 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAssign(template)
                }}
                title="Assign to Client"
                className="fc-btn fc-btn-secondary"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onView(template)
                }}
                title="View Details"
                className="fc-btn fc-btn-secondary"
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(template)
                }}
                title="Edit Template"
                className="fc-btn fc-btn-secondary"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(template)
                }}
                className="fc-btn fc-btn-secondary fc-text-success"
                title="Duplicate Template"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(template.id)
                }}
                className="fc-btn fc-btn-secondary fc-text-error"
                title="Delete Template"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div 
      className={`fc-glass fc-card fc-hover-rise fc-press rounded-2xl border border-[color:var(--fc-glass-border)] transition-all duration-300 cursor-pointer ${
        isSelected ? 'ring-2 ring-[color:var(--fc-domain-workouts)]' : ''
      }`}
      onClick={() => onSelect(template.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Template Header */}
      <div className="relative h-32 rounded-t-2xl overflow-hidden border-b border-[color:var(--fc-glass-border)]">
        <div className="absolute inset-0 fc-glass-soft"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="fc-icon-tile fc-icon-workouts">
            <CategoryIcon className="w-6 h-6" />
          </div>
        </div>
        
        {/* Category Color Indicator */}
        {template.category && (
          <div 
            className="absolute top-3 left-3 w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border-strong)]"
            style={{ backgroundColor: template.category.color }}
          />
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 fc-icon-tile fc-icon-workouts">
            <div className="w-2 h-2 rounded-full bg-[color:var(--fc-text-primary)]"></div>
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute bottom-3 left-3">
          <span className={`fc-pill fc-pill-glass text-xs ${difficultyStyles[template.difficulty_level as keyof typeof difficultyStyles]}`}>
            {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
          </span>
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 right-3">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] ${getDurationColor(template.estimated_duration)}`}>
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">{template.estimated_duration}m</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Template Name and Category */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold fc-text-primary text-lg mb-1">
              {template.name}
            </h3>
            <div className="flex items-center gap-2">
              <CategoryIcon className="w-4 h-4 fc-text-subtle" />
              <span className="text-sm fc-text-dim">
                {template.category?.name || 'Uncategorized'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm fc-text-dim line-clamp-2">
            {template.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs fc-text-subtle">
          <div className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3 fc-text-workouts" />
            <span>{template.exercise_count || 0} exercises</span>
          </div>
          <div className={`flex items-center gap-1 ${getUsageColor(template.usage_count || 0)}`}>
            <Users className="w-3 h-3" />
            <span>{template.usage_count || 0}</span>
          </div>
          <div className={`flex items-center gap-1 ${getRatingColor(template.rating || 0)}`}>
            <Star className="w-3 h-3" />
            <span>{template.rating || 0}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`flex items-center gap-2 pt-2 border-t border-[color:var(--fc-glass-border)] transition-opacity duration-200 ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView(template)
            }}
            className="flex-1 fc-btn fc-btn-secondary"
          >
            <Play className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(template)
            }}
            className="fc-btn fc-btn-secondary"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate(template)
            }}
            className="fc-btn fc-btn-secondary fc-text-success"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(template.id)
            }}
            className="fc-btn fc-btn-secondary fc-text-error"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
