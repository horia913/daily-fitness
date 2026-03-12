'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Dumbbell, 
  Zap, 
  Heart, 
  Target,
  Edit,
  Trash2,
  ArrowRight,
  Activity,
  Layers,
  Star,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import ExerciseCategoryForm from '@/components/ExerciseCategoryForm'

interface ExerciseCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  created_at: string
  exercise_count?: number
}

const categoryIcons = {
  'Dumbbell': Dumbbell,
  'Zap': Zap,
  'Heart': Heart,
  'Target': Target
}

export default function ExerciseCategories() {
  const { isDark, performanceSettings } = useTheme()
  const { addToast } = useToast()
  const router = useRouter()
  
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExerciseCategory | null>(null)

  const loadingRef = useRef(false)
  const didLoadRef = useRef(false)

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    if (signal) {
      if (didLoadRef.current) return
      if (loadingRef.current) return
      didLoadRef.current = true
    }
    loadingRef.current = true
    try {
      setLoading(true)
      const res = await fetch('/api/coach/exercise-categories', { signal: signal ?? null })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const { categories: list } = await res.json()
      setCategories(Array.isArray(list) ? list : [])
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (signal) didLoadRef.current = false
        return
      }
      console.error('Error loading categories:', err)
      if (signal) didLoadRef.current = false
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    loadCategories(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [loadCategories])

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Exercises using this category will not be deleted.')) return

    try {
      const { error } = await supabase
        .from('exercise_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      setCategories(categories.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      addToast({ title: 'Error deleting category. Make sure no exercises are using it.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <div className="min-h-screen p-6 max-w-7xl mx-auto">
            <div className="rounded-2xl p-8 fc-surface animate-pulse">
              <div className="h-8 rounded-xl mb-4 bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 rounded-lg w-3/4 mb-2 bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 rounded-lg w-1/2 bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen relative z-10 p-6 md:p-12 pb-32">
          <div className="max-w-7xl mx-auto">
            <Link href="/coach/programs" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium mb-4">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Training
            </Link>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[color:var(--fc-accent)] mb-1">
                  <Layers className="w-5 h-5" />
                  <span className="text-sm font-bold tracking-widest uppercase font-mono fc-text-primary">Library Management</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Exercise Categories</h1>
                <p className="text-base fc-text-dim">Organize your protocols with kinetic visual hierarchy.</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="fc-btn fc-btn-primary hidden md:flex items-center gap-3 px-8 rounded-2xl font-bold h-12"
              >
                <Plus className="w-5 h-5" />
                Create New Category
              </button>
            </header>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(category => {
                const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || Dumbbell
                return (
                  <div key={category.id} 
                    className="group fc-surface rounded-2xl p-6 overflow-hidden transition-all duration-300"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.boxShadow = isDark ? '0 8px 24px rgba(0, 0, 0, 0.6)' : '0 4px 16px rgba(0, 0, 0, 0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                    <div style={{ paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div 
                              style={{ 
                                width: '56px', 
                                height: '56px', 
                                borderRadius: '18px', 
                                backgroundColor: category.color + '20',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <IconComponent 
                                style={{ width: '32px', height: '32px', color: category.color }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3 className="text-lg font-semibold fc-text-primary mb-1 leading-snug m-0 group-hover:text-purple-600 transition-colors">
                                {category.name}
                              </h3>
                              <p className="text-sm font-normal fc-text-dim m-0 leading-normal">
                                {category.description}
                              </p>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="flex items-center gap-2 fc-text-dim">
                              <Activity className="w-4 h-4 text-[color:var(--fc-status-success)]" />
                              <span className="text-sm font-medium">{category.exercise_count || 0} exercises</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-2xl py-1 px-3 text-xs border-2 border-[color:var(--fc-glass-border)] fc-text-dim">
                              <Star className="w-3 h-3" />
                              Active
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(category)
                            setShowCreateForm(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-sm font-semibold border-2 border-[color:var(--fc-glass-border)] bg-transparent fc-text-primary cursor-pointer transition-all duration-200"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--fc-accent-primary)'
                            e.currentTarget.style.borderColor = 'var(--fc-accent-primary)'
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = ''
                            e.currentTarget.style.color = ''
                          }}
                        >
                          <Edit style={{ width: '16px', height: '16px' }} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="flex items-center justify-center py-2 px-4 rounded-2xl text-sm font-semibold border-2 border-[color:var(--fc-glass-border)] bg-transparent text-[color:var(--fc-status-error)] cursor-pointer transition-all duration-200"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--fc-status-error) 20%, transparent)'
                            e.currentTarget.style.borderColor = 'var(--fc-status-error)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = ''
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

            {/* Enhanced Empty State */}
            {filteredCategories.length === 0 && (
              <div className="fc-surface rounded-2xl p-12 text-center">
                <div
                  className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  style={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' }}
                >
                  <Layers className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold fc-text-primary m-0 mb-4 leading-tight">
                  {categories.length === 0 ? 'No exercise categories yet' : 'No categories found'}
                </h3>
                <p className="text-base font-normal fc-text-dim mx-auto mb-8 max-w-[448px] leading-normal m-0">
                  {categories.length === 0 
                    ? 'Start organizing your exercise library by creating your first category.'
                    : 'Try adjusting your search criteria.'
                  }
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-3 py-4 px-8 rounded-[20px] border-none text-base font-semibold text-white bg-[color:var(--fc-accent-primary)] cursor-pointer transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Plus className="w-5 h-5" />
                  Create Category
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Category Form Modal */}
            <ExerciseCategoryForm
              isOpen={showCreateForm}
              onClose={() => {
                setShowCreateForm(false)
                setEditingCategory(null)
              }}
              onSuccess={() => {
                loadCategories()
                setShowCreateForm(false)
                setEditingCategory(null)
              }}
              category={editingCategory}
            />
          </div>
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="fc-btn fc-btn-primary fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg md:hidden z-50"
          aria-label="Create category"
        >
          <Plus className="w-7 h-7" />
        </button>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

