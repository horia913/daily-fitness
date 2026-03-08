'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SetNutritionGoals } from './SetNutritionGoals'
import { getClientNutritionMode, getClientNutritionGoals, getLogRange, getNutritionComplianceTrend, type NutritionMode } from '@/lib/nutritionLogService'
import { getDayEntries, type FoodLogEntry } from '@/lib/foodLogService'
import { 
  Apple,
  Calendar,
  Flame,
  TrendingUp,
  X,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  UtensilsCrossed,
  Plus,
  Pencil
} from 'lucide-react'
import { MealPlanService } from '@/lib/mealPlanService'
import type { MealPlan } from '@/lib/mealPlanService'
import MealPlanAssignmentModal from '@/components/features/nutrition/MealPlanAssignmentModal'
import { DatabaseService, type Client } from '@/lib/database'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast-provider'
import { NutritionComplianceChart } from '@/components/progress/NutritionComplianceChart'

interface ClientMealsViewProps {
  clientId: string
}

interface MealPlanAssignment {
  id: string
  start_date: string
  end_date?: string
  status?: string
  is_active?: boolean
  label?: string | null
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

interface MealPlanCompliance {
  totalMeals: number
  loggedMeals: number
  compliancePercentage: number
  consumedCaloriesToday?: number
  todayMeals: Array<{
    id: string
    name: string
    emoji: string
    logged: boolean
    optionName?: string
    photoUrl?: string
    completedAt?: string // ISO string for display
    optionMacros?: { calories: number; protein: number; carbs: number; fat: number }
  }>
}

interface MacroAdherence {
  todayTotal: { calories: number; protein: number; carbs: number; fat: number }
  todayTarget: { calories: number; protein: number; carbs: number; fat: number }
  sevenDayAdherence: number // % of days within 10% of calorie target
  trend: Array<{ date: string; calories: number; target: number; withinTarget: boolean }>
  todayEntries: FoodLogEntry[]
}

export default function ClientMealsView({ clientId }: ClientMealsViewProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [nutritionMode, setNutritionMode] = useState<NutritionMode | null>(null)
  const [loading, setLoading] = useState(true)
  const [mealPlans, setMealPlans] = useState<MealPlanAssignment[]>([])
  const [mealPlanCompliance, setMealPlanCompliance] = useState<MealPlanCompliance | null>(null)
  const [macroAdherence, setMacroAdherence] = useState<MacroAdherence | null>(null)
  const [unifiedCompliance, setUnifiedCompliance] = useState<number>(0)
  const [complianceTrend, setComplianceTrend] = useState<Array<{ date: string; compliance: number }>>([])
  // Phase N4/N5: today's plan selection + 7-day history; assign-another flow; Today's Plan block
  const [todaySelectionAssignmentId, setTodaySelectionAssignmentId] = useState<string | null>(null)
  const [selectionHistory, setSelectionHistory] = useState<Array<{ date: string; label: string; assignmentId: string }>>([])
  const [todayPlanSummary, setTodayPlanSummary] = useState<{ planName: string; label?: string; targetCalories?: number } | null>(null)
  const [weeklyCompliance, setWeeklyCompliance] = useState<{
    days: Array<{ date: string; dayLabel: string; planName: string; totalMeals: number; completed: number; compliancePct: number }>
    weeklyAveragePct: number
    mostChosenPlan: string
    mostChosenDays: number
  } | null>(null)
  const [weeklyMacroAdherence, setWeeklyMacroAdherence] = useState<{
    avg: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
    targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  } | null>(null)
  const [assignmentCompliance, setAssignmentCompliance] = useState<Record<string, number>>({})
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedPlanForAssign, setSelectedPlanForAssign] = useState<MealPlan | null>(null)
  const [coachMealPlans, setCoachMealPlans] = useState<MealPlan[]>([])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState('')
  const [assignModalClients, setAssignModalClients] = useState<Client[]>([])
  const [assignModalSelectedClients, setAssignModalSelectedClients] = useState<string[]>([clientId])

  useEffect(() => {
    loadAllData()
  }, [clientId])

