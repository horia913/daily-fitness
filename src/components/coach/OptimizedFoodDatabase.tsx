'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter,
  Utensils, 
  Plus,
  Edit,
  Trash2,
  Copy,
  ArrowLeft,
  RefreshCw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  MoreVertical,
  Target,
  Flame,
  TrendingUp,
  Droplets,
  Calendar,
  Eye,
  BarChart3,
  Activity,
  Calculator,
  Layers,
  Apple,
  Beef,
  Fish,
  Wheat,
  Carrot,
  Milk,
  Nut,
  Zap,
  Scale,
  Info,
  Star,
  Heart,
  Leaf
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Food {
  id: string
  name: string
  brand?: string
  serving_size: number
  serving_unit: string
  calories_per_serving: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  category: string
  is_custom?: boolean
  created_at?: string
  updated_at?: string
}

interface OptimizedFoodDatabaseProps {
  coachId?: string
}

export default function OptimizedFoodDatabase({ }: OptimizedFoodDatabaseProps) {
  const { getThemeStyles } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'calories' | 'protein' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const categories = [
    'Protein',
    'Grains',
    'Vegetables',
    'Fruits',
    'Dairy',
    'Nuts',
    'Beverages',
    'Snacks',
    'General'
  ]

  const getCategoryIcon = (category: string) => {
    const icons = {
      'Protein': Beef,
      'Grains': Wheat,
      'Vegetables': Carrot,
      'Fruits': Apple,
      'Dairy': Milk,
      'Nuts': Nut,
      'Beverages': Droplets,
      'Snacks': Zap,
      'General': Utensils
    }
    return icons[category as keyof typeof icons] || Utensils
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Protein': 'from-red-500 to-pink-500',
      'Grains': 'from-yellow-500 to-orange-500',
      'Vegetables': 'from-green-500 to-emerald-500',
      'Fruits': 'from-purple-500 to-violet-500',
      'Dairy': 'from-blue-500 to-cyan-500',
      'Nuts': 'from-amber-500 to-yellow-500',
      'Beverages': 'from-teal-500 to-blue-500',
      'Snacks': 'from-orange-500 to-red-500',
      'General': 'from-gray-500 to-slate-500'
    }
    return colors[category as keyof typeof colors] || 'from-gray-500 to-slate-500'
  }

  const getNutritionalHighlight = (food: Food) => {
    if (food.protein >= 20) return { label: 'High Protein', color: 'text-red-600', icon: Target }
    if (food.calories_per_serving <= 50) return { label: 'Low Calorie', color: 'text-green-600', icon: Leaf }
    if (food.fiber >= 5) return { label: 'High Fiber', color: 'text-purple-600', icon: Activity }
    if (food.fat <= 2) return { label: 'Low Fat', color: 'text-blue-600', icon: Heart }
    return { label: 'Balanced', color: 'text-gray-600', icon: BarChart3 }
  }

  useEffect(() => {
    loadFoods()
  }, [])

  const loadFoods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        setFoods(data || [])
      } catch (dbError) {
        console.log('Database not ready, using localStorage fallback')
        const savedFoods = localStorage.getItem(`foods_${user.id}`)
        if (savedFoods) {
          setFoods(JSON.parse(savedFoods))
        } else {
          const sampleFoods = [
            {
              id: '1',
              name: 'Chicken Breast',
              brand: 'Generic',
              serving_size: 100,
              serving_unit: 'g',
              calories_per_serving: 165,
              protein: 31,
              carbs: 0,
              fat: 3.6,
              fiber: 0,
              category: 'Protein',
              is_custom: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'Brown Rice',
              brand: 'Generic',
              serving_size: 100,
              serving_unit: 'g',
              calories_per_serving: 111,
              protein: 2.6,
              carbs: 23,
              fat: 0.9,
              fiber: 1.8,
              category: 'Grains',
              is_custom: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '3',
              name: 'Broccoli',
              brand: 'Generic',
              serving_size: 100,
              serving_unit: 'g',
              calories_per_serving: 34,
              protein: 2.8,
              carbs: 7,
              fat: 0.4,
              fiber: 2.6,
              category: 'Vegetables',
              is_custom: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '4',
              name: 'Greek Yogurt',
              brand: 'Generic',
              serving_size: 100,
              serving_unit: 'g',
              calories_per_serving: 59,
              protein: 10,
              carbs: 3.6,
              fat: 0.4,
              fiber: 0,
              category: 'Dairy',
              is_custom: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '5',
              name: 'Almonds',
              brand: 'Generic',
              serving_size: 28,
              serving_unit: 'g',
              calories_per_serving: 164,
              protein: 6,
              carbs: 6,
              fat: 14,
              fiber: 3.5,
              category: 'Nuts',
              is_custom: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
          setFoods(sampleFoods)
          localStorage.setItem(`foods_${user.id}`, JSON.stringify(sampleFoods))
        }
      }
    } catch (error) {
      console.error('Error loading foods:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedFoods = foods
    .filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           food.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           food.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || food.category === selectedCategory
      const matchesSource = selectedSource === 'all' || 
                           (selectedSource === 'custom' && food.is_custom) ||
                           (selectedSource === 'database' && !food.is_custom)
      return matchesSearch && matchesCategory && matchesSource
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'calories':
          comparison = a.calories_per_serving - b.calories_per_serving
          break
        case 'protein':
          comparison = a.protein - b.protein
          break
        case 'date':
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleFoodClick = (food: Food) => {
    setSelectedFood(food)
    setShowDetailModal(true)
  }

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) return

    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', foodId)

      if (error) throw error
      loadFoods()
    } catch (error) {
      console.error('Error deleting food:', error)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-200 dark:bg-slate-800"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} rounded-2xl p-6`}>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#E8E9F3', minHeight: '100vh', paddingBottom: '100px', borderRadius: '24px' }}>
      {/* Header Section */}
      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/coach')}
                style={{ padding: '8px', borderRadius: '20px' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Utensils style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
                    Food Database
                  </h1>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                    Manage your food database and nutritional information
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={loadFoods}
                style={{ borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowAddForm(true)}
                style={{ backgroundColor: '#6C5CE7', borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Food
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px', backgroundColor: '#E8E9F3', borderRadius: '24px' }}>
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <Button
              onClick={loadFoods}
              style={{
                flex: 1,
                borderRadius: '20px',
                padding: '16px 32px',
                fontSize: '14px',
                fontWeight: '600',
                border: '2px solid #E5E7EB',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              style={{
                flex: 1,
                borderRadius: '20px',
                padding: '16px 32px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Add Food
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '2px solid #4CAF50',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Utensils style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1A1A1A',
              marginBottom: '4px'
            }}>{foods.length}</p>
            <p style={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#6B7280'
            }}>Total Foods</p>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '2px solid #2196F3',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1A1A1A',
              marginBottom: '4px'
            }}>{foods.filter(f => f.is_custom).length}</p>
            <p style={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#6B7280'
            }}>Custom Foods</p>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '2px solid #6C5CE7',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1A1A1A',
              marginBottom: '4px'
            }}>{foods.filter(f => f.protein >= 20).length}</p>
            <p style={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#6B7280'
            }}>High Protein</p>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '2px solid #FF9800',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1A1A1A',
              marginBottom: '4px'
            }}>{new Set(foods.map(f => f.category)).size}</p>
            <p style={{
              fontSize: '14px',
              fontWeight: '400',
              color: '#6B7280'
            }}>Categories</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Search and Filters */}
          <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    placeholder="Search foods by name, brand, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-2 text-base sm:text-lg focus:border-green-500 transition-all duration-200"
                  />
                </div>

                {/* Filters - Mobile First */}
                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 focus:border-green-500 transition-all duration-200">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => {
                        const Icon = getCategoryIcon(category)
                        return (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {category}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 focus:border-green-500 transition-all duration-200">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value: 'name' | 'calories' | 'protein' | 'date') => setSortBy(value)}>
                      <SelectTrigger className="h-10 sm:h-12 rounded-xl border-2 flex-1 focus:border-green-500 transition-all duration-200">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="calories">Calories</SelectItem>
                        <SelectItem value="protein">Protein</SelectItem>
                        <SelectItem value="date">Date Added</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-10 sm:h-12 px-3 rounded-xl border-2 hover:border-green-300 transition-all duration-200"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${theme.textSecondary}`}>View:</span>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-xl"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-xl"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Food Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredAndSortedFoods.map(food => {
                const CategoryIcon = getCategoryIcon(food.category)
                const categoryColor = getCategoryColor(food.category)
                const highlight = getNutritionalHighlight(food)
                
                return (
                  <Card 
                    key={food.id} 
                    className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105`}
                    onClick={() => handleFoodClick(food)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      {/* Header with Category */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${categoryColor} rounded-xl flex items-center justify-center text-white`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-semibold ${theme.text} text-sm sm:text-base truncate`}>
                              {food.name}
                            </h3>
                            <p className={`text-xs ${theme.textSecondary} truncate`}>
                              {food.brand || food.category}
                            </p>
                          </div>
                        </div>
                        
                        <Badge className={`${highlight.color} border-0 text-xs px-2 py-1 bg-opacity-10`}>
                          <highlight.icon className="w-3 h-3 mr-1" />
                          {highlight.label}
                        </Badge>
                      </div>

                      {/* Serving Info */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs ${theme.textSecondary}`}>Serving Size</span>
                          <span className={`text-xs font-medium ${theme.text}`}>
                            {food.serving_size} {food.serving_unit}
                          </span>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {food.calories_per_serving} cal
                          </div>
                          <div className="text-xs text-green-500 dark:text-green-500">per serving</div>
                        </div>
                      </div>

                      {/* Macro Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="font-semibold text-red-600 dark:text-red-400">
                            {food.protein}g
                          </div>
                          <div className="text-red-500 dark:text-red-500">Protein</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {food.carbs}g
                          </div>
                          <div className="text-blue-500 dark:text-blue-500">Carbs</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                            {food.fat}g
                          </div>
                          <div className="text-yellow-500 dark:text-yellow-500">Fat</div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 sm:gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFoodClick(food)
                          }}
                          className="flex-1 text-xs sm:text-sm rounded-xl"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Edit food action
                          }}
                          className="rounded-xl p-2"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFood(food.id)
                          }}
                          className="rounded-xl p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredAndSortedFoods.map(food => {
                const CategoryIcon = getCategoryIcon(food.category)
                const categoryColor = getCategoryColor(food.category)
                const highlight = getNutritionalHighlight(food)
                
                return (
                  <Card 
                    key={food.id} 
                    className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group`}
                    onClick={() => handleFoodClick(food)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        {/* Category Icon */}
                        <div className={`w-12 h-12 bg-gradient-to-br ${categoryColor} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                          <CategoryIcon className="w-6 h-6" />
                        </div>

                        {/* Food Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold ${theme.text} text-base sm:text-lg mb-1 truncate`}>
                                {food.name}
                              </h3>
                              <p className={`text-sm ${theme.textSecondary} mb-2`}>
                                {food.brand && `${food.brand} • `}{food.serving_size} {food.serving_unit}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${highlight.color} border-0 text-xs px-2 py-1 bg-opacity-10`}>
                                  <highlight.icon className="w-3 h-3 mr-1" />
                                  {highlight.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {food.category}
                                </Badge>
                                {food.is_custom && (
                                  <Badge variant="outline" className="text-xs text-blue-600">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nutritional Summary */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm ${theme.textSecondary}`}>Nutrition per serving</span>
                              <span className={`text-sm font-medium ${theme.text}`}>
                                {food.calories_per_serving} calories
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className={theme.textSecondary}>Protein: {food.protein}g</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className={theme.textSecondary}>Carbs: {food.carbs}g</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className={theme.textSecondary}>Fat: {food.fat}g</span>
                              </div>
                              {food.fiber > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                  <span className={theme.textSecondary}>Fiber: {food.fiber}g</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFoodClick(food)
                            }}
                            className="rounded-xl p-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Edit food action
                            }}
                            className="rounded-xl p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFood(food.id)
                            }}
                            className="rounded-xl p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedFoods.length === 0 && (
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Utensils className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className={`text-xl sm:text-2xl font-semibold ${theme.text} mb-3`}>
                  {foods.length === 0 ? 'No foods in database yet' : 'No foods found'}
                </h3>
                <p className={`text-base sm:text-lg ${theme.textSecondary} mb-8 max-w-md mx-auto`}>
                  {foods.length === 0 
                    ? 'Start building your food database by adding nutritional information.'
                    : 'Try adjusting your search or filter criteria to find the foods you\'re looking for.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 px-8"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Add Food
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/coach/nutrition')}
                    className="rounded-xl"
                  >
                    <Utensils className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    View All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Food Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl border-2 max-w-2xl max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold ${theme.text} flex items-center gap-3`}>
              {selectedFood && (
                <>
                  <div className={`w-8 h-8 bg-gradient-to-br ${getCategoryColor(selectedFood.category)} rounded-lg flex items-center justify-center text-white`}>
                    {React.createElement(getCategoryIcon(selectedFood.category), { className: "w-4 h-4" })}
                  </div>
                  {selectedFood.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFood && (
            <div className="space-y-6">
              {/* Food Image Placeholder */}
              <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${getCategoryColor(selectedFood.category)} rounded-xl flex items-center justify-center text-white`}>
                  {React.createElement(getCategoryIcon(selectedFood.category), { className: "w-8 h-8" })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary}`}>Brand</label>
                  <p className={`text-base ${theme.text}`}>{selectedFood.brand || 'Generic'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary}`}>Category</label>
                  <p className={`text-base ${theme.text}`}>{selectedFood.category}</p>
                </div>
              </div>

              {/* Serving Size */}
              <div>
                <label className={`text-sm font-medium ${theme.textSecondary}`}>Serving Size</label>
                <p className={`text-base ${theme.text}`}>{selectedFood.serving_size} {selectedFood.serving_unit}</p>
              </div>

              {/* Nutritional Breakdown */}
              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Nutritional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {selectedFood.calories_per_serving}
                    </div>
                    <div className="text-sm text-green-500 dark:text-green-500">Calories</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {selectedFood.protein}g
                    </div>
                    <div className="text-sm text-red-500 dark:text-red-500">Protein</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedFood.carbs}g
                    </div>
                    <div className="text-sm text-blue-500 dark:text-blue-500">Carbohydrates</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedFood.fat}g
                    </div>
                    <div className="text-sm text-yellow-500 dark:text-yellow-500">Fat</div>
                  </div>
                </div>
                {selectedFood.fiber > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {selectedFood.fiber}g
                    </div>
                    <div className="text-sm text-purple-500 dark:text-purple-500">Fiber</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Edit food action
                    setShowDetailModal(false)
                  }}
                  className="flex-1 rounded-xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Food
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Add to meal plan action
                    setShowDetailModal(false)
                  }}
                  className="flex-1 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Meal Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDeleteFood(selectedFood.id)
                    setShowDetailModal(false)
                  }}
                  className="rounded-xl text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
    </div>
  )
}
