'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { 
  Apple,
  Calendar,
  Flame,
  TrendingUp,
  X
} from 'lucide-react'

interface ClientMealsViewProps {
  clientId: string
}

interface MealPlanAssignment {
  id: string
  start_date: string
  end_date?: string
  status: string
  created_at: string
  meal_plans?: {
    name: string
    notes?: string
    target_calories?: number
    target_protein?: number
    target_carbs?: number
    target_fat?: number
  }
}

export default function ClientMealsView({ clientId }: ClientMealsViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [mealPlans, setMealPlans] = useState<MealPlanAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0
  })

  useEffect(() => {
    loadMealPlans()
  }, [clientId])

  const loadMealPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plan_assignments')
        .select(`
          *,
          meal_plans(
            name,
            notes,
            target_calories,
            target_protein,
            target_carbs,
            target_fat
          )
        `)
        .eq('client_id', clientId)
        .order('start_date', { ascending: false })

      if (error) {
        // Table might not exist - show empty state
        setMealPlans([])
        setLoading(false)
        return
      }

      setMealPlans(data || [])
      
      const total = data?.length || 0
      const active = data?.filter(m => !m.end_date || new Date(m.end_date) >= new Date()).length || 0
      
      setStats({ total, active })
    } catch {
      // Silently handle error and show empty state
      setMealPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignMealPlan = async (mealPlanId: string) => {
    if (!confirm('Are you sure you want to unassign this meal plan?')) return

    try {
      const { error } = await supabase
        .from('meal_plan_assignments')
        .delete()
        .eq('id', mealPlanId)

      if (error) throw error

      // Refresh the list
      await loadMealPlans()
    } catch (error) {
      console.error('Error unassigning meal plan:', error)
      alert('Failed to unassign meal plan. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse">
            <div className={`${theme.card} h-32`} style={{ borderRadius: '24px', padding: '24px' }}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-teal-500 to-cyan-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.total}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Total Plans</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{stats.active}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Active Now</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Meal Plans List */}
      <div className="space-y-4">
        {mealPlans.length === 0 ? (
          <Card className={`${theme.card} border-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="text-center" style={{ padding: '48px 24px' }}>
              <Apple className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className={`${theme.text} mb-2`} style={{ fontSize: '20px', fontWeight: '700' }}>
                No Meal Plans Assigned
              </h3>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                This client doesn't have any meal plan assignments yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          mealPlans.map((plan) => (
            <div key={plan.id} className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 hover:shadow-lg transition-all" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
                <CardContent style={{ padding: '20px' }}>
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                      <Apple className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h4 className={`${theme.text} break-words overflow-wrap-anywhere flex-1 min-w-0`} style={{ fontSize: '18px', fontWeight: '600' }}>
                          {plan.meal_plans?.name || 'Meal Plan'}
                        </h4>
                        <Button
                          onClick={() => handleUnassignMealPlan(plan.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Macros */}
                      {plan.meal_plans && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="flex flex-col items-center bg-red-50 dark:bg-red-900/20" style={{ padding: '12px', borderRadius: '16px' }}>
                            <Flame className="w-4 h-4 mb-1 text-red-600 dark:text-red-400" />
                            <span className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>
                              {plan.meal_plans.target_calories || 0}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>cal</span>
                          </div>
                          
                          <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20" style={{ padding: '12px', borderRadius: '16px' }}>
                            <TrendingUp className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
                            <span className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>
                              {plan.meal_plans.target_protein || 0}g
                            </span>
                            <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>protein</span>
                          </div>
                          
                          <div className="flex flex-col items-center bg-yellow-50 dark:bg-yellow-900/20" style={{ padding: '12px', borderRadius: '16px' }}>
                            <TrendingUp className="w-4 h-4 mb-1 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>
                              {plan.meal_plans.target_carbs || 0}g
                            </span>
                            <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>carbs</span>
                          </div>
                          
                          <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-900/20" style={{ padding: '12px', borderRadius: '16px' }}>
                            <TrendingUp className="w-4 h-4 mb-1 text-orange-600 dark:text-orange-400" />
                            <span className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>
                              {plan.meal_plans.target_fat || 0}g
                            </span>
                            <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>fat</span>
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className={`${theme.textSecondary} whitespace-nowrap`}>
                            Start: {new Date(plan.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        {plan.end_date && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className={`${theme.textSecondary} whitespace-nowrap`}>
                              End: {new Date(plan.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