  const loadAllData = async () => {
    try {
      setLoading(true)
      
      // 1. Detect mode
      const mode = await getClientNutritionMode(clientId)
      setNutritionMode(mode)
      
      // 2. Load meal plans (for all modes - needed for compliance)
      await loadMealPlans()
      await loadPlanSelectionHistory()

      // 3. Load compliance data based on mode
      if (mode === 'meal_plan' || mode === 'hybrid') {
        await loadMealPlanCompliance()
        await loadWeeklyCompliance()
        await loadWeeklyMacroAdherence()
        await loadAssignmentCompliance()
      }

      if (mode === 'goal_based' || mode === 'hybrid') {
        await loadMacroAdherence()
      }

      // 4. Load compliance trend for chart (last 90 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 90)
      getNutritionComplianceTrend(
        clientId,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      ).then(setComplianceTrend).catch(() => setComplianceTrend([]))
      
      // 5. Calculate unified compliance
      calculateUnifiedCompliance()
    } catch (error) {
      console.error('Error loading nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }

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

      if (error) throw error
      setMealPlans(data || [])
    } catch (error) {
      console.error('Error loading meal plans:', error)
      setMealPlans([])
    }
  }

  const loadPlanSelectionHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const start = sevenDaysAgo.toISOString().split('T')[0]

      const { data: selections, error } = await supabase
        .from('client_daily_plan_selection')
        .select('date, meal_plan_assignment_id')
        .eq('client_id', clientId)
        .gte('date', start)
        .lte('date', today)
        .order('date', { ascending: false })

      if (error) throw error

      const assignmentIds = [...new Set((selections || []).map((s: { meal_plan_assignment_id: string }) => s.meal_plan_assignment_id))]
      let assignmentInfo = new Map<string, { name: string; label?: string; target_calories?: number }>()
      if (assignmentIds.length > 0) {
        const { data: assignments } = await supabase
          .from('meal_plan_assignments')
          .select('id, label, meal_plans(name, target_calories)')
          .in('id', assignmentIds)
        ;(assignments || []).forEach((a: { id: string; label?: string; meal_plans: { name: string; target_calories?: number } | { name: string; target_calories?: number }[] | null }) => {
          const plan = Array.isArray(a.meal_plans) ? a.meal_plans[0] ?? null : a.meal_plans
          assignmentInfo.set(a.id, {
            name: plan?.name ?? 'Meal Plan',
            label: a.label ?? undefined,
            target_calories: plan?.target_calories ?? undefined,
          })
        })
      }

      const todayRow = (selections || []).find((s: { date: string }) => s.date === today)
      setTodaySelectionAssignmentId(todayRow?.meal_plan_assignment_id ?? null)

      const history = (selections || []).map((s: { date: string; meal_plan_assignment_id: string }) => {
        const info = assignmentInfo.get(s.meal_plan_assignment_id)
        const label = [info?.name, info?.target_calories ? `${info.target_calories}kcal` : '', info?.label].filter(Boolean).join(' - ')
        return { date: s.date, label: label || 'Unknown', assignmentId: s.meal_plan_assignment_id }
      })
      setSelectionHistory(history)
    } catch (error) {
      console.error('Error loading plan selection history:', error)
      setTodaySelectionAssignmentId(null)
      setSelectionHistory([])
    }
  }

  const loadMealPlanCompliance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Phase N4: Use today's plan selection if set, else first active assignment
      const { data: todaySelection } = await supabase
        .from('client_daily_plan_selection')
        .select('meal_plan_assignment_id')
        .eq('client_id', clientId)
        .eq('date', today)
        .maybeSingle()

      type AssignmentRow = { meal_plan_id: string; label?: string | null; meal_plans: { name: string; target_calories?: number } | null }
      const normalizeAssignment = (a: { meal_plan_id: string; label?: string | null; meal_plans: { name: string; target_calories?: number } | { name: string; target_calories?: number }[] | null } | null): AssignmentRow | null => {
        if (!a) return null
        const plan = Array.isArray(a.meal_plans) ? a.meal_plans[0] ?? null : a.meal_plans
        return { meal_plan_id: a.meal_plan_id, label: a.label, meal_plans: plan }
      }
      let assignment: AssignmentRow | null = null
      if (todaySelection?.meal_plan_assignment_id) {
        const { data: a } = await supabase
          .from('meal_plan_assignments')
          .select('meal_plan_id, label, meal_plans(name, target_calories)')
          .eq('id', todaySelection.meal_plan_assignment_id)
          .eq('client_id', clientId)
          .single()
        assignment = normalizeAssignment(a)
      }
      if (!assignment) {
        const { data: firstActive } = await supabase
          .from('meal_plan_assignments')
          .select('meal_plan_id, label, meal_plans(name, target_calories)')
          .eq('client_id', clientId)
          .eq('is_active', true)
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        assignment = normalizeAssignment(firstActive)
      }

      if (!assignment) {
        setMealPlanCompliance(null)
        setTodayPlanSummary(null)
        return
      }
      setTodayPlanSummary({
        planName: (assignment as AssignmentRow).meal_plans?.name ?? 'Meal Plan',
        label: (assignment as AssignmentRow).label ?? undefined,
        targetCalories: (assignment as AssignmentRow).meal_plans?.target_calories ?? undefined,
      })

      // Get all meals in plan
      const { data: meals } = await supabase
        .from('meals')
        .select('id, name, meal_type')
        .eq('meal_plan_id', assignment.meal_plan_id)
        .order('order_index', { ascending: true })

      if (!meals || meals.length === 0) {
        setMealPlanCompliance({ totalMeals: 0, loggedMeals: 0, compliancePercentage: 0, consumedCaloriesToday: 0, todayMeals: [] })
        return
      }

      const mealIds = meals.map(m => m.id)

      // Get today's meal completions (single source of truth for Fuel); include completed_at for Step 2
      const { data: completions } = await supabase
        .from('meal_completions')
        .select('meal_id, meal_option_id, photo_url, completed_at')
        .eq('client_id', clientId)
        .eq('date', today)
        .in('meal_id', mealIds)

      // Resolve private storage paths to signed URLs for display (graceful fallback)
      type CompletionRow = { meal_id: string; meal_option_id?: string | null; photo_url?: string | null; completed_at?: string | null }
      const completionsWithSignedUrls = await Promise.all(
        (completions || []).map(async (c: CompletionRow) => {
          const raw = c.photo_url ?? null
          if (!raw) return c
          if (/^https?:\/\//i.test(raw)) return c
          try {
            const { data, error } = await supabase.storage
              .from('meal-photos')
              .createSignedUrl(raw, 3600)
            if (error || !data?.signedUrl) return { ...c, photo_url: null }
            return { ...c, photo_url: data.signedUrl }
          } catch {
            return { ...c, photo_url: null }
          }
        })
      )

      const completionByMeal = new Map(
        completionsWithSignedUrls.map((c) => [c.meal_id, c])
      )
      const optionIds = [...new Set(completionsWithSignedUrls.map((c) => c.meal_option_id).filter(Boolean))] as string[]
      const optionNames = new Map<string, string>()
      if (optionIds.length > 0) {
        const { data: opts } = await supabase.from('meal_options').select('id, name').in('id', optionIds)
        ;(opts || []).forEach((o: { id: string; name: string }) => optionNames.set(o.id, o.name))
      }

      // Batch load option macros: meal_food_items + foods for plan meal_ids, then sum per (meal_id, meal_option_id)
      const optionMacrosByKey = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>()
      if (completionsWithSignedUrls.length > 0) {
        const { data: foodItems } = await supabase
          .from('meal_food_items')
          .select(`
            meal_id,
            meal_option_id,
            quantity,
            foods(serving_size, calories_per_serving, protein, carbs, fat)
          `)
          .in('meal_id', mealIds)
        type FoodRow = { serving_size?: number; calories_per_serving?: number; protein?: number; carbs?: number; fat?: number }
        type MfiRow = { meal_id: string; meal_option_id: string | null; quantity: number; foods: FoodRow | FoodRow[] | null }
        for (const comp of completionsWithSignedUrls as CompletionRow[]) {
          const key = `${comp.meal_id}:${comp.meal_option_id ?? 'null'}`
          if (optionMacrosByKey.has(key)) continue
          const matching = (foodItems || []).filter(
            (item: MfiRow) =>
              item.meal_id === comp.meal_id &&
              (item.meal_option_id === comp.meal_option_id || (item.meal_option_id == null && comp.meal_option_id == null))
          )
          let cal = 0, prot = 0, carb = 0, fat = 0
          for (const item of matching) {
            const f: FoodRow | null = Array.isArray(item.foods) ? (item.foods[0] ?? null) : item.foods
            const mult = (f?.serving_size ? item.quantity / f.serving_size : item.quantity) || 0
            cal += Math.round((f?.calories_per_serving ?? 0) * mult)
            prot += Math.round(((f?.protein ?? 0) * mult) * 10) / 10
            carb += Math.round(((f?.carbs ?? 0) * mult) * 10) / 10
            fat += Math.round(((f?.fat ?? 0) * mult) * 10) / 10
          }
          optionMacrosByKey.set(key, { calories: cal, protein: prot, carbs: carb, fat: fat })
        }
      }

      const todayMeals = meals.map(meal => {
        const comp = completionByMeal.get(meal.id) as CompletionRow | undefined
        const macroKey = comp ? `${comp.meal_id}:${comp.meal_option_id ?? 'null'}` : ''
        return {
          id: meal.id,
          name: meal.name,
          emoji: meal.meal_type === 'breakfast' ? '🍳' : meal.meal_type === 'lunch' ? '🥗' : meal.meal_type === 'dinner' ? '🍽️' : '🍎',
          logged: !!comp,
          optionName: comp?.meal_option_id ? optionNames.get(comp.meal_option_id) : undefined,
          photoUrl: comp?.photo_url ?? undefined,
          completedAt: comp?.completed_at ?? undefined,
          optionMacros: optionMacrosByKey.get(macroKey),
        }
      })

      const loggedCount = completionByMeal.size
      const compliancePercentage = meals.length > 0
        ? Math.round((loggedCount / meals.length) * 100)
        : 0
      const consumedCaloriesToday = todayMeals.reduce((sum, m) => sum + (m.optionMacros?.calories ?? 0), 0)

      setMealPlanCompliance({
        totalMeals: meals.length,
        loggedMeals: loggedCount,
        compliancePercentage,
        todayMeals,
        consumedCaloriesToday,
      })
    } catch (error) {
      console.error('Error loading meal plan compliance:', error)
      setMealPlanCompliance(null)
    }
  }

  const loadWeeklyCompliance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const dates: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }
      const start = dates[0]
      const end = dates[dates.length - 1]

      const { data: selections, error: selErr } = await supabase
        .from('client_daily_plan_selection')
        .select('date, meal_plan_assignment_id')
        .eq('client_id', clientId)
        .gte('date', start)
        .lte('date', end)

      if (selErr) throw selErr
      const selectionByDate = new Map<string, string>()
      ;(selections || []).forEach((s: { date: string; meal_plan_assignment_id: string }) => {
        selectionByDate.set(s.date, s.meal_plan_assignment_id)
      })

      const assignmentIds = [...new Set((selections || []).map((s: { meal_plan_assignment_id: string }) => s.meal_plan_assignment_id))]
      let assignmentPlanInfo = new Map<string, { planName: string; mealPlanId: string }>([])
      if (assignmentIds.length > 0) {
        const { data: assignments } = await supabase
          .from('meal_plan_assignments')
          .select('id, meal_plan_id, meal_plans(name)')
          .in('id', assignmentIds)
        ;(assignments || []).forEach((a: { id: string; meal_plan_id: string; meal_plans: { name: string } | { name: string }[] | null }) => {
          const plan = Array.isArray(a.meal_plans) ? a.meal_plans[0] ?? null : a.meal_plans
          assignmentPlanInfo.set(a.id, {
            planName: plan?.name ?? 'Meal Plan',
            mealPlanId: a.meal_plan_id,
          })
        })
      }

      const planIds = [...new Set(Array.from(assignmentPlanInfo.values()).map((v) => v.mealPlanId))]
      const mealIdsByPlan = new Map<string, string[]>([])
      if (planIds.length > 0) {
        const { data: meals } = await supabase
          .from('meals')
          .select('id, meal_plan_id')
          .in('meal_plan_id', planIds)
        ;(meals || []).forEach((m: { id: string; meal_plan_id: string }) => {
          const list = mealIdsByPlan.get(m.meal_plan_id) ?? []
          list.push(m.id)
          mealIdsByPlan.set(m.meal_plan_id, list)
        })
      }

      const { data: completions, error: compErr } = await supabase
        .from('meal_completions')
        .select('date, meal_id')
        .eq('client_id', clientId)
        .gte('date', start)
        .lte('date', end)

      if (compErr) throw compErr
      const completionsByDate = new Map<string, Set<string>>()
      ;(completions || []).forEach((c: { date: string; meal_id: string }) => {
        const set = completionsByDate.get(c.date) ?? new Set()
        set.add(c.meal_id)
        completionsByDate.set(c.date, set)
      })

      const planNameCounts = new Map<string, number>()
      const dayRows: Array<{ date: string; dayLabel: string; planName: string; totalMeals: number; completed: number; compliancePct: number }> = []
      let complianceSum = 0
      let daysWithPlan = 0

      for (const date of dates) {
        const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
        const assignmentId = selectionByDate.get(date)
        if (!assignmentId) {
          dayRows.push({ date, dayLabel, planName: '—', totalMeals: 0, completed: 0, compliancePct: 0 })
          continue
        }
        const info = assignmentPlanInfo.get(assignmentId)
        const mealPlanId = info?.mealPlanId
        const planName = info?.planName ?? '—'
        planNameCounts.set(planName, (planNameCounts.get(planName) ?? 0) + 1)
        const mealIdsRaw = (mealPlanId && mealIdsByPlan.get(mealPlanId)) ?? []
        const mealIds = Array.isArray(mealIdsRaw) ? mealIdsRaw : []
        const totalMeals = mealIds.length
        const completedSet = completionsByDate.get(date) ?? new Set()
        const completed = mealIds.filter((id) => completedSet.has(id)).length
        const compliancePct = totalMeals > 0 ? Math.round((completed / totalMeals) * 100) : 0
        complianceSum += compliancePct
        daysWithPlan++
        dayRows.push({ date, dayLabel, planName, totalMeals, completed, compliancePct })
      }

      const weeklyAveragePct = daysWithPlan > 0 ? Math.round(complianceSum / daysWithPlan) : 0
      let mostChosenPlan = '—'
      let mostChosenDays = 0
      for (const [name, count] of planNameCounts) {
        if (count > mostChosenDays) {
          mostChosenDays = count
          mostChosenPlan = name
        }
      }

      setWeeklyCompliance({
        days: dayRows,
        weeklyAveragePct,
        mostChosenPlan,
        mostChosenDays,
      })
    } catch (error) {
      console.error('Error loading weekly compliance:', error)
      setWeeklyCompliance(null)
    }
  }

  const loadWeeklyMacroAdherence = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const start = sevenDaysAgo.toISOString().split('T')[0]

      const { data: comps } = await supabase
        .from('meal_completions')
        .select('date, meal_id, meal_option_id')
        .eq('client_id', clientId)
        .gte('date', start)
        .lte('date', today)

      if (!comps || comps.length === 0) {
        const { data: todaySel } = await supabase
          .from('client_daily_plan_selection')
          .select('meal_plan_assignment_id')
          .eq('client_id', clientId)
          .eq('date', today)
          .maybeSingle()
        let planId: string | null = null
        if (todaySel?.meal_plan_assignment_id) {
          const { data: a } = await supabase
            .from('meal_plan_assignments')
            .select('meal_plan_id')
            .eq('id', todaySel.meal_plan_assignment_id)
            .eq('client_id', clientId)
            .single()
          planId = a?.meal_plan_id ?? null
        }
        if (!planId) {
          const { data: first } = await supabase
            .from('meal_plan_assignments')
            .select('meal_plan_id')
            .eq('client_id', clientId)
            .eq('is_active', true)
            .lte('start_date', today)
            .or('end_date.is.null,end_date.gte.' + today)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
          planId = first?.meal_plan_id ?? null
        }
        const targets = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
        if (planId) {
          const { data: plan } = await supabase
            .from('meal_plans')
            .select('target_calories, target_protein, target_carbs, target_fat')
            .eq('id', planId)
            .single()
          if (plan) {
            targets.calories = plan.target_calories ?? 0
            targets.protein = plan.target_protein ?? 0
            targets.carbs = plan.target_carbs ?? 0
            targets.fat = plan.target_fat ?? 0
          }
        }
        setWeeklyMacroAdherence({ avg: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, targets })
        return
      }

      const mealIds = [...new Set((comps as { meal_id: string }[]).map((c) => c.meal_id))]
      const { data: foodItems } = await supabase
        .from('meal_food_items')
        .select(`
          meal_id,
          meal_option_id,
          quantity,
          foods(serving_size, calories_per_serving, protein, carbs, fat, fiber)
        `)
        .in('meal_id', mealIds)

      type MfiFood = { serving_size?: number; calories_per_serving?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
      type Mfi = { meal_id: string; meal_option_id: string | null; quantity: number; foods: MfiFood | MfiFood[] | null }
      const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }>()

      for (const c of comps as { date: string; meal_id: string; meal_option_id: string | null }[]) {
        const matching = (foodItems || []).filter(
          (item: Mfi) =>
            item.meal_id === c.meal_id &&
            (item.meal_option_id === c.meal_option_id || (item.meal_option_id == null && c.meal_option_id == null))
        )
        let cal = 0, prot = 0, carb = 0, fat = 0, fib = 0
        for (const item of matching) {
          const f: MfiFood | null = Array.isArray(item.foods) ? (item.foods[0] ?? null) : item.foods
          const mult = (f?.serving_size ? item.quantity / f.serving_size : item.quantity) || 0
          cal += (f?.calories_per_serving ?? 0) * mult
          prot += (f?.protein ?? 0) * mult
          carb += (f?.carbs ?? 0) * mult
          fat += (f?.fat ?? 0) * mult
          fib += (f?.fiber ?? 0) * mult
        }
        const prev = byDate.get(c.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
        byDate.set(c.date, {
          calories: prev.calories + cal,
          protein: prev.protein + prot,
          carbs: prev.carbs + carb,
          fat: prev.fat + fat,
          fiber: prev.fiber + fib,
        })
      }

      const dayCount = byDate.size || 1
      const sum = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      byDate.forEach((v) => {
        sum.calories += v.calories
        sum.protein += v.protein
        sum.carbs += v.carbs
        sum.fat += v.fat
        sum.fiber += v.fiber
      })
      const avg = {
        calories: Math.round(sum.calories / dayCount),
        protein: Math.round((sum.protein / dayCount) * 10) / 10,
        carbs: Math.round((sum.carbs / dayCount) * 10) / 10,
        fat: Math.round((sum.fat / dayCount) * 10) / 10,
        fiber: Math.round((sum.fiber / dayCount) * 10) / 10,
      }

      const { data: todaySel } = await supabase
        .from('client_daily_plan_selection')
        .select('meal_plan_assignment_id')
        .eq('client_id', clientId)
        .eq('date', today)
        .maybeSingle()
      let planId: string | null = null
      if (todaySel?.meal_plan_assignment_id) {
        const { data: a } = await supabase
          .from('meal_plan_assignments')
          .select('meal_plan_id')
          .eq('id', todaySel.meal_plan_assignment_id)
          .eq('client_id', clientId)
          .single()
        planId = a?.meal_plan_id ?? null
      }
      if (!planId) {
        const { data: first } = await supabase
          .from('meal_plan_assignments')
          .select('meal_plan_id')
          .eq('client_id', clientId)
          .eq('is_active', true)
          .lte('start_date', today)
          .or('end_date.is.null,end_date.gte.' + today)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        planId = first?.meal_plan_id ?? null
      }
      const targets = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      if (planId) {
        const { data: plan } = await supabase
          .from('meal_plans')
          .select('target_calories, target_protein, target_carbs, target_fat')
          .eq('id', planId)
          .single()
        if (plan) {
          targets.calories = plan.target_calories ?? 0
          targets.protein = plan.target_protein ?? 0
          targets.carbs = plan.target_carbs ?? 0
          targets.fat = plan.target_fat ?? 0
        }
      }

      setWeeklyMacroAdherence({ avg, targets })
    } catch (error) {
      console.error('Error loading weekly macro adherence:', error)
      setWeeklyMacroAdherence(null)
    }
  }

  const loadAssignmentCompliance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const start = sevenDaysAgo.toISOString().split('T')[0]

      const { data: assignments, error: aErr } = await supabase
        .from('meal_plan_assignments')
        .select('id, meal_plan_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .lte('start_date', today)
        .or('end_date.is.null,end_date.gte.' + today)

      if (aErr || !assignments?.length) {
        setAssignmentCompliance({})
        return
      }

      const planIds = [...new Set(assignments.map((a: { meal_plan_id: string }) => a.meal_plan_id))]
      const { data: meals } = await supabase
        .from('meals')
        .select('id, meal_plan_id')
        .in('meal_plan_id', planIds)
      const mealIdsByPlan = new Map<string, string[]>()
      ;(meals || []).forEach((m: { id: string; meal_plan_id: string }) => {
        const list = mealIdsByPlan.get(m.meal_plan_id) ?? []
        list.push(m.id)
        mealIdsByPlan.set(m.meal_plan_id, list)
      })

      const { data: completions, error: cErr } = await supabase
        .from('meal_completions')
        .select('meal_id, date')
        .eq('client_id', clientId)
        .gte('date', start)
        .lte('date', today)

      if (cErr) {
        setAssignmentCompliance({})
        return
      }

      const result: Record<string, number> = {}
      for (const a of assignments as { id: string; meal_plan_id: string }[]) {
        const mealIds = mealIdsByPlan.get(a.meal_plan_id) ?? []
        const totalExpected = 7 * mealIds.length
        const planMealSet = new Set(mealIds)
        const completed = (completions || []).filter(
          (c: { meal_id: string }) => planMealSet.has(c.meal_id)
        ).length
        const pct = totalExpected > 0 ? Math.round((completed / totalExpected) * 100) : 0
        result[a.id] = pct
      }
      setAssignmentCompliance(result)
    } catch (error) {
      console.error('Error loading assignment compliance:', error)
      setAssignmentCompliance({})
    }
  }

  const loadMacroAdherence = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const startDate = sevenDaysAgo.toISOString().split('T')[0]

      // Get goals
      const goals = await getClientNutritionGoals(clientId)
      if (!goals || !goals.calories) {
        setMacroAdherence(null)
        return
      }

      // Get nutrition logs for last 7 days
      const logs = await getLogRange(clientId, startDate, today)
      
      // Get today's food entries
      const todayEntries = await getDayEntries(clientId, today)

      // Calculate today's totals (from nutrition_logs - already aggregated)
      const todayLog = logs.find(log => log.log_date === today)
      const todayTotal = {
        calories: todayLog?.calories || 0,
        protein: todayLog?.protein_g || 0,
        carbs: todayLog?.carbs_g || 0,
        fat: todayLog?.fat_g || 0,
      }

      const todayTarget = {
        calories: goals.calories || 0,
        protein: goals.protein || 0,
        carbs: goals.carbs || 0,
        fat: goals.fat || 0,
      }

      // Calculate 7-day adherence: % of days within 10% of calorie target
      const calorieTarget = goals.calories || 0
      let daysWithinTarget = 0
      const trend = logs.map(log => {
        const consumed = log.calories || 0
        const target = calorieTarget
        const withinTarget = target > 0 && consumed >= target * 0.9 && consumed <= target * 1.1
        if (withinTarget) daysWithinTarget++
        return {
          date: log.log_date,
          calories: consumed,
          target,
          withinTarget,
        }
      })

      const sevenDayAdherence = logs.length > 0 
        ? Math.round((daysWithinTarget / logs.length) * 100)
        : 0

      setMacroAdherence({
        todayTotal,
        todayTarget,
        sevenDayAdherence,
        trend,
        todayEntries,
      })
    } catch (error) {
      console.error('Error loading macro adherence:', error)
      setMacroAdherence(null)
    }
  }

  const calculateUnifiedCompliance = () => {
    let compliance = 0
    
    if (nutritionMode === 'meal_plan' && mealPlanCompliance) {
      compliance = mealPlanCompliance.compliancePercentage
    } else if (nutritionMode === 'goal_based' && macroAdherence) {
      compliance = macroAdherence.sevenDayAdherence
    } else if (nutritionMode === 'hybrid' && mealPlanCompliance && macroAdherence) {
      // Weighted: 60% meal plan + 40% macro adherence
      compliance = Math.round(
        mealPlanCompliance.compliancePercentage * 0.6 + 
        macroAdherence.sevenDayAdherence * 0.4
      )
    }
    
    setUnifiedCompliance(compliance)
  }

  useEffect(() => {
    calculateUnifiedCompliance()
  }, [nutritionMode, mealPlanCompliance, macroAdherence])

  const handleDeactivateAssignment = async (assignmentId: string) => {
    if (!confirm('Deactivate this plan assignment? The client will no longer see it, but history is preserved.')) return
    try {
      await MealPlanService.deactivateAssignment(assignmentId)
      await loadAllData()
      addToast({ title: 'Plan deactivated', variant: 'success' })
    } catch (error) {
      console.error('Error deactivating assignment:', error)
      addToast({ title: "Couldn't deactivate. Please try again.", variant: "destructive" })
    }
  }

  const handleUpdateLabel = async (assignmentId: string, label: string | null) => {
    try {
      await MealPlanService.updateAssignmentLabel(assignmentId, label)
      setEditingLabelId(null)
      setEditingLabelValue('')
      await loadMealPlans()
    } catch (error) {
      console.error('Error updating label:', error)
      addToast({ title: "Couldn't update label.", variant: "destructive" })
    }
  }

  const handleOpenAssignAnother = async () => {
    try {
      const plans = await MealPlanService.getMealPlans(user?.id ?? '')
      setCoachMealPlans(plans)
      setShowAssignModal(true)
      setSelectedPlanForAssign(null)
      setAssignModalSelectedClients([clientId])
    } catch (error) {
      console.error('Error loading meal plans:', error)
      addToast({ title: "Couldn't load meal plans.", variant: "destructive" })
    }
  }

  const handleSelectPlanToAssign = async (plan: MealPlan) => {
    try {
      const coachClients = await DatabaseService.getClients(user?.id ?? '')
      setAssignModalClients(coachClients)
      setAssignModalSelectedClients([clientId])
      setSelectedPlanForAssign(plan)
    } catch (error) {
      console.error('Error loading clients:', error)
      addToast({ title: "Couldn't load clients.", variant: "destructive" })
    }
  }

  const handleAssignModalComplete = () => {
    setShowAssignModal(false)
    setSelectedPlanForAssign(null)
    loadAllData()
  }

  const getModeBadge = (mode: NutritionMode) => {
    const badges = {
      meal_plan: { label: 'MEAL PLAN', color: 'fc-text-workouts' },
      goal_based: { label: 'MACRO GOALS', color: 'fc-text-success' },
      hybrid: { label: 'HYBRID', color: 'fc-text-warning' },
      none: { label: 'NONE', color: 'fc-text-dim' },
    }
    return badges[mode] || badges.none
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6"></div>
          </div>
        ))}
      </div>
    )
  }

  const modeBadge = nutritionMode ? getModeBadge(nutritionMode) : null

  return (
    <div className="space-y-6">
      {/* Mode Badge & Unified Compliance Score */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Nutrition
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Client Nutrition Overview
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {modeBadge && (
              <span className={`fc-pill fc-pill-glass ${modeBadge.color} text-xs font-semibold`}>
                {modeBadge.label}
              </span>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold fc-text-primary">{unifiedCompliance}%</div>
              <div className="text-xs fc-text-dim">Compliance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition Targets (macro goals) */}
      <SetNutritionGoals clientId={clientId} />

      {/* Compliance trend chart — coaches see trend before meal logs */}
      <NutritionComplianceChart
        data={complianceTrend}
        defaultTimeRange="2W"
        className="w-full"
      />

      {/* Mode-Specific Views */}
      {nutritionMode === 'none' ? (
        <NoPlanState onRefetch={loadAllData} />
      ) : nutritionMode === 'meal_plan' ? (
        <MealPlanModeView
          mealPlans={mealPlans}
          compliance={mealPlanCompliance}
          todayPlanSummary={todayPlanSummary}
          weeklyCompliance={weeklyCompliance}
          weeklyMacroAdherence={weeklyMacroAdherence}
          assignmentCompliance={assignmentCompliance}
          todaySelectionAssignmentId={todaySelectionAssignmentId}
          selectionHistory={selectionHistory}
          onDeactivate={handleDeactivateAssignment}
          onEditLabel={handleUpdateLabel}
          onOpenAssignAnother={handleOpenAssignAnother}
          editingLabelId={editingLabelId}
          editingLabelValue={editingLabelValue}
          onEditingLabelChange={setEditingLabelValue}
          onStartEditLabel={(id, current) => { setEditingLabelId(id); setEditingLabelValue(current ?? ''); }}
          onCancelEditLabel={() => { setEditingLabelId(null); setEditingLabelValue(''); }}
        />
      ) : nutritionMode === 'goal_based' ? (
        <GoalBasedModeView adherence={macroAdherence} />
      ) : nutritionMode === 'hybrid' ? (
        <HybridModeView
          mealPlans={mealPlans}
          mealPlanCompliance={mealPlanCompliance}
          macroAdherence={macroAdherence}
          todayPlanSummary={todayPlanSummary}
          weeklyCompliance={weeklyCompliance}
          weeklyMacroAdherence={weeklyMacroAdherence}
          assignmentCompliance={assignmentCompliance}
          todaySelectionAssignmentId={todaySelectionAssignmentId}
          selectionHistory={selectionHistory}
          onDeactivate={handleDeactivateAssignment}
          onEditLabel={handleUpdateLabel}
          onOpenAssignAnother={handleOpenAssignAnother}
          editingLabelId={editingLabelId}
          editingLabelValue={editingLabelValue}
          onEditingLabelChange={setEditingLabelValue}
          onStartEditLabel={(id, current) => { setEditingLabelId(id); setEditingLabelValue(current ?? ''); }}
          onCancelEditLabel={() => { setEditingLabelId(null); setEditingLabelValue(''); }}
        />
      ) : null}

      {/* Assign Another Plan flow: plan picker then modal (Phase N4) */}
      {showAssignModal && (
        selectedPlanForAssign ? (
          assignModalClients.length > 0 && (
            <MealPlanAssignmentModal
              mealPlan={selectedPlanForAssign}
              clients={assignModalClients}
              selectedClients={assignModalSelectedClients}
              onSelectedClientsChange={setAssignModalSelectedClients}
              onClose={handleAssignModalComplete}
              onComplete={handleAssignModalComplete}
            />
          )
        ) : (
          <ResponsiveModal
            isOpen={true}
            onClose={() => setShowAssignModal(false)}
            title="Assign another plan"
            subtitle="Choose a meal plan to assign to this client"
          >
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {coachMealPlans.length === 0 ? (
                <p className="fc-text-dim text-sm">No meal plans. Create one from the Meal Plans page.</p>
              ) : (
                coachMealPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlanToAssign(plan)}
                    className="w-full text-left fc-glass fc-card rounded-xl border border-[color:var(--fc-glass-border)] p-4 hover:border-[color:var(--fc-accent-cyan)] transition-colors"
                  >
                    <span className="font-medium fc-text-primary">{plan.name}</span>
                    {plan.target_calories != null && (
                      <span className="text-sm fc-text-dim ml-2">{plan.target_calories} kcal</span>
                    )}
                  </button>
                ))
              )}
              <Button variant="outline" className="w-full mt-2" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
            </div>
          </ResponsiveModal>
        )
      )}
    </div>
  )
}

