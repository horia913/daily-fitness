'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Grid3X3,
  List,
  X,
  RefreshCw,
  SlidersHorizontal,
  Target,
  Dumbbell,
  Clock,
  Star,
  Users
} from 'lucide-react'

interface ExerciseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface ExerciseSearchFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedDifficulty: string
  onDifficultyChange: (difficulty: string) => void
  selectedEquipment: string
  onEquipmentChange: (equipment: string) => void
  sortBy: 'name' | 'created' | 'usage' | 'rating'
  onSortByChange: (sortBy: 'name' | 'created' | 'usage' | 'rating') => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  categories: ExerciseCategory[]
  selectedExercises: Set<string>
  totalExercises: number
  onSelectAll: () => void
  onClearSelection: () => void
  onResetFilters: () => void
}

export default function ExerciseSearchFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedEquipment,
  onEquipmentChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  categories,
  selectedExercises,
  totalExercises,
  onSelectAll,
  onClearSelection,
  onResetFilters
}: ExerciseSearchFiltersProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const equipmentOptions = [
    'Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
    'Cable Machine', 'Smith Machine', 'Bench', 'Pull-up Bar', 'Medicine Ball',
    'Stability Ball', 'Foam Roller', 'Yoga Mat', 'Treadmill', 'Bike',
    'Rowing Machine', 'Elliptical', 'Jump Rope'
  ]

  const sortOptions = [
    { value: 'name', label: 'Name', icon: Target },
    { value: 'created', label: 'Date Created', icon: Clock },
    { value: 'usage', label: 'Usage Count', icon: Users },
    { value: 'rating', label: 'Rating', icon: Star }
  ]

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
    { value: 'advanced', label: 'Advanced', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' }
  ]

  const hasActiveFilters = selectedCategory !== 'all' || 
                          selectedDifficulty !== 'all' || 
                          selectedEquipment !== 'all' ||
                          searchTerm.length > 0

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search exercises by name, description, or muscle group..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 rounded-xl border-2 text-lg"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${theme.text}`}>Quick Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-xs"
                >
                  <SlidersHorizontal className="w-3 h-3 mr-1" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <label className={`text-sm font-medium ${theme.text} mb-2 block`}>Category</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onCategoryChange('all')}
                  className="rounded-xl"
                >
                  All Categories
                </Button>
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onCategoryChange(category.name)}
                    className="rounded-xl"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Difficulty Filters */}
            <div>
              <label className={`text-sm font-medium ${theme.text} mb-2 block`}>Difficulty</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDifficultyChange('all')}
                  className="rounded-xl"
                >
                  All Levels
                </Button>
                {difficultyOptions.map(difficulty => (
                  <Button
                    key={difficulty.value}
                    variant={selectedDifficulty === difficulty.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onDifficultyChange(difficulty.value)}
                    className="rounded-xl"
                  >
                    {difficulty.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Equipment Filter */}
                <div>
                  <label className={`text-sm font-medium ${theme.text} mb-2 block`}>Equipment</label>
                  <Select value={selectedEquipment} onValueChange={onEquipmentChange}>
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Select Equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Equipment</SelectItem>
                      {equipmentOptions.map(equipment => (
                        <SelectItem key={equipment} value={equipment}>
                          {equipment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-medium ${theme.text} mb-2 block`}>Sort By</label>
                    <Select value={sortBy} onValueChange={(value: any) => onSortByChange(value)}>
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(option => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className={`text-sm font-medium ${theme.text} mb-2 block`}>Order</label>
                    <Button
                      variant="outline"
                      onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-full h-12 rounded-xl border-2 justify-start"
                    >
                      {sortOrder === 'asc' ? (
                        <>
                          <SortAsc className="w-4 h-4 mr-2" />
                          Ascending
                        </>
                      ) : (
                        <>
                          <SortDesc className="w-4 h-4 mr-2" />
                          Descending
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Controls and Selection */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme.textSecondary}`}>View:</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('grid')}
                  className="rounded-xl"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('list')}
                  className="rounded-xl"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme.textSecondary}`}>
                  {totalExercises} exercises
                </span>
                {hasActiveFilters && (
                  <Badge variant="outline" className="text-xs">
                    Filtered
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedExercises.size > 0 && (
                <>
                  <span className={`text-sm ${theme.textSecondary}`}>
                    {selectedExercises.size} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={onClearSelection} className="text-xs">
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={onSelectAll} className="text-xs">
                    Select All
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
