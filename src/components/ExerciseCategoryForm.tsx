'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  X, 
  Layers, 
  Palette, 
  FileText, 
  Tag,
  Dumbbell,
  Zap,
  Heart,
  Target,
  Activity,
  Star,
  Award,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ExerciseCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
}

interface ExerciseCategoryFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: ExerciseCategory | null
}

const categoryColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' }
]

const iconOptions = [
  { value: 'Dumbbell', label: 'Dumbbell', icon: Dumbbell },
  { value: 'Zap', label: 'Lightning', icon: Zap },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'Activity', label: 'Activity', icon: Activity },
  { value: 'Star', label: 'Star', icon: Star },
  { value: 'Award', label: 'Award', icon: Award },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles }
]

export default function ExerciseCategoryForm({
  isOpen,
  onClose,
  onSuccess,
  category
}: ExerciseCategoryFormProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: categoryColors[0].value,
    icon: iconOptions[0].value
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || categoryColors[0].value,
        icon: typeof category.icon === 'string' ? category.icon : (category.icon as any)?.value || iconOptions[0].value
      })
    } else if (isOpen) {
      resetForm()
    }
  }, [isOpen, category])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: categoryColors[0].value,
      icon: iconOptions[0].value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('exercise_categories')
          .update({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            icon: formData.icon
          })
          .eq('id', category.id)

        if (error) throw error
      } else {
        // Create new category
        const { error } = await supabase
          .from('exercise_categories')
          .insert({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            icon: formData.icon
          })

        if (error) throw error
      }

      onSuccess()
      resetForm()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Error saving category. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className={`relative ${theme.card} fc-glass fc-card shadow-2xl rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
        style={{
          maxWidth: 'min(95vw, 40rem)',
          height: 'min(88vh, calc(100vh - 4rem))',
          maxHeight: 'min(88vh, calc(100vh - 4rem))'
        }}
      >
        {/* Header - Sticky */}
        <CardHeader className={`border-b ${theme.border} px-6 py-5 flex-shrink-0 fc-glass fc-card`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                {category ? 'Edit Category' : 'Create Category'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className={`text-sm font-medium ${theme.text}`}>
                Category Name *
              </Label>
              <div className="relative">
                <Tag className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Strength, Cardio, Flexibility"
                  className="pl-10 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className={`text-sm font-medium ${theme.text}`}>
                Description *
              </Label>
              <div className="relative">
                <FileText className={`absolute left-3 top-3 w-4 h-4 ${theme.textSecondary}`} />
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what types of exercises belong in this category..."
                  className="pl-10 rounded-xl min-h-24"
                  required
                />
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className={`text-sm font-medium ${theme.text} flex items-center gap-2`}>
                <Palette className="w-4 h-4" />
                Color
              </Label>
              <div className="grid grid-cols-5 gap-3">
                {categoryColors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`relative h-12 rounded-xl transition-all duration-200 ${
                      formData.color === color.value
                        ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: color.value
                    }}
                    title={color.name}
                  >
                    {formData.color === color.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className={`text-sm font-semibold ${theme.text}`}>Choose Icon</Label>
                <Badge variant="outline" className="rounded-xl">
                  {iconOptions.find(opt => opt.value === formData.icon)?.label}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {iconOptions.map(option => {
                  const IconComponent = option.icon
                  const isSelected = formData.icon === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: option.value }))}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                        isSelected
                          ? `border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20`
                          : `${theme.border} hover:border-purple-300`
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-2 ${
                        isSelected ? 'text-purple-600 dark:text-purple-400' : theme.textSecondary
                      }`} />
                      <div className={`text-xs font-medium ${
                        isSelected ? 'text-purple-600 dark:text-purple-400' : theme.textSecondary
                      }`}>
                        {option.label}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Sticky */}
        <div className={`border-t ${theme.border} px-6 py-4 flex-shrink-0`}>
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
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            >
              {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

