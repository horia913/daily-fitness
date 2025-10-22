'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useTheme } from '@/contexts/ThemeContext'
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
  Star
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CategoryForm from '@/components/CategoryForm'

interface WorkoutCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  is_active: boolean
  created_at: string
  updated_at: string
  exercise_count?: number
}

const categoryIcons = {
  'Dumbbell': Dumbbell,
  'Zap': Zap,
  'Heart': Heart,
  'Target': Target
}

const categoryColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Gray', value: '#6B7280' }
]

export default function WorkoutCategories() {
  const { isDark } = useTheme()
  
  const [categories, setCategories] = useState<WorkoutCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<WorkoutCategory | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        // Load categories with exercise count
        const { data, error } = await supabase
          .from('workout_categories')
          .select(`
            *,
            workout_templates!inner(count)
          `)
          .eq('coach_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Process the data to include exercise count
        const processedCategories = (data || []).map(category => ({
          ...category,
          exercise_count: category.workout_templates?.length || 0
        }))

        setCategories(processedCategories)
      } catch {
        console.log('Database not ready, using localStorage fallback')
        const savedCategories = localStorage.getItem(`workout_categories_${user.id}`)
        if (savedCategories) {
          const categoriesWithCount = JSON.parse(savedCategories).map((cat: WorkoutCategory) => ({
            ...cat,
            exercise_count: Math.floor(Math.random() * 20) + 1 // Mock exercise count
          }))
          setCategories(categoriesWithCount)
        } else {
          const sampleCategories: WorkoutCategory[] = [
            {
              id: '1',
              name: 'Upper Body',
              description: 'Chest, shoulders, arms, and back exercises',
              color: '#EF4444',
              icon: 'Dumbbell',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 15
            },
            {
              id: '2',
              name: 'Lower Body',
              description: 'Legs, glutes, and lower body exercises',
              color: '#10B981',
              icon: 'Zap',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 12
            },
            {
              id: '3',
              name: 'Cardio',
              description: 'Cardiovascular and endurance training',
              color: '#F59E0B',
              icon: 'Heart',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              exercise_count: 8
            }
          ]
          setCategories(sampleCategories)
          localStorage.setItem(`workout_categories_${user.id}`, JSON.stringify(sampleCategories))
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { error } = await supabase
          .from('workout_categories')
          .update({ is_active: false })
          .eq('id', categoryId)

        if (error) throw error
      } catch {
        console.log('Database not ready, using localStorage fallback')
        const savedCategories = localStorage.getItem(`workout_categories_${user.id}`)
        let categories = savedCategories ? JSON.parse(savedCategories) : []
        categories = categories.filter((cat: WorkoutCategory) => cat.id !== categoryId)
        localStorage.setItem(`workout_categories_${user.id}`, JSON.stringify(categories))
      }

      setCategories(categories.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div style={{ 
          backgroundColor: isDark ? '#0A0A0A' : '#E8E9F3',
          backgroundImage: isDark 
            ? 'linear-gradient(to bottom right, #0A0A0A, #1A1A1A)' 
            : 'linear-gradient(to bottom right, #E8E9F3, #F5F5FF)',
          minHeight: '100vh'
        }}>
          <div style={{ padding: '24px 20px' }}>
            <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ 
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <div className="animate-pulse">
                  <div className={`h-8 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-xl mb-4`}></div>
                  <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg w-3/4 mb-2`}></div>
                  <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg w-1/2`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#E8E9F3',
        backgroundImage: isDark 
          ? 'linear-gradient(to bottom right, #0A0A0A, #1A1A1A)' 
          : 'linear-gradient(to bottom right, #E8E9F3, #F5F5FF)',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 ${isDark ? 'bg-purple-500/10' : 'bg-purple-200/40'} rounded-full blur-3xl`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${isDark ? 'bg-orange-500/10' : 'bg-orange-200/40'} rounded-full blur-3xl`}></div>
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${isDark ? 'bg-green-500/10' : 'bg-green-200/40'} rounded-full blur-3xl`}></div>
        </div>

        <div className="relative" style={{ padding: '24px 20px', paddingBottom: '100px' }}>
          <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Enhanced Header */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}>
                  <Layers style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
                </div>
                <h1 style={{ 
                  fontSize: '32px', 
                  fontWeight: '800', 
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  margin: 0,
                  lineHeight: '1.2'
                }}>
                  Workout Categories
                </h1>
              </div>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '400', 
                color: isDark ? '#D1D5DB' : '#6B7280',
                margin: 0,
                maxWidth: '560px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                Organize your workout templates with custom categories
              </p>
            </div>

            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowCreateForm(true)}
                style={{
                  backgroundColor: '#F97316',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '16px 32px',
                  borderRadius: '20px',
                  border: 'none',
                  boxShadow: isDark ? '0 4px 12px rgba(249, 115, 22, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.backgroundColor = '#EA580C'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.backgroundColor = '#F97316'
                }}
              >
                <Plus style={{ width: '20px', height: '20px' }} />
                Create Category
                <ArrowRight style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Enhanced Search */}
            <div style={{ 
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  width: '20px',
                  height: '20px'
                }} />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    paddingLeft: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    border: `2px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                    backgroundColor: 'transparent',
                    color: isDark ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '16px',
                    width: '100%'
                  }}
                  className="focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Enhanced Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '20px' }}>
              {filteredCategories.map(category => {
                const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || Dumbbell
                return (
                  <div key={category.id} 
                    style={{ 
                      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden'
                    }}
                    className="group"
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
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: isDark ? '#FFFFFF' : '#1A1A1A',
                                margin: 0,
                                marginBottom: '4px',
                                lineHeight: '1.4'
                              }} className="group-hover:text-purple-600 transition-colors">
                                {category.name}
                              </h3>
                              <p style={{
                                fontSize: '14px',
                                fontWeight: '400',
                                color: isDark ? '#9CA3AF' : '#6B7280',
                                margin: 0,
                                lineHeight: '1.5'
                              }}>
                                {category.description}
                              </p>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                              <Activity style={{ width: '16px', height: '16px', color: '#10B981' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>{category.exercise_count || 0} exercises</span>
                            </div>
                            <div style={{
                              border: `2px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                              borderRadius: '16px',
                              padding: '4px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: isDark ? '#9CA3AF' : '#6B7280'
                            }}>
                              <Star style={{ width: '12px', height: '12px' }} />
                              Active
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ paddingTop: '16px', borderTop: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}` }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditingCategory(category)
                            setShowCreateForm(true)
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: `2px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                            borderRadius: '16px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isDark ? '#FFFFFF' : '#1A1A1A',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? '#8B5CF6' : '#F3E8FF'
                            e.currentTarget.style.borderColor = '#8B5CF6'
                            e.currentTarget.style.color = isDark ? '#FFFFFF' : '#7C3AED'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E5E7EB'
                            e.currentTarget.style.color = isDark ? '#FFFFFF' : '#1A1A1A'
                          }}
                        >
                          <Edit style={{ width: '16px', height: '16px' }} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: `2px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                            borderRadius: '16px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#EF4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? '#7F1D1D' : '#FEE2E2'
                            e.currentTarget.style.borderColor = '#EF4444'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E5E7EB'
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
              <div style={{
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderRadius: '24px',
                padding: '48px',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                textAlign: 'center'
              }}>
                <div style={{ 
                  padding: '24px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', 
                  width: '96px', 
                  height: '96px', 
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isDark ? '0 4px 12px rgba(249, 115, 22, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}>
                  <Layers style={{ width: '48px', height: '48px', color: '#FFFFFF' }} />
                </div>
                <h3 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  margin: '0 0 16px 0',
                  lineHeight: '1.3'
                }}>
                  {categories.length === 0 ? 'No categories yet' : 'No categories found'}
                </h3>
                <p style={{
                  fontSize: '16px',
                  fontWeight: '400',
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  margin: '0 auto 32px',
                  maxWidth: '448px',
                  lineHeight: '1.5'
                }}>
                  {categories.length === 0 
                    ? 'Start organizing your workout templates by creating your first category.'
                    : 'Try adjusting your search criteria.'
                  }
                </p>
                <button 
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    backgroundColor: '#F97316',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '16px 32px',
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: isDark ? '0 4px 12px rgba(249, 115, 22, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.backgroundColor = '#EA580C'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.backgroundColor = '#F97316'
                  }}
                >
                  <Plus style={{ width: '20px', height: '20px' }} />
                  Create Category
                  <ArrowRight style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            )}

            {/* Category Form Modal */}
            <CategoryForm
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
              colors={categoryColors}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
