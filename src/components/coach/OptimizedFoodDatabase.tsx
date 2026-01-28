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
      'Protein': 'from-[color:var(--fc-domain-workouts)] to-[color:var(--fc-accent-cyan)]',
      'Grains': 'from-[color:var(--fc-status-warning)] to-[color:var(--fc-accent-purple)]',
      'Vegetables': 'from-[color:var(--fc-domain-meals)] to-[color:var(--fc-accent-cyan)]',
      'Fruits': 'from-[color:var(--fc-accent-purple)] to-[color:var(--fc-accent-cyan)]',
      'Dairy': 'from-[color:var(--fc-accent-cyan)] to-[color:var(--fc-domain-workouts)]',
      'Nuts': 'from-[color:var(--fc-status-warning)] to-[color:var(--fc-domain-meals)]',
      'Beverages': 'from-[color:var(--fc-accent-cyan)] to-[color:var(--fc-accent-purple)]',
      'Snacks': 'from-[color:var(--fc-status-warning)] to-[color:var(--fc-status-error)]',
      'General': 'from-[color:var(--fc-domain-neutral)] to-[color:var(--fc-text-subtle)]'
    }
    return colors[category as keyof typeof colors] || 'from-[color:var(--fc-domain-neutral)] to-[color:var(--fc-text-subtle)]'
  }

  const getNutritionalHighlight = (food: Food) => {
    if (food.protein >= 20) return { label: 'High Protein', color: 'text-[color:var(--fc-status-error)]', icon: Target }
    if (food.calories_per_serving <= 50) return { label: 'Low Calorie', color: 'text-[color:var(--fc-status-success)]', icon: Leaf }
    if (food.fiber >= 5) return { label: 'High Fiber', color: 'text-[color:var(--fc-accent-purple)]', icon: Activity }
    if (food.fat <= 2) return { label: 'Low Fat', color: 'text-[color:var(--fc-accent-cyan)]', icon: Heart }
    return { label: 'Balanced', color: 'text-[color:var(--fc-text-subtle)]', icon: BarChart3 }
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
          <div className="h-64 bg-[color:var(--fc-glass-highlight)]"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="fc-glass fc-card rounded-2xl p-6">
                <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                  <div className="h-16 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header Section */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/coach')}
                    className="fc-btn fc-btn-ghost h-10 w-10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex items-center justify-center">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        Food Database
                      </h1>
                      <p className="text-sm sm:text-base text-[color:var(--fc-text-dim)]">
                        Manage your food database and nutritional information
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={loadFoods}
                    className="fc-btn fc-btn-ghost"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="fc-btn fc-btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Food
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-3">
            <Button
              onClick={loadFoods}
              className="fc-btn fc-btn-ghost flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="fc-btn fc-btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Food
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] text-center p-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[color:var(--fc-glass-soft)] flex items-center justify-center text-[color:var(--fc-domain-meals)]">
              <Utensils className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-[color:var(--fc-text-primary)] mb-1">{foods.length}</p>
            <p className="text-sm text-[color:var(--fc-text-dim)]">Total Foods</p>
          </div>

          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] text-center p-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[color:var(--fc-glass-soft)] flex items-center justify-center text-[color:var(--fc-accent-cyan)]">
              <Star className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-[color:var(--fc-text-primary)] mb-1">{foods.filter(f => f.is_custom).length}</p>
            <p className="text-sm text-[color:var(--fc-text-dim)]">Custom Foods</p>
          </div>

          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] text-center p-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[color:var(--fc-glass-soft)] flex items-center justify-center text-[color:var(--fc-accent-purple)]">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-[color:var(--fc-text-primary)] mb-1">{foods.filter(f => f.protein >= 20).length}</p>
            <p className="text-sm text-[color:var(--fc-text-dim)]">High Protein</p>
          </div>

          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] text-center p-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[color:var(--fc-glass-soft)] flex items-center justify-center text-[color:var(--fc-status-warning)]">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-[color:var(--fc-text-primary)] mb-1">{new Set(foods.map(f => f.category)).size}</p>
            <p className="text-sm text-[color:var(--fc-text-dim)]">Categories</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Search and Filters */}
          <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-[color:var(--fc-text-subtle)] w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    placeholder="Search foods by name, brand, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input pl-10 sm:pl-12 h-10 sm:h-12 text-base sm:text-lg"
                  />
                </div>

                {/* Filters - Mobile First */}
                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="fc-select h-10 sm:h-12">
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
                    <SelectTrigger className="fc-select h-10 sm:h-12">
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
                      <SelectTrigger className="fc-select h-10 sm:h-12 flex-1">
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
                      className="fc-btn fc-btn-ghost h-10 sm:h-12 px-3"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[color:var(--fc-text-dim)]">View:</span>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'fc-btn fc-btn-primary' : 'fc-btn fc-btn-ghost'}
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
                    className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 cursor-pointer group hover:scale-105"
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
                            <h3 className="font-semibold text-[color:var(--fc-text-primary)] text-sm sm:text-base truncate">
                              {food.name}
                            </h3>
                            <p className="text-xs text-[color:var(--fc-text-dim)] truncate">
                              {food.brand || food.category}
                            </p>
                          </div>
                        </div>
                        
                        <Badge className={`${highlight.color} border border-[color:var(--fc-glass-border)] text-xs px-2 py-1 bg-[color:var(--fc-glass-soft)]`}>
                          <highlight.icon className="w-3 h-3 mr-1" />
                          {highlight.label}
                        </Badge>
                      </div>

                      {/* Serving Info */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[color:var(--fc-text-subtle)]">Serving Size</span>
                          <span className="text-xs font-medium text-[color:var(--fc-text-primary)]">
                            {food.serving_size} {food.serving_unit}
                          </span>
                        </div>
                        <div className="text-center p-3 bg-[color:var(--fc-glass-soft)] rounded-xl">
                          <div className="text-lg font-bold text-[color:var(--fc-domain-meals)]">
                            {food.calories_per_serving} cal
                          </div>
                          <div className="text-xs text-[color:var(--fc-text-subtle)]">per serving</div>
                        </div>
                      </div>

                      {/* Macro Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                        <div className="text-center p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <div className="font-semibold text-[color:var(--fc-status-error)]">
                            {food.protein}g
                          </div>
                          <div className="text-[color:var(--fc-text-subtle)]">Protein</div>
                        </div>
                        <div className="text-center p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <div className="font-semibold text-[color:var(--fc-accent-cyan)]">
                            {food.carbs}g
                          </div>
                          <div className="text-[color:var(--fc-text-subtle)]">Carbs</div>
                        </div>
                        <div className="text-center p-2 bg-[color:var(--fc-glass-soft)] rounded-lg">
                          <div className="font-semibold text-[color:var(--fc-status-warning)]">
                            {food.fat}g
                          </div>
                          <div className="text-[color:var(--fc-text-subtle)]">Fat</div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 sm:gap-2 pt-3 border-t border-[color:var(--fc-glass-border)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFoodClick(food)
                          }}
                          className="flex-1 text-xs sm:text-sm fc-btn fc-btn-ghost"
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
                          className="fc-btn fc-btn-ghost p-2"
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
                          className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-status-error)]"
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
                    className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all duration-300 cursor-pointer group"
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
                            <h3 className="font-semibold text-[color:var(--fc-text-primary)] text-base sm:text-lg mb-1 truncate">
                                {food.name}
                              </h3>
                            <p className="text-sm text-[color:var(--fc-text-dim)] mb-2">
                                {food.brand && `${food.brand} • `}{food.serving_size} {food.serving_unit}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${highlight.color} border border-[color:var(--fc-glass-border)] text-xs px-2 py-1 bg-[color:var(--fc-glass-soft)]`}>
                                  <highlight.icon className="w-3 h-3 mr-1" />
                                  {highlight.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {food.category}
                                </Badge>
                                {food.is_custom && (
                                  <Badge variant="outline" className="text-xs text-[color:var(--fc-accent-cyan)]">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nutritional Summary */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-[color:var(--fc-text-dim)]">Nutrition per serving</span>
                              <span className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                                {food.calories_per_serving} calories
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[color:var(--fc-status-error)] rounded-full"></div>
                                <span className="text-[color:var(--fc-text-subtle)]">Protein: {food.protein}g</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[color:var(--fc-accent-cyan)] rounded-full"></div>
                                <span className="text-[color:var(--fc-text-subtle)]">Carbs: {food.carbs}g</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-[color:var(--fc-status-warning)] rounded-full"></div>
                                <span className="text-[color:var(--fc-text-subtle)]">Fat: {food.fat}g</span>
                              </div>
                              {food.fiber > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-[color:var(--fc-accent-purple)] rounded-full"></div>
                                  <span className="text-[color:var(--fc-text-subtle)]">Fiber: {food.fiber}g</span>
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
                          className="fc-btn fc-btn-ghost p-2"
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
                          className="fc-btn fc-btn-ghost p-2"
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
                          className="fc-btn fc-btn-ghost p-2 text-[color:var(--fc-status-error)]"
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
            <Card className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
              <CardContent className="text-center py-12 sm:py-16">
                <div className="relative">
                  <Utensils className="w-16 h-16 sm:w-20 sm:h-20 text-[color:var(--fc-text-subtle)] mx-auto mb-6" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[color:var(--fc-domain-meals)] rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[color:var(--fc-text-primary)] mb-3">
                  {foods.length === 0 ? 'No foods in database yet' : 'No foods found'}
                </h3>
                <p className="text-base sm:text-lg text-[color:var(--fc-text-dim)] mb-8 max-w-md mx-auto">
                  {foods.length === 0 
                    ? 'Start building your food database by adding nutritional information.'
                    : 'Try adjusting your search or filter criteria to find the foods you\'re looking for.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="fc-btn fc-btn-primary px-8"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Add Food
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/coach/nutrition')}
                    className="fc-btn fc-btn-ghost"
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
        <DialogContent className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[color:var(--fc-text-primary)] flex items-center gap-3">
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
              <div className="w-full h-48 bg-[color:var(--fc-glass-soft)] rounded-xl flex items-center justify-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${getCategoryColor(selectedFood.category)} rounded-xl flex items-center justify-center text-white`}>
                  {React.createElement(getCategoryIcon(selectedFood.category), { className: "w-8 h-8" })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[color:var(--fc-text-dim)]">Brand</label>
                  <p className="text-base text-[color:var(--fc-text-primary)]">{selectedFood.brand || 'Generic'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[color:var(--fc-text-dim)]">Category</label>
                  <p className="text-base text-[color:var(--fc-text-primary)]">{selectedFood.category}</p>
                </div>
              </div>

              {/* Serving Size */}
              <div>
                <label className="text-sm font-medium text-[color:var(--fc-text-dim)]">Serving Size</label>
                <p className="text-base text-[color:var(--fc-text-primary)]">{selectedFood.serving_size} {selectedFood.serving_unit}</p>
              </div>

              {/* Nutritional Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-4">Nutritional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <div className="text-2xl font-bold text-[color:var(--fc-domain-meals)]">
                      {selectedFood.calories_per_serving}
                    </div>
                    <div className="text-sm text-[color:var(--fc-text-subtle)]">Calories</div>
                  </div>
                  <div className="p-4 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <div className="text-2xl font-bold text-[color:var(--fc-status-error)]">
                      {selectedFood.protein}g
                    </div>
                    <div className="text-sm text-[color:var(--fc-text-subtle)]">Protein</div>
                  </div>
                  <div className="p-4 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <div className="text-2xl font-bold text-[color:var(--fc-accent-cyan)]">
                      {selectedFood.carbs}g
                    </div>
                    <div className="text-sm text-[color:var(--fc-text-subtle)]">Carbohydrates</div>
                  </div>
                  <div className="p-4 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <div className="text-2xl font-bold text-[color:var(--fc-status-warning)]">
                      {selectedFood.fat}g
                    </div>
                    <div className="text-sm text-[color:var(--fc-text-subtle)]">Fat</div>
                  </div>
                </div>
                {selectedFood.fiber > 0 && (
                  <div className="mt-4 p-4 bg-[color:var(--fc-glass-soft)] rounded-xl">
                    <div className="text-2xl font-bold text-[color:var(--fc-accent-purple)]">
                      {selectedFood.fiber}g
                    </div>
                    <div className="text-sm text-[color:var(--fc-text-subtle)]">Fiber</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[color:var(--fc-glass-border)]">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Edit food action
                    setShowDetailModal(false)
                  }}
                  className="fc-btn fc-btn-ghost flex-1"
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
                  className="fc-btn fc-btn-ghost flex-1"
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
                  className="fc-btn fc-btn-ghost text-[color:var(--fc-status-error)]"
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
