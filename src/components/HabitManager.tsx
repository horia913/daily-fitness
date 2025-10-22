'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  X, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  Target, 
  Edit,
  CheckCircle,
  Users,
  Calendar,
  Activity,
  Star,
  Award,
  Zap,
  Heart,
  Sparkles,
  ArrowRight,
  Save,
  AlertCircle,
  Flame,
  Layers
} from 'lucide-react'
import { 
  Habit, 
  UserHabit, 
  HabitCategory 
} from '@/lib/habitTracker'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

interface HabitManagerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
  coachId?: string
  editingHabit?: UserHabit | null
}

export default function HabitManagerComponent({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId,
  coachId,
  editingHabit 
}: HabitManagerProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [userHabits, setUserHabits] = useState<UserHabit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [activeTab, setActiveTab] = useState('templates')
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [customHabitForm, setCustomHabitForm] = useState({
    name: '',
    description: '',
    category_id: '',
    icon: '🎯',
    color: '#3B82F6',
    frequency_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    target_value: 1,
    unit: 'time'
  })

  const loadData = useCallback(async () => {
    try {
      
      // Load available habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select(`
          *,
          category:habit_categories(*)
        `)
        .eq('is_active', true)
        .eq('is_public', true)
        .order('name')

      if (habitsError) throw habitsError

      // Load user's existing habits
      const { data: userHabitsData, error: userHabitsError } = await supabase
        .from('user_habits')
        .select(`
          *,
          habit:habits(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (userHabitsError) throw userHabitsError

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('habit_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (categoriesError) throw categoriesError

      setHabits(habitsData || [])
      setUserHabits(userHabitsData || [])
      setCategories(categoriesData || [])
      
    } catch (error) {
      console.error('Error loading habit data:', error)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (editingHabit) {
        setCustomHabitForm({
          name: editingHabit.custom_name || editingHabit.habit?.name || '',
          description: editingHabit.custom_description || editingHabit.habit?.description || '',
          category_id: editingHabit.habit?.category_id || '',
          icon: editingHabit.habit?.icon || '🎯',
          color: editingHabit.habit?.color || '#3B82F6',
          frequency_type: editingHabit.frequency_type,
          target_value: editingHabit.target_value,
          unit: editingHabit.habit?.unit || 'time'
        })
      }
      setValidationErrors({})
      setShowSuccessAnimation(false)
    }
  }, [isOpen, editingHabit, loadData])

  const validateForm = useCallback(() => {
    const errors: {[key: string]: string} = {}
    
    if (!customHabitForm.name.trim()) {
      errors.name = 'Habit name is required'
    } else if (customHabitForm.name.trim().length < 2) {
      errors.name = 'Habit name must be at least 2 characters'
    } else if (customHabitForm.name.trim().length > 50) {
      errors.name = 'Habit name must be less than 50 characters'
    }
    
    if (customHabitForm.description && customHabitForm.description.length > 200) {
      errors.description = 'Description must be less than 200 characters'
    }
    
    if (!customHabitForm.category_id) {
      errors.category = 'Category is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [customHabitForm])

  const showSuccessFeedback = () => {
    setShowSuccessAnimation(true)
    setTimeout(() => setShowSuccessAnimation(false), 2000)
  }

  const getFrequencyIcon = (type: string) => {
    switch (type) {
      case 'daily': return Calendar
      case 'weekly': return Calendar
      case 'monthly': return Calendar
      default: return Clock
    }
  }


  const getHabitIcon = (icon: string) => {
    const iconMap: {[key: string]: React.ComponentType<{className?: string}>} = {
      '🎯': Target,
      '💧': Heart,
      '🏃': Activity,
      '📚': Star,
      '🧘': Award,
      '⚡': Zap,
      '🔥': Flame,
      '⭐': Star
    }
    return iconMap[icon] || Target
  }

  const handleAddHabit = async (habit: Habit) => {
    try {
      const { error } = await supabase
        .from('user_habits')
        .insert({
          user_id: userId,
          habit_id: habit.id,
          coach_id: coachId,
          target_value: habit.target_value,
          frequency_type: habit.frequency_type,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0]
        })

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding habit:', error)
      alert('Error adding habit. Please try again.')
    }
  }

  const handleAddCustomHabit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      // First create the custom habit
      const { data: newHabit, error: habitError } = await supabase
        .from('habits')
        .insert({
          coach_id: coachId,
          category_id: customHabitForm.category_id,
          name: customHabitForm.name.trim(),
          description: customHabitForm.description.trim(),
          icon: customHabitForm.icon,
          color: customHabitForm.color,
          frequency_type: customHabitForm.frequency_type,
          target_value: customHabitForm.target_value,
          unit: customHabitForm.unit,
          is_public: false,
          is_active: true
        })
        .select()
        .single()

      if (habitError) throw habitError

      // Then create the user habit
      const { error: userHabitError } = await supabase
        .from('user_habits')
        .insert({
          user_id: userId,
          habit_id: newHabit.id,
          coach_id: coachId,
          custom_name: customHabitForm.name.trim(),
          custom_description: customHabitForm.description.trim(),
          target_value: customHabitForm.target_value,
          frequency_type: customHabitForm.frequency_type,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0]
        })

      if (userHabitError) throw userHabitError

      showSuccessFeedback()
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error adding custom habit:', error)
      alert('Error adding custom habit. Please try again.')
    }
  }

  const handleUpdateHabit = async () => {
    if (!editingHabit) return

    if (!validateForm()) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_habits')
        .update({
          custom_name: customHabitForm.name.trim(),
          custom_description: customHabitForm.description.trim(),
          target_value: customHabitForm.target_value,
          frequency_type: customHabitForm.frequency_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHabit.id)

      if (error) throw error

      showSuccessFeedback()
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error updating habit:', error)
      alert('Error updating habit. Please try again.')
    }
  }


  const filteredHabits = habits.filter(habit => {
    const matchesSearch = habit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         habit.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || habit.category_id === filterCategory
    const notAlreadyAdded = !userHabits.some(uh => uh.habit_id === habit.id)
    
    return matchesSearch && matchesCategory && notAlreadyAdded
  })

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown'
  }

  const getCategoryIcon = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.icon || '📁'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-hidden">
        <Card className={`${theme.card} border ${theme.border} h-full flex flex-col rounded-3xl ${theme.shadow}`}>
          {/* Header */}
          <CardHeader className="pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                  <Target className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                    {editingHabit ? 'Edit Habit' : 'Manage Habits'}
                  </CardTitle>
                  <p className={`${theme.textSecondary} mt-1`}>
                    {editingHabit ? 'Customize your habit settings' : 'Create templates and assign habits to clients'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showSuccessAnimation && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
                <Button variant="outline" onClick={onClose} className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {showSuccessAnimation ? (
              /* Success Animation */
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Habit {editingHabit ? 'Updated' : 'Created'}!</h3>
                <p className={`${theme.textSecondary}`}>Your habit has been {editingHabit ? 'updated' : 'created'} successfully! 🎉</p>
              </div>
            ) : editingHabit ? (
              /* Edit Habit Form */
              <div className="space-y-8">
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                        <Edit className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Edit Habit</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className={`text-sm font-semibold ${theme.text}`}>
                          Habit Name *
                        </Label>
                        <Input
                          id="name"
                          value={customHabitForm.name}
                          onChange={(e) => setCustomHabitForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Drink Water"
                          className="rounded-xl h-12"
                        />
                        {validationErrors.name && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{validationErrors.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="frequency" className={`text-sm font-semibold ${theme.text}`}>
                          Frequency
                        </Label>
                        <Select
                          value={customHabitForm.frequency_type}
                          onValueChange={(value) => setCustomHabitForm(prev => ({ ...prev, frequency_type: value as 'daily' | 'weekly' | 'monthly' }))}
                        >
                          <SelectTrigger className="rounded-xl h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className={`text-sm font-semibold ${theme.text}`}>
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={customHabitForm.description}
                        onChange={(e) => setCustomHabitForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your habit..."
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
                        {customHabitForm.description.length}/200 characters
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="target" className={`text-sm font-semibold ${theme.text}`}>
                          Target Value
                        </Label>
                        <Input
                          id="target"
                          type="number"
                          min="1"
                          value={customHabitForm.target_value}
                          onChange={(e) => setCustomHabitForm(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
                          className="rounded-xl h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit" className={`text-sm font-semibold ${theme.text}`}>
                          Unit
                        </Label>
                        <Input
                          id="unit"
                          value={customHabitForm.unit}
                          onChange={(e) => setCustomHabitForm(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="e.g., glasses, minutes, times"
                          className="rounded-xl h-12"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Main Habit Management Interface */
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full grid-cols-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <TabsTrigger value="templates" className="rounded-xl flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span className="hidden sm:inline">Habit Templates</span>
                  </TabsTrigger>
                  <TabsTrigger value="assign" className="rounded-xl flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Assign Habits</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-8 mt-8">
                  {/* Search & Filter */}
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                            <Input
                              placeholder="Search habit templates..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Filter className={`w-5 h-5 ${theme.textSecondary}`} />
                          <Select
                            value={filterCategory}
                            onValueChange={setFilterCategory}
                          >
                            <SelectTrigger className="w-48 h-12 rounded-xl">
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Categories</SelectItem>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{category.icon}</span>
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Available Habits */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                          <Target className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <h3 className={`text-xl font-bold ${theme.text}`}>Available Habits</h3>
                      </div>
                      <Button
                        onClick={() => setShowAddCustom(true)}
                        className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3 font-semibold`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Custom
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredHabits.map(habit => {
                        const FrequencyIcon = getFrequencyIcon(habit.frequency_type)
                        const HabitIcon = getHabitIcon(habit.icon)
                        return (
                          <Card key={habit.id} className={`${theme.card} border ${theme.border} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                    style={{ backgroundColor: habit.color + '20' }}
                                  >
                                    <HabitIcon 
                                      className="w-6 h-6" 
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className={`font-semibold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                      {habit.name}
                                    </h4>
                                    <p className={`text-sm ${theme.textSecondary} leading-relaxed`}>
                                      {habit.description}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className={`rounded-xl text-xs ${theme.border}`}>
                                  {getCategoryIcon(habit.category_id)} {getCategoryName(habit.category_id)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between mb-4">
                                <div className={`flex items-center gap-2 ${theme.textSecondary}`}>
                                  <FrequencyIcon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{habit.frequency_type}</span>
                                </div>
                                <div className={`flex items-center gap-2 ${theme.textSecondary}`}>
                                  <Target className="w-4 h-4" />
                                  <span className="text-sm font-medium">{habit.target_value} {habit.unit}</span>
                                </div>
                              </div>

                              <Button
                                onClick={() => handleAddHabit(habit)}
                                className={`w-full rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Habit
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    {filteredHabits.length === 0 && (
                      <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                        <CardContent className="p-12 text-center">
                          <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                            <Target className="w-12 h-12 text-white" />
                          </div>
                          <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                            {searchTerm || filterCategory ? 'No habits found' : 'No habits available'}
                          </h3>
                          <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                            {searchTerm || filterCategory 
                              ? 'Try adjusting your search criteria or create a custom habit.'
                              : 'Create your first habit template to get started.'
                            }
                          </p>
                          <Button 
                            onClick={() => setShowAddCustom(true)}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                          >
                            <Plus className="w-5 h-5 mr-3" />
                            Create Custom Habit
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Custom Habit Form */}
                  {showAddCustom && (
                    <Card className={`${theme.card} border-2 border-purple-200 dark:border-purple-800 ${isDark ? 'bg-purple-900/10' : 'bg-purple-50'} rounded-2xl`}>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-800' : 'bg-purple-100'}`}>
                            <Plus className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          </div>
                          <CardTitle className={`text-xl font-bold ${theme.text}`}>Create Custom Habit</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="custom_name" className={`text-sm font-semibold ${theme.text}`}>
                              Habit Name *
                            </Label>
                            <Input
                              id="custom_name"
                              value={customHabitForm.name}
                              onChange={(e) => setCustomHabitForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., Morning Meditation"
                              className="rounded-xl h-12"
                            />
                            {validationErrors.name && (
                              <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{validationErrors.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custom_category" className={`text-sm font-semibold ${theme.text}`}>
                              Category *
                            </Label>
                            <Select
                              value={customHabitForm.category_id}
                              onValueChange={(value) => setCustomHabitForm(prev => ({ ...prev, category_id: value }))}
                            >
                              <SelectTrigger className="rounded-xl h-12">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.id} value={category.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{category.icon}</span>
                                      {category.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors.category && (
                              <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{validationErrors.category}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="custom_description" className={`text-sm font-semibold ${theme.text}`}>
                            Description
                          </Label>
                          <Textarea
                            id="custom_description"
                            value={customHabitForm.description}
                            onChange={(e) => setCustomHabitForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe your custom habit..."
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
                            {customHabitForm.description.length}/200 characters
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="custom_frequency" className={`text-sm font-semibold ${theme.text}`}>
                              Frequency
                            </Label>
                            <Select
                              value={customHabitForm.frequency_type}
                              onValueChange={(value) => setCustomHabitForm(prev => ({ ...prev, frequency_type: value as 'daily' | 'weekly' | 'monthly' }))}
                            >
                              <SelectTrigger className="rounded-xl h-12">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custom_target" className={`text-sm font-semibold ${theme.text}`}>
                              Target Value
                            </Label>
                            <Input
                              id="custom_target"
                              type="number"
                              min="1"
                              value={customHabitForm.target_value}
                              onChange={(e) => setCustomHabitForm(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
                              className="rounded-xl h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custom_unit" className={`text-sm font-semibold ${theme.text}`}>
                              Unit
                            </Label>
                            <Input
                              id="custom_unit"
                              value={customHabitForm.unit}
                              onChange={(e) => setCustomHabitForm(prev => ({ ...prev, unit: e.target.value }))}
                              placeholder="e.g., minutes, times"
                              className="rounded-xl h-12"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={handleAddCustomHabit}
                            disabled={!customHabitForm.name.trim() || !customHabitForm.category_id}
                            className={`flex-1 rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200 h-12 font-semibold`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Create Habit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowAddCustom(false)}
                            className="rounded-xl h-12"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="assign" className="space-y-8 mt-8">
                  {/* Assignment Interface */}
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                          <Users className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Assign Habits to Clients</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="text-center py-12">
                        <div className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                          <Users className="w-12 h-12 text-white" />
                        </div>
                        <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>Bulk Assignment Coming Soon</h3>
                        <p className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}>
                          This feature will allow you to assign multiple habits to multiple clients at once for efficient habit management.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-purple-600">
                          <Sparkles className="w-5 h-5" />
                          <span className="font-semibold">Feature in development</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Footer */}
          {editingHabit && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div className={`text-sm ${theme.textSecondary}`}>
                  Customize your habit settings and track progress
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="rounded-xl h-12"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateHabit}
                    disabled={!customHabitForm.name.trim() || !customHabitForm.category_id}
                    className={`rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200 h-12 font-semibold`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Habit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
