'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
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
  Share2,
  Star,
  TrendingUp,
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Timer,
  GripVertical,
  Calendar,
  Award,
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
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [showActions, setShowActions] = useState(false)

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
    if (duration <= 30) return 'text-green-600 dark:text-green-400'
    if (duration <= 60) return 'text-blue-600 dark:text-blue-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  const getUsageColor = (usage: number) => {
    if (usage >= 20) return 'text-green-600 dark:text-green-400'
    if (usage >= 10) return 'text-blue-600 dark:text-blue-400'
    if (usage >= 5) return 'text-orange-600 dark:text-orange-400'
    return 'text-slate-500'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-yellow-600 dark:text-yellow-400'
    if (rating >= 4.0) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 3.5) return 'text-orange-600 dark:text-orange-400'
    return 'text-slate-500'
  }

  const CategoryIcon = getCategoryIcon(template.category?.name || '')

  if (viewMode === 'list') {
    return (
      <Card 
        className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300 cursor-pointer ${
          isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        onClick={() => onSelect(template.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Template Image */}
            <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
              <div className="w-full h-full flex items-center justify-center">
                <CategoryIcon className="w-8 h-8 text-slate-400" />
              </div>
              {template.category && (
                <div 
                  className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white"
                  style={{ backgroundColor: template.category.color }}
                />
              )}
            </div>

            {/* Template Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm ${theme.textSecondary}`}>
                      {template.category?.name || 'Uncategorized'}
                    </span>
                    <Badge className={`${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]} border-0 text-xs`}>
                      {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
                    </Badge>
                    <div className={`flex items-center gap-1 text-xs ${getDurationColor(template.estimated_duration)}`}>
                      <Clock className="w-3 h-3" />
                      <span>{template.estimated_duration}m</span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>

              {template.description && (
                <p className={`text-sm ${theme.textSecondary} mb-3 line-clamp-2`}>
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
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
                className="text-green-600 hover:text-green-700"
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
                className="text-red-600 hover:text-red-700"
                title="Delete Template"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card 
      className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300 cursor-pointer ${
        isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={() => onSelect(template.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Template Header */}
      <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
        
        {/* Category Icon */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 bg-white/20 dark:bg-slate-800/20 rounded-full flex items-center justify-center">
            <CategoryIcon className="w-6 h-6 text-white dark:text-slate-300" />
          </div>
        </div>
        
        {/* Category Color Indicator */}
        {template.category && (
          <div 
            className="absolute top-3 left-3 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: template.category.color }}
          />
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge className={`${difficultyColors[template.difficulty_level as keyof typeof difficultyColors]} border-0`}>
            {difficultyLabels[template.difficulty_level as keyof typeof difficultyLabels]}
          </Badge>
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 right-3">
          <div className={`flex items-center gap-1 px-2 py-1 bg-white/80 dark:bg-slate-800/80 rounded-lg ${getDurationColor(template.estimated_duration)}`}>
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">{template.estimated_duration}m</span>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Template Name and Category */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
              {template.name}
            </h3>
            <div className="flex items-center gap-2">
              <CategoryIcon className="w-4 h-4 text-slate-400" />
              <span className={`text-sm ${theme.textSecondary}`}>
                {template.category?.name || 'Uncategorized'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className={`text-sm ${theme.textSecondary} line-clamp-2`}>
            {template.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
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
        <div className={`flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 transition-opacity duration-200 ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView(template)
            }}
            className="flex-1"
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
            className="text-blue-600 hover:text-blue-700"
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
            className="text-green-600 hover:text-green-700"
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
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
