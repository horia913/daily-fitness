'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Save,
  X,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  Dumbbell,
  Target,
  Star,
  Users,
  Timer,
  Zap,
  Heart,
  Activity,
  Award,
  Bookmark,
  Settings,
  Edit,
  Trash2,
  Plus,
  Minus,
  Copy,
  Share2,
  Download,
  Upload
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
}

interface WorkoutTemplateEditorProps {
  template: WorkoutTemplate
  onSave: (updatedTemplate: WorkoutTemplate) => void
  onCancel: () => void
  isOpen: boolean
}

export default function WorkoutTemplateEditor({ 
  template, 
  onSave, 
  onCancel, 
  isOpen 
}: WorkoutTemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description,
    difficulty_level: template.difficulty_level,
    estimated_duration: template.estimated_duration
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: template.name,
        description: template.description,
        difficulty_level: template.difficulty_level,
        estimated_duration: template.estimated_duration
      })
      setHasChanges(false)
    }
  }, [isOpen, template])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedTemplate = { ...template, ...formData }
      await onSave(updatedTemplate)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setSaving(false)
    }
  }

  const difficultyOptions = [
    { value: 'Beginner', label: 'Beginner', icon: Target },
    { value: 'Intermediate', label: 'Intermediate', icon: Dumbbell },
    { value: 'Advanced', label: 'Advanced', icon: Zap }
  ]

  const durationPresets = [
    { label: 'Quick (15-30 min)', value: 20 },
    { label: 'Standard (30-45 min)', value: 37 },
    { label: 'Extended (45-60 min)', value: 52 },
    { label: 'Long (60+ min)', value: 75 }
  ]

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div 
        className="relative fc-modal fc-card max-w-5xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 ease-out overflow-hidden"
        style={{
          animation: 'modalSlideIn 0.3s ease-out',
          height: 'min(95vh, calc(100vh - 2rem))'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-[color:var(--fc-glass-border)] px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 fc-text-primary">
              <div className="fc-icon-tile fc-icon-workouts">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts">
                  Template Editor
                </span>
                <div className="text-xl font-bold mt-2">Edit Workout Template</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2 fc-btn fc-btn-ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6 pt-6">
          {/* Template Name */}
          <div>
            <label className="text-sm font-medium fc-text-primary mb-2 block">
              Template Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter workout template name..."
              className="rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="text-sm font-medium fc-text-primary mb-2 block">
              Difficulty Level *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {difficultyOptions.map(option => {
                const Icon = option.icon
                return (
                  <Button
                    key={option.value}
                    variant={formData.difficulty_level === option.value ? 'default' : 'outline'}
                    onClick={() => handleInputChange('difficulty_level', option.value)}
                    className={`h-16 rounded-xl flex flex-col items-center gap-2 ${
                      formData.difficulty_level === option.value 
                        ? 'fc-btn fc-btn-primary fc-press' 
                        : 'fc-btn fc-btn-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{option.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="text-sm font-medium fc-text-primary mb-2 block">
              Estimated Duration (minutes) *
            </label>
            <div className="space-y-3">
              <Input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => handleInputChange('estimated_duration', parseInt(e.target.value) || 0)}
                placeholder="Enter duration in minutes..."
                className="rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]"
                min="1"
                max="180"
              />
              <div className="grid grid-cols-2 gap-2">
                {durationPresets.map(preset => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('estimated_duration', preset.value)}
                    className="rounded-xl text-xs fc-btn fc-btn-secondary"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium fc-text-primary mb-2 block">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the purpose, focus, and benefits of this workout..."
              className="rounded-xl min-h-24 fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          {/* Template Info */}
          <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <h4 className="text-sm font-medium fc-text-primary mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Template Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="fc-text-subtle">Created:</span>
                <p className="fc-text-primary">
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="fc-text-subtle">Last Updated:</span>
                <p className="fc-text-primary">
                  {new Date(template.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="fc-text-subtle">Category:</span>
                <p className="fc-text-primary">
                  {template.category?.name || 'Uncategorized'}
                </p>
              </div>
              <div>
                <span className="fc-text-subtle">Status:</span>
                <span className={`fc-pill fc-pill-glass ${template.is_active ? 'fc-text-success' : 'fc-text-error'}`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Validation */}
          {!formData.name.trim() && (
            <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 fc-text-error" />
                <span className="text-sm fc-text-error">
                  Template name is required
                </span>
              </div>
            </div>
          )}

          {formData.estimated_duration < 1 && (
            <div className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-status-error)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 fc-text-error" />
                <span className="text-sm fc-text-error">
                  Duration must be at least 1 minute
                </span>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t border-[color:var(--fc-glass-border)] px-6 py-4 rounded-b-3xl">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-xl fc-btn fc-btn-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !formData.name.trim() || formData.estimated_duration < 1 || saving}
              className="rounded-xl fc-btn fc-btn-primary fc-press"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
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
