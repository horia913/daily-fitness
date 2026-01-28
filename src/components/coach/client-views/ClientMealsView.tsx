'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
        console.error('Error loading meal plans:', error)
        setMealPlans([])
        setLoading(false)
        return
      }

      setMealPlans(data || [])
      
      const total = data?.length || 0
      const active = data?.filter(m => !m.end_date || new Date(m.end_date) >= new Date()).length || 0
      
      setStats({ total, active })
    } catch (error) {
      console.error('Error loading meal plans:', error)
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
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Nutrition
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Meal Plan Overview
              </h3>
              <p className="text-sm fc-text-dim">
                Active nutrition assignments and targets
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{stats.total}</p>
            <p className="text-sm fc-text-dim">Total Plans</p>
          </div>

          <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{stats.active}</p>
            <p className="text-sm fc-text-dim">Active Now</p>
          </div>
        </div>
      </div>

      {/* Meal Plans List */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Apple className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Meal Plans
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Assigned Plans
              </h3>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
              {mealPlans.length}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
        {mealPlans.length === 0 ? (
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl text-center px-6 py-12">
            <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
              <Apple className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No Meal Plans Assigned
            </h3>
            <p className="text-sm fc-text-dim">
              This client doesn't have any meal plan assignments yet.
            </p>
          </div>
        ) : (
          mealPlans.map((plan) => (
            <div
              key={plan.id}
              className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="fc-icon-tile fc-icon-workouts">
                  <Apple className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold fc-text-primary break-words">
                        {plan.meal_plans?.name || 'Meal Plan'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`fc-pill fc-pill-glass text-xs ${
                          !plan.end_date || new Date(plan.end_date) >= new Date()
                            ? 'fc-text-success'
                            : 'fc-text-error'
                        }`}>
                          {!plan.end_date || new Date(plan.end_date) >= new Date() ? 'Active' : 'Expired'}
                        </span>
                        <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                          {plan.meal_plans?.target_calories || 0} kcal
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUnassignMealPlan(plan.id)}
                      variant="ghost"
                      size="sm"
                      className="fc-btn fc-btn-ghost h-8 w-8 p-0 fc-text-error flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Macros */}
                  {plan.meal_plans && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3 text-center">
                        <Flame className="w-4 h-4 mb-1 fc-text-error mx-auto" />
                        <span className="text-sm font-semibold fc-text-primary">
                          {plan.meal_plans.target_calories || 0}
                        </span>
                        <span className="text-xs fc-text-subtle">cal</span>
                      </div>
                      
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3 text-center">
                        <TrendingUp className="w-4 h-4 mb-1 fc-text-success mx-auto" />
                        <span className="text-sm font-semibold fc-text-primary">
                          {plan.meal_plans.target_protein || 0}g
                        </span>
                        <span className="text-xs fc-text-subtle">protein</span>
                      </div>
                      
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3 text-center">
                        <TrendingUp className="w-4 h-4 mb-1 fc-text-workouts mx-auto" />
                        <span className="text-sm font-semibold fc-text-primary">
                          {plan.meal_plans.target_carbs || 0}g
                        </span>
                        <span className="text-xs fc-text-subtle">carbs</span>
                      </div>
                      
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3 text-center">
                        <TrendingUp className="w-4 h-4 mb-1 fc-text-warning mx-auto" />
                        <span className="text-sm font-semibold fc-text-primary">
                          {plan.meal_plans.target_fat || 0}g
                        </span>
                        <span className="text-xs fc-text-subtle">fat</span>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 fc-text-workouts flex-shrink-0" />
                      <span className="fc-text-subtle whitespace-nowrap">
                        Start: {new Date(plan.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    {plan.end_date && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 fc-text-subtle flex-shrink-0" />
                        <span className="fc-text-subtle whitespace-nowrap">
                          End: {new Date(plan.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  )
}

