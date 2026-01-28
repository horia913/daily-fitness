'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Dumbbell, 
  Zap, 
  Heart, 
  Target, 
  Palette,
  Plus,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Award,
  Activity,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Sparkle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: any
  colors: Array<{ name: string; value: string }>
}

const iconOptions = [
  { value: 'Dumbbell', label: 'Dumbbell', icon: Dumbbell, description: 'Strength training' },
  { value: 'Zap', label: 'Lightning', icon: Zap, description: 'High intensity' },
  { value: 'Heart', label: 'Heart', icon: Heart, description: 'Cardio & endurance' },
  { value: 'Target', label: 'Target', icon: Target, description: 'Precision & focus' },
  { value: 'Activity', label: 'Activity', icon: Activity, description: 'General fitness' },
  { value: 'Star', label: 'Star', icon: Star, description: 'Featured exercises' },
  { value: 'Award', label: 'Award', icon: Award, description: 'Achievement focused' },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles, description: 'Special workouts' }
]

export default function CategoryForm({ isOpen, onClose, onSuccess, category, colors }: CategoryFormProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Dumbbell'
  })
  const [loading, setLoading] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name || '',
          description: category.description || '',
          color: category.color || '#3B82F6',
          icon: category.icon || 'Dumbbell'
        })
      } else {
        resetForm()
      }
      setValidationErrors({})
      setShowSuccessAnimation(false)
    }
  }, [isOpen, category])

  const validateForm = useCallback(() => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Category name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Category name must be less than 50 characters'
    }
    
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description must be less than 200 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  const showSuccessFeedback = () => {
    setShowSuccessAnimation(true)
    setTimeout(() => setShowSuccessAnimation(false), 2000)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'Dumbbell'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const categoryData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        coach_id: user.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        if (category) {
          const { error } = await supabase
            .from('workout_categories')
            .update(categoryData)
            .eq('id', category.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('workout_categories')
            .insert(categoryData)

          if (error) throw error
        }
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        
        const savedCategories = localStorage.getItem(`workout_categories_${user.id}`)
        let categories = savedCategories ? JSON.parse(savedCategories) : []
        
        if (category) {
          categories = categories.map((cat: any) => 
            cat.id === category.id ? { ...categoryData, id: category.id } : cat
          )
        } else {
          categories.push({ ...categoryData, id: Date.now().toString() })
        }
        
        localStorage.setItem(`workout_categories_${user.id}`, JSON.stringify(categories))
      }

      showSuccessFeedback()
      setTimeout(() => {
        onSuccess()
        onClose()
        resetForm()
      }, 1500)
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative ${theme.card} fc-glass fc-card shadow-2xl rounded-3xl border ${theme.border} w-full overflow-hidden transform transition-all duration-300 ease-out flex flex-col`}
        style={{
          maxWidth: 'min(95vw, 40rem)',
          height: 'min(88vh, calc(100vh - 4rem))',
          maxHeight: 'min(88vh, calc(100vh - 4rem))'
        }}
      >
        {/* Header - Sticky */}
        <CardHeader className={`border-b ${theme.border} px-6 py-5 flex-shrink-0 fc-glass fc-card`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl font-bold ${theme.text}`}>
                  {category ? 'Edit Category' : 'Create New Category'}
                </CardTitle>
                <CardDescription className={`${theme.textSecondary}`}>
                  {category ? 'Update category details' : 'Organize your workouts'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showSuccessAnimation && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Saved!</span>
                </div>
              )}
              <Button variant="ghost" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content - Scrollable */}
        <CardContent className="flex-1 overflow-y-auto px-6 py-6">
            {showSuccessAnimation ? (
              /* Success Animation */
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Category Saved!</h3>
                <p className={`${theme.textSecondary}`}>Your category has been {category ? 'updated' : 'created'} successfully! 🎉</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={`text-sm font-semibold ${theme.text}`}>
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Upper Body, Cardio, Strength..."
                      className="rounded-xl h-12"
                      required
                    />
                    {validationErrors.name && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{validationErrors.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className={`text-sm font-semibold ${theme.text}`}>
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this category..."
                      rows={3}
                      className="rounded-xl"
                    />
                    {validationErrors.description && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{validationErrors.description}</span>
                      </div>
                    )}
                    <div className={`text-xs ${theme.textSecondary}`}>
                      {formData.description.length}/200 characters
                    </div>
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
                              ? `border-pink-500 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-500/20`
                              : `${theme.border} hover:border-pink-300`
                          }`}
                        >
                          <IconComponent className={`w-6 h-6 mx-auto mb-2 ${
                            isSelected ? 'text-pink-600' : theme.textSecondary
                          }`} />
                          <div className={`text-xs font-medium ${
                            isSelected ? 'text-pink-600' : theme.textSecondary
                          }`}>
                            {option.label}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className={`text-sm font-semibold ${theme.text}`}>Choose Color</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-slate-300"
                        style={{ backgroundColor: formData.color }}
                      />
                      <span className={`text-sm ${theme.textSecondary}`}>
                        {colors.find(c => c.value === formData.color)?.name}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`w-12 h-12 rounded-2xl border-2 transition-all duration-200 hover:scale-110 ${
                          formData.color === color.value
                            ? 'border-slate-800 scale-110 shadow-lg'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className={`text-sm font-semibold ${theme.text}`}>Preview</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="rounded-xl"
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Preview
                      </Button>
                    </div>
                    <div className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: formData.color + '20' }}
                        >
                          {(() => {
                            const IconComponent = iconOptions.find(opt => opt.value === formData.icon)?.icon || Dumbbell
                            return <IconComponent className="w-6 h-6" style={{ color: formData.color }} />
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${theme.text}`}>
                            {formData.name || 'Category Name'}
                          </div>
                          <div className={`text-sm ${theme.textSecondary}`}>
                            {formData.description || 'Category description will appear here...'}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="rounded-xl text-xs">
                              <Activity className="w-3 h-3 mr-1" />
                              Active Category
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!showPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="w-full rounded-xl"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Show Preview
                  </Button>
                )}
              </div>
            )}
        </CardContent>

        {/* Footer - Sticky (only show when not in success animation) */}
        {!showSuccessAnimation && (
          <div className={`border-t ${theme.border} px-6 py-4 flex-shrink-0`}>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 rounded-xl"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name.trim()}
                onClick={handleSubmit}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white rounded-xl"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {category ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {category ? 'Update' : 'Create'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