// No Plan/Goals State
function NoPlanState({ onRefetch }: { onRefetch: () => void }) {
  const { addToast } = useToast()
  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
      <EmptyState
        variant="compact"
        icon={UtensilsCrossed}
        title="No meal plan assigned"
        description="Assign a meal plan to track nutrition."
        className="mb-6"
      />
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="fc-primary"
          onClick={() => {
            addToast({ title: "Meal plan assignment coming soon", variant: "default" })
          }}
        >
          Assign meal plan
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            document.querySelector('[data-nutrition-goals]')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          Set macro targets
        </Button>
      </div>
    </div>
  )
}

// Meal Plan Mode View (Phase N4/N5: multi-plan, selection history, Today's Plan block, deactivate, edit label, assign another)
function MealPlanModeView({
  mealPlans,
  compliance,
  todayPlanSummary,
  weeklyCompliance,
  weeklyMacroAdherence,
  assignmentCompliance,
  todaySelectionAssignmentId,
  selectionHistory,
  onDeactivate,
  onEditLabel,
  onOpenAssignAnother,
  editingLabelId,
  editingLabelValue,
  onEditingLabelChange,
  onStartEditLabel,
  onCancelEditLabel,
}: {
  mealPlans: MealPlanAssignment[]
  compliance: MealPlanCompliance | null
  todayPlanSummary: { planName: string; label?: string; targetCalories?: number } | null
  weeklyCompliance: {
    days: Array<{ date: string; dayLabel: string; planName: string; totalMeals: number; completed: number; compliancePct: number }>
    weeklyAveragePct: number
    mostChosenPlan: string
    mostChosenDays: number
  } | null
  weeklyMacroAdherence: {
    avg: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
    targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  } | null
  assignmentCompliance: Record<string, number>
  todaySelectionAssignmentId: string | null
  selectionHistory: Array<{ date: string; label: string; assignmentId: string }>
  onDeactivate: (id: string) => void
  onEditLabel: (id: string, label: string | null) => void
  onOpenAssignAnother: () => void
  editingLabelId: string | null
  editingLabelValue: string
  onEditingLabelChange: (v: string) => void
  onStartEditLabel: (id: string, current: string | null) => void
  onCancelEditLabel: () => void
}) {
  return (
    <>
      {/* Today's Plan (Phase N5) — prominent block */}
      {todayPlanSummary && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-2">
            Today&apos;s Plan: {todayPlanSummary.planName}
            {todayPlanSummary.targetCalories != null && ` — ${todayPlanSummary.targetCalories} kcal`}
            {todayPlanSummary.label && ` (${todayPlanSummary.label})`}
          </h3>
          {compliance && (
            <div className="flex flex-wrap gap-4 text-sm fc-text-dim">
              <span>
                {compliance.loggedMeals}/{compliance.totalMeals} meals completed · {compliance.compliancePercentage}%
              </span>
              {todayPlanSummary.targetCalories != null && (
                <span>
                  {compliance.consumedCaloriesToday ?? 0} / {todayPlanSummary.targetCalories} kcal consumed
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* This Week — 7-day compliance grid (Phase N5) */}
      {weeklyCompliance && weeklyCompliance.days.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h4 className="text-sm font-semibold fc-text-primary mb-3">This Week</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <th key={d.date} className="text-center py-1 px-1 font-normal">{d.dayLabel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1 truncate max-w-[4rem]" title={d.planName}>{d.planName}</td>
                  ))}
                </tr>
                <tr className="fc-text-primary">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1">{d.completed}/{d.totalMeals}</td>
                  ))}
                </tr>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1">{d.compliancePct}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm fc-text-dim mt-2">Weekly average: {weeklyCompliance.weeklyAveragePct}% compliance</p>
          {weeklyCompliance.mostChosenDays > 0 && (
            <p className="text-sm fc-text-dim">Most chosen plan: {weeklyCompliance.mostChosenPlan} ({weeklyCompliance.mostChosenDays} days)</p>
          )}
        </div>
      )}

      {/* Plan selection history (Phase N4) */}
      {selectionHistory.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6">
          <h4 className="text-sm font-semibold fc-text-primary mb-3">Plan chosen per day</h4>
          <ul className="space-y-1 text-sm">
            {selectionHistory.slice(0, 7).map(({ date, label }) => (
              <li key={date} className="flex justify-between gap-2 fc-text-dim">
                <span>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="fc-text-primary truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compliance Dashboard */}
      {compliance && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
          <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Compliance
                </span>
                <h3 className="text-lg font-semibold fc-text-primary mt-2">
                  Meal Plan Compliance
                </h3>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
                <p className="text-3xl font-bold fc-text-primary">{compliance.loggedMeals}</p>
                <p className="text-sm fc-text-dim">Logged Today</p>
              </div>
              <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
                <p className="text-3xl font-bold fc-text-primary">{compliance.totalMeals}</p>
                <p className="text-sm fc-text-dim">Total Meals</p>
              </div>
              <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
                <p className="text-3xl font-bold fc-text-primary">{compliance.compliancePercentage}%</p>
                <p className="text-sm fc-text-dim">Compliance</p>
              </div>
            </div>
            
            {/* Today's Meals Checklist — completion time, option, macros, photo */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold fc-text-primary mb-2">Today&apos;s Meals</h4>
              {compliance.todayMeals.map(meal => (
                <div
                  key={meal.id}
                  className={`fc-glass-soft rounded-xl border p-3 flex items-center gap-3 ${
                    meal.logged ? 'border-[color:var(--fc-status-success)]' : 'border-[color:var(--fc-glass-border)]'
                  }`}
                >
                  <span className="text-lg">{meal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm fc-text-primary block">{meal.name}</span>
                    {meal.logged ? (
                      <>
                        {meal.completedAt && (
                          <span className="text-xs fc-text-dim block">
                            Completed at {new Date(meal.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        {meal.optionName && (
                          <span className="text-xs fc-text-dim block">Option: {meal.optionName}</span>
                        )}
                        {meal.optionMacros && (
                          <span className="text-xs fc-text-dim block">
                            {meal.optionMacros.calories} kcal · {meal.optionMacros.protein}g P · {meal.optionMacros.carbs}g C · {meal.optionMacros.fat}g F
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs fc-text-dim">Not completed</span>
                    )}
                  </div>
                  {meal.logged && meal.photoUrl && (
                    <img src={meal.photoUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  {meal.logged ? (
                    <CheckCircle className="w-4 h-4 fc-text-success flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border)] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Macro Adherence — This Week Avg (Phase N5) */}
      {weeklyMacroAdherence && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h4 className="text-sm font-semibold fc-text-primary mb-2">Macro Adherence (This Week Avg)</h4>
          <p className="text-xs fc-text-dim mb-3">Based on completed meals&apos; option macros.</p>
          <div className="space-y-2 text-sm">
            {weeklyMacroAdherence.targets.calories > 0 && (
              <div>
                <span className="fc-text-dim">Calories </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.calories} / {weeklyMacroAdherence.targets.calories}</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.calories / weeklyMacroAdherence.targets.calories) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.protein > 0 && (
              <div>
                <span className="fc-text-dim">Protein </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.protein}g / {weeklyMacroAdherence.targets.protein}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.protein / weeklyMacroAdherence.targets.protein) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.carbs > 0 && (
              <div>
                <span className="fc-text-dim">Carbs </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.carbs}g / {weeklyMacroAdherence.targets.carbs}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.carbs / weeklyMacroAdherence.targets.carbs) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.fat > 0 && (
              <div>
                <span className="fc-text-dim">Fat </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.fat}g / {weeklyMacroAdherence.targets.fat}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.fat / weeklyMacroAdherence.targets.fat) * 100)}%
                </span>
              </div>
            )}
            <div>
              <span className="fc-text-dim">Fiber </span>
              <span className="fc-text-primary">{weeklyMacroAdherence.avg.fiber}g</span>
            </div>
          </div>
        </div>
      )}

      {/* Meal Plans List */}
      <MealPlansList
        mealPlans={mealPlans}
        assignmentCompliance={assignmentCompliance}
        todaySelectionAssignmentId={todaySelectionAssignmentId}
        onDeactivate={onDeactivate}
        onEditLabel={onEditLabel}
        onOpenAssignAnother={onOpenAssignAnother}
        editingLabelId={editingLabelId}
        editingLabelValue={editingLabelValue}
        onEditingLabelChange={onEditingLabelChange}
        onStartEditLabel={onStartEditLabel}
        onCancelEditLabel={onCancelEditLabel}
      />
    </>
  )
}

// Goal-Based Mode View
function GoalBasedModeView({ adherence }: { adherence: MacroAdherence | null }) {
  if (!adherence) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
        <p className="fc-text-dim">Loading macro adherence data...</p>
      </div>
    )
  }

  const caloriePercentage = adherence.todayTarget.calories > 0
    ? Math.round((adherence.todayTotal.calories / adherence.todayTarget.calories) * 100)
    : 0

  return (
    <>
      {/* Macro Adherence Dashboard */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Adherence
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Macro Adherence
              </h3>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Today's Totals vs Targets */}
          <div>
            <h4 className="text-sm font-semibold fc-text-primary mb-3">Today&apos;s Progress</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MacroCard
                label="Calories"
                consumed={adherence.todayTotal.calories}
                target={adherence.todayTarget.calories}
                unit="kcal"
                icon={Flame}
              />
              <MacroCard
                label="Protein"
                consumed={adherence.todayTotal.protein}
                target={adherence.todayTarget.protein}
                unit="g"
                icon={TrendingUp}
              />
              <MacroCard
                label="Carbs"
                consumed={adherence.todayTotal.carbs}
                target={adherence.todayTarget.carbs}
                unit="g"
                icon={TrendingUp}
              />
              <MacroCard
                label="Fat"
                consumed={adherence.todayTotal.fat}
                target={adherence.todayTarget.fat}
                unit="g"
                icon={TrendingUp}
              />
            </div>
          </div>

          {/* 7-Day Adherence */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold fc-text-primary">7-Day Adherence</h4>
              <span className="text-lg font-bold fc-text-primary">{adherence.sevenDayAdherence}%</span>
            </div>
            <p className="text-xs fc-text-dim mb-3">
              Days within 10% of calorie target: {adherence.trend.filter(t => t.withinTarget).length} / {adherence.trend.length}
            </p>
            <div className="flex gap-1">
              {adherence.trend.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-8 rounded ${
                    day.withinTarget ? 'bg-[color:var(--fc-status-success)]' : 'bg-[color:var(--fc-glass-highlight)]'
                  }`}
                  title={`${day.date}: ${day.calories} / ${day.target} cal`}
                />
              ))}
            </div>
          </div>

          {/* Today's Food Log */}
          {adherence.todayEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold fc-text-primary mb-3">Today&apos;s Food Log</h4>
              <div className="space-y-2">
                {adherence.todayEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold fc-text-primary">
                          {entry.food?.name || 'Unknown Food'}
                        </div>
                        <div className="text-xs fc-text-dim">
                          {entry.quantity} {entry.unit} • {Math.round(entry.calories)} cal
                        </div>
                      </div>
                      <div className="text-xs fc-text-dim text-right">
                        {Math.round(entry.protein_g)}P / {Math.round(entry.carbs_g)}C / {Math.round(entry.fat_g)}F
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Hybrid Mode View (Phase N4/N5: Today's Plan block, same meal plan list props as MealPlanModeView)
function HybridModeView({
  mealPlans,
  mealPlanCompliance,
  macroAdherence,
  todayPlanSummary,
  weeklyCompliance,
  weeklyMacroAdherence,
  assignmentCompliance,
  todaySelectionAssignmentId,
  selectionHistory,
  onDeactivate,
  onEditLabel,
  onOpenAssignAnother,
  editingLabelId,
  editingLabelValue,
  onEditingLabelChange,
  onStartEditLabel,
  onCancelEditLabel,
}: {
  mealPlans: MealPlanAssignment[]
  mealPlanCompliance: MealPlanCompliance | null
  macroAdherence: MacroAdherence | null
  todayPlanSummary: { planName: string; label?: string; targetCalories?: number } | null
  weeklyCompliance: {
    days: Array<{ date: string; dayLabel: string; planName: string; totalMeals: number; completed: number; compliancePct: number }>
    weeklyAveragePct: number
    mostChosenPlan: string
    mostChosenDays: number
  } | null
  weeklyMacroAdherence: {
    avg: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
    targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  } | null
  assignmentCompliance: Record<string, number>
  todaySelectionAssignmentId: string | null
  selectionHistory: Array<{ date: string; label: string; assignmentId: string }>
  onDeactivate: (id: string) => void
  onEditLabel: (id: string, label: string | null) => void
  onOpenAssignAnother: () => void
  editingLabelId: string | null
  editingLabelValue: string
  onEditingLabelChange: (v: string) => void
  onStartEditLabel: (id: string, current: string | null) => void
  onCancelEditLabel: () => void
}) {
  if (!mealPlanCompliance || !macroAdherence) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
        <p className="fc-text-dim">Loading hybrid data...</p>
      </div>
    )
  }

  const fromPlan = {
    calories: macroAdherence.todayTotal.calories - macroAdherence.todayEntries.reduce((sum, e) => sum + e.calories, 0),
    protein: macroAdherence.todayTotal.protein - macroAdherence.todayEntries.reduce((sum, e) => sum + e.protein_g, 0),
    carbs: macroAdherence.todayTotal.carbs - macroAdherence.todayEntries.reduce((sum, e) => sum + e.carbs_g, 0),
    fat: macroAdherence.todayTotal.fat - macroAdherence.todayEntries.reduce((sum, e) => sum + e.fat_g, 0),
  }
  const fromAdditional = {
    calories: macroAdherence.todayEntries.reduce((sum, e) => sum + e.calories, 0),
    protein: macroAdherence.todayEntries.reduce((sum, e) => sum + e.protein_g, 0),
    carbs: macroAdherence.todayEntries.reduce((sum, e) => sum + e.carbs_g, 0),
    fat: macroAdherence.todayEntries.reduce((sum, e) => sum + e.fat_g, 0),
  }
  const total = macroAdherence.todayTotal
  const target = macroAdherence.todayTarget

  const isOverTarget = target.calories > 0 && total.calories > target.calories * 1.2

  return (
    <>
      {/* Today's Plan (Phase N5) */}
      {todayPlanSummary && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-2">
            Today&apos;s Plan: {todayPlanSummary.planName}
            {todayPlanSummary.targetCalories != null && ` — ${todayPlanSummary.targetCalories} kcal`}
            {todayPlanSummary.label && ` (${todayPlanSummary.label})`}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm fc-text-dim">
            <span>
              {mealPlanCompliance.loggedMeals}/{mealPlanCompliance.totalMeals} meals completed · {mealPlanCompliance.compliancePercentage}%
            </span>
            {todayPlanSummary.targetCalories != null && (
              <span>
                {mealPlanCompliance.consumedCaloriesToday ?? 0} / {todayPlanSummary.targetCalories} kcal consumed
              </span>
            )}
          </div>
        </div>
      )}

      {/* This Week (Phase N5) — Hybrid */}
      {weeklyCompliance && weeklyCompliance.days.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h4 className="text-sm font-semibold fc-text-primary mb-3">This Week</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <th key={d.date} className="text-center py-1 px-1 font-normal">{d.dayLabel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1 truncate max-w-[4rem]" title={d.planName}>{d.planName}</td>
                  ))}
                </tr>
                <tr className="fc-text-primary">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1">{d.completed}/{d.totalMeals}</td>
                  ))}
                </tr>
                <tr className="fc-text-dim">
                  {weeklyCompliance.days.map((d) => (
                    <td key={d.date} className="text-center py-1 px-1">{d.compliancePct}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm fc-text-dim mt-2">Weekly average: {weeklyCompliance.weeklyAveragePct}% compliance</p>
          {weeklyCompliance.mostChosenDays > 0 && (
            <p className="text-sm fc-text-dim">Most chosen plan: {weeklyCompliance.mostChosenPlan} ({weeklyCompliance.mostChosenDays} days)</p>
          )}
        </div>
      )}

      {/* Macro Adherence — This Week Avg (Phase N5) — Hybrid */}
      {weeklyMacroAdherence && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 sm:p-6 mb-6">
          <h4 className="text-sm font-semibold fc-text-primary mb-2">Macro Adherence (This Week Avg)</h4>
          <p className="text-xs fc-text-dim mb-3">Based on completed meals&apos; option macros.</p>
          <div className="space-y-2 text-sm">
            {weeklyMacroAdherence.targets.calories > 0 && (
              <div>
                <span className="fc-text-dim">Calories </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.calories} / {weeklyMacroAdherence.targets.calories}</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.calories / weeklyMacroAdherence.targets.calories) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.protein > 0 && (
              <div>
                <span className="fc-text-dim">Protein </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.protein}g / {weeklyMacroAdherence.targets.protein}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.protein / weeklyMacroAdherence.targets.protein) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.carbs > 0 && (
              <div>
                <span className="fc-text-dim">Carbs </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.carbs}g / {weeklyMacroAdherence.targets.carbs}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.carbs / weeklyMacroAdherence.targets.carbs) * 100)}%
                </span>
              </div>
            )}
            {weeklyMacroAdherence.targets.fat > 0 && (
              <div>
                <span className="fc-text-dim">Fat </span>
                <span className="fc-text-primary">{weeklyMacroAdherence.avg.fat}g / {weeklyMacroAdherence.targets.fat}g</span>
                <span className="fc-text-dim ml-1">
                  — {Math.round((weeklyMacroAdherence.avg.fat / weeklyMacroAdherence.targets.fat) * 100)}%
                </span>
              </div>
            )}
            <div>
              <span className="fc-text-dim">Fiber </span>
              <span className="fc-text-primary">{weeklyMacroAdherence.avg.fiber}g</span>
            </div>
          </div>
        </div>
      )}

      {/* Meal Plan Compliance Section */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Meal Plan
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Meal Plan Compliance
              </h3>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{mealPlanCompliance.loggedMeals}</p>
              <p className="text-sm fc-text-dim">Logged Today</p>
            </div>
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{mealPlanCompliance.totalMeals}</p>
              <p className="text-sm fc-text-dim">Total Meals</p>
            </div>
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{mealPlanCompliance.compliancePercentage}%</p>
              <p className="text-sm fc-text-dim">Compliance</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold fc-text-primary mb-2">Today&apos;s Meals</h4>
            {mealPlanCompliance.todayMeals.map(meal => (
              <div
                key={meal.id}
                className={`fc-glass-soft rounded-xl border p-3 flex items-center gap-3 ${
                  meal.logged ? 'border-[color:var(--fc-status-success)]' : 'border-[color:var(--fc-glass-border)]'
                }`}
              >
                <span className="text-lg">{meal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm fc-text-primary block">{meal.name}</span>
                  {meal.logged ? (
                    <>
                      {meal.completedAt && (
                        <span className="text-xs fc-text-dim block">
                          Completed at {new Date(meal.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {meal.optionName && (
                        <span className="text-xs fc-text-dim block">Option: {meal.optionName}</span>
                      )}
                      {meal.optionMacros && (
                        <span className="text-xs fc-text-dim block">
                          {meal.optionMacros.calories} kcal · {meal.optionMacros.protein}g P · {meal.optionMacros.carbs}g C · {meal.optionMacros.fat}g F
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs fc-text-dim">Not completed</span>
                  )}
                </div>
                {meal.logged && meal.photoUrl && (
                  <img src={meal.photoUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                )}
                {meal.logged ? (
                  <CheckCircle className="w-4 h-4 fc-text-success flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[color:var(--fc-glass-border)] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Macro Adherence Section */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Macros
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Macro Adherence
              </h3>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Breakdown */}
          <div>
            <h4 className="text-sm font-semibold fc-text-primary mb-3">Today&apos;s Breakdown</h4>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="fc-text-dim">From meal plan:</span>
                <span className="font-semibold fc-text-primary">
                  {Math.round(fromPlan.calories)} cal ({mealPlanCompliance.loggedMeals} meals logged)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="fc-text-dim">Additional food:</span>
                <span className="font-semibold fc-text-primary">
                  {Math.round(fromAdditional.calories)} cal ({macroAdherence.todayEntries.length} items)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-[color:var(--fc-glass-border)]">
                <span className="fc-text-primary font-semibold">Total:</span>
                <span className="font-bold fc-text-primary">
                  {Math.round(total.calories)} / {target.calories.toLocaleString()} cal target
                </span>
              </div>
              {isOverTarget && (
                <div className="flex items-center gap-2 text-xs fc-text-error mt-2 pt-2 border-t border-[color:var(--fc-glass-border)]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Client is significantly over calorie target (additional food may be pushing over)</span>
                </div>
              )}
            </div>
          </div>

          {/* Macro Cards */}
          <div>
            <h4 className="text-sm font-semibold fc-text-primary mb-3">Macro Totals</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MacroCard
                label="Calories"
                consumed={total.calories}
                target={target.calories}
                unit="kcal"
                icon={Flame}
              />
              <MacroCard
                label="Protein"
                consumed={total.protein}
                target={target.protein}
                unit="g"
                icon={TrendingUp}
              />
              <MacroCard
                label="Carbs"
                consumed={total.carbs}
                target={target.carbs}
                unit="g"
                icon={TrendingUp}
              />
              <MacroCard
                label="Fat"
                consumed={total.fat}
                target={target.fat}
                unit="g"
                icon={TrendingUp}
              />
            </div>
          </div>

          {/* 7-Day Adherence */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold fc-text-primary">7-Day Adherence</h4>
              <span className="text-lg font-bold fc-text-primary">{macroAdherence.sevenDayAdherence}%</span>
            </div>
            <div className="flex gap-1">
              {macroAdherence.trend.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-8 rounded ${
                    day.withinTarget ? 'bg-[color:var(--fc-status-success)]' : 'bg-[color:var(--fc-glass-highlight)]'
                  }`}
                  title={`${day.date}: ${day.calories} / ${day.target} cal`}
                />
              ))}
            </div>
          </div>

          {/* Additional Food List */}
          {macroAdherence.todayEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold fc-text-primary mb-3">Additional Food Logged</h4>
              <div className="space-y-2">
                {macroAdherence.todayEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold fc-text-primary">
                          {entry.food?.name || 'Unknown Food'}
                        </div>
                        <div className="text-xs fc-text-dim">
                          {entry.quantity} {entry.unit} • {Math.round(entry.calories)} cal
                        </div>
                      </div>
                      <div className="text-xs fc-text-dim text-right">
                        {Math.round(entry.protein_g)}P / {Math.round(entry.carbs_g)}C / {Math.round(entry.fat_g)}F
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meal Plans List */}
      <MealPlansList
        mealPlans={mealPlans}
        assignmentCompliance={assignmentCompliance}
        todaySelectionAssignmentId={todaySelectionAssignmentId}
        onDeactivate={onDeactivate}
        onEditLabel={onEditLabel}
        onOpenAssignAnother={onOpenAssignAnother}
        editingLabelId={editingLabelId}
        editingLabelValue={editingLabelValue}
        onEditingLabelChange={onEditingLabelChange}
        onStartEditLabel={onStartEditLabel}
        onCancelEditLabel={onCancelEditLabel}
      />
    </>
  )
}

// Shared Meal Plans List Component (Phase N4/N5: active only, label, today's selection, compliance %, edit label, deactivate, assign another)
function MealPlansList({
  mealPlans,
  assignmentCompliance = {},
  todaySelectionAssignmentId,
  onDeactivate,
  onEditLabel,
  onOpenAssignAnother,
  editingLabelId,
  editingLabelValue,
  onEditingLabelChange,
  onStartEditLabel,
  onCancelEditLabel,
}: {
  mealPlans: MealPlanAssignment[]
  assignmentCompliance?: Record<string, number>
  todaySelectionAssignmentId?: string | null
  onDeactivate: (id: string) => void
  onEditLabel: (id: string, label: string | null) => void
  onOpenAssignAnother: () => void
  editingLabelId: string | null
  editingLabelValue: string
  onEditingLabelChange: (v: string) => void
  onStartEditLabel: (id: string, current: string | null) => void
  onCancelEditLabel: () => void
}) {
  const activePlans = mealPlans.filter((p) => p.is_active !== false)
  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <Apple className="w-4 h-4" />
          </div>
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Meal Plans
            </span>
            <h3 className="text-lg font-semibold fc-text-primary mt-2">
              Active Plans
            </h3>
          </div>
          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
            {activePlans.length}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenAssignAnother} className="gap-1">
          <Plus className="w-4 h-4" />
          Assign Another Plan
        </Button>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {activePlans.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={UtensilsCrossed}
            title="No meal plan assigned"
            description="Assign a meal plan to track nutrition."
          />
        ) : (
          activePlans.map((plan) => (
            <div
              key={plan.id}
              className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Apple className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold fc-text-primary break-words">
                        {plan.meal_plans?.name || 'Meal Plan'}
                      </h4>
                      {plan.label?.trim() && (
                        <p className="text-sm fc-text-dim mt-1">Label: {plan.label}</p>
                      )}
                      {todaySelectionAssignmentId === plan.id && (
                        <span className="fc-pill fc-pill-glass fc-text-success text-xs mt-1 inline-block">Today&apos;s selection</span>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="fc-pill fc-pill-glass fc-text-success text-xs">Active</span>
                        <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                          {plan.meal_plans?.target_calories || 0} kcal
                        </span>
                        {assignmentCompliance[plan.id] !== undefined && (
                          <span className="fc-pill fc-pill-glass fc-text-dim text-xs">
                            Compliance: {assignmentCompliance[plan.id]}% (last 7 days)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onStartEditLabel(plan.id, plan.label ?? null)}
                        title="Edit label"
                      >
                        <Pencil className="w-4 h-4 fc-text-dim" />
                      </Button>
                      <Button
                        onClick={() => onDeactivate(plan.id)}
                        variant="ghost"
                        size="sm"
                        className="fc-btn fc-btn-ghost h-8 w-8 p-0 fc-text-error"
                        title="Deactivate"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {editingLabelId === plan.id && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={editingLabelValue}
                        onChange={(e) => onEditingLabelChange(e.target.value)}
                        placeholder="e.g. Training Day"
                        className="flex-1 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm fc-text-primary bg-[color:var(--fc-surface)]"
                      />
                      <Button size="sm" onClick={() => onEditLabel(plan.id, editingLabelValue.trim() || null)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={onCancelEditLabel}>Cancel</Button>
                    </div>
                  )}

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
  )
}

// Macro Card Component
function MacroCard({
  label,
  consumed,
  target,
  unit,
  icon: Icon,
}: {
  label: string
  consumed: number
  target: number
  unit: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const color = percentage >= 90 && percentage <= 110 ? 'fc-text-success' : percentage > 120 ? 'fc-text-error' : 'fc-text-warning'
  
  return (
    <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-3 text-center">
      <Icon className={`w-4 h-4 mb-1 ${color} mx-auto`} />
      <div className="text-xs fc-text-dim mb-1">{label}</div>
      <div className="text-sm font-bold font-mono fc-text-primary">
        {Math.round(consumed)} / {target > 0 ? Math.round(target) : '—'} {unit}
      </div>
      {target > 0 && (
        <div className="text-xs fc-text-dim mt-1">{Math.round(percentage)}%</div>
      )}
    </div>
  )
}
