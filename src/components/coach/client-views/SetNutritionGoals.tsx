"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getClientNutritionMode, getClientNutritionGoals, type NutritionMode } from "@/lib/nutritionLogService";
import { useToast } from "@/components/ui/toast-provider";

interface SetNutritionGoalsProps {
  clientId: string;
  coachId?: string; // optional: if not passed, uses current user (coach) from auth
}

interface NutritionGoalsForm {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
}

export function SetNutritionGoals({ clientId, coachId: coachIdProp }: SetNutritionGoalsProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const coachId = coachIdProp ?? user?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nutritionMode, setNutritionMode] = useState<NutritionMode | null>(null);
  const [activeMealPlan, setActiveMealPlan] = useState<{ name: string } | null>(null);
  const [formData, setFormData] = useState<NutritionGoalsForm>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    water: "",
  });
  
  useEffect(() => {
    loadData();
  }, [clientId]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load current nutrition mode
      const mode = await getClientNutritionMode(clientId);
      setNutritionMode(mode);
      
      // Load active meal plan if exists
      if (mode === 'meal_plan' || mode === 'hybrid') {
        const today = new Date().toISOString().split('T')[0];
        const { data: assignment } = await supabase
          .from('meal_plan_assignments')
          .select(`
            meal_plans(name)
          `)
          .eq('client_id', clientId)
          .eq('is_active', true)
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .limit(1)
          .maybeSingle();
        
        if (assignment?.meal_plans) {
          setActiveMealPlan({ name: (assignment.meal_plans as any).name });
        }
      }
      
      // Load existing nutrition goals
      const existingGoals = await getClientNutritionGoals(clientId);
      if (existingGoals) {
        setFormData({
          calories: existingGoals.calories?.toString() || "",
          protein: existingGoals.protein?.toString() || "",
          carbs: existingGoals.carbs?.toString() || "",
          fat: existingGoals.fat?.toString() || "",
          water: existingGoals.water_ml?.toString() || "",
        });
      }
    } catch (error) {
      console.error('Error loading nutrition goals:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load nutrition goals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    // Validate at least one field is filled
    const hasAnyValue = Object.values(formData).some(val => val.trim() !== "");
    if (!hasAnyValue) {
      addToast({
        title: 'No targets set',
        description: 'Please set at least one macro target',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate numeric values
    const numericFields = ['calories', 'protein', 'carbs', 'fat', 'water'] as const;
    for (const field of numericFields) {
      const value = formData[field].trim();
      if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
        addToast({
          title: 'Invalid value',
          description: `${field} must be a positive number`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    try {
      setSaving(true);
      
      const body: Record<string, number> = {};
      if (formData.calories.trim() && Number(formData.calories) > 0) body.calories = Number(formData.calories);
      if (formData.protein.trim() && Number(formData.protein) > 0) body.protein = Number(formData.protein);
      if (formData.carbs.trim() && Number(formData.carbs) > 0) body.carbs = Number(formData.carbs);
      if (formData.fat.trim() && Number(formData.fat) > 0) body.fat = Number(formData.fat);
      if (formData.water.trim() && Number(formData.water) > 0) body.water_ml = Number(formData.water);
      
      const res = await fetch(`/api/coach/clients/${clientId}/nutrition-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || res.statusText || 'Failed to save');
      }
      
      addToast({
        title: 'Success',
        description: 'Nutrition targets updated successfully',
        variant: 'success',
      });
      
      await loadData();
    } catch (error) {
      console.error('Error saving nutrition goals:', error);
      addToast({
        title: 'Error',
        description: 'Failed to save nutrition targets',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleRemoveAll = async () => {
    if (!confirm('Are you sure you want to remove all nutrition targets? This will switch the client back to "none" mode if they don\'t have a meal plan.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const res = await fetch(`/api/coach/clients/${clientId}/nutrition-goals`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || res.statusText || 'Failed to remove');
      }
      
      setFormData({
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        water: "",
      });
      
      addToast({
        title: 'Success',
        description: 'All nutrition targets removed',
        variant: 'success',
      });
      
      await loadData();
    } catch (error) {
      console.error('Error removing nutrition goals:', error);
      addToast({
        title: 'Error',
        description: 'Failed to remove nutrition targets',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const getModeLabel = (mode: NutritionMode): string => {
    switch (mode) {
      case 'meal_plan':
        return 'Meal Plan';
      case 'goal_based':
        return 'Macro Goals';
      case 'hybrid':
        return 'Both (Hybrid Mode)';
      case 'none':
        return 'None';
      default:
        return 'Unknown';
    }
  };
  
  if (loading) {
    return (
      <div className="fc-card-shell p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-1/3"></div>
          <div className="h-10 bg-[color:var(--fc-glass-highlight)] rounded"></div>
          <div className="h-10 bg-[color:var(--fc-glass-highlight)] rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fc-card-shell" data-nutrition-goals>
      <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Nutrition
            </span>
            <h3 className="text-lg font-semibold fc-text-primary mt-2">
              Nutrition Targets
            </h3>
            <p className="text-sm fc-text-dim">
              Set daily macro targets for this client. Values are saved to their nutrition goals and show on the{" "}
              <span className="font-medium fc-text-primary">Fuel</span> screen (same data the client app reads from
              their goals).
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Mode Indicator */}
        {nutritionMode && (
          <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 fc-text-workouts flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="text-sm font-semibold fc-text-primary">
                  Current Mode: {getModeLabel(nutritionMode)}
                </div>
                {activeMealPlan && (
                  <div className="text-xs fc-text-dim">
                    Active meal plan: <span className="font-semibold">{activeMealPlan.name}</span>
                  </div>
                )}
                {nutritionMode === 'hybrid' && (
                  <div className="text-xs fc-text-dim bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mt-2">
                    <strong>Hybrid Mode:</strong> The client sees their meal plan AND can log additional food against these targets.
                  </div>
                )}
                {nutritionMode === 'none' && (
                  <div className="text-xs fc-text-dim">
                    Setting macro targets will enable goal-based logging for this client.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold fc-text-primary mb-2">
              Calories <span className="text-xs font-normal fc-text-dim">(kcal/day)</span>
            </label>
            <Input
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              placeholder="e.g., 2200"
              min="0"
              step="1"
              className="fc-glass"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold fc-text-primary mb-2">
              Protein <span className="text-xs font-normal fc-text-dim">(g/day)</span>
            </label>
            <Input
              type="number"
              value={formData.protein}
              onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
              placeholder="e.g., 180"
              min="0"
              step="0.1"
              className="fc-glass"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold fc-text-primary mb-2">
              Carbs <span className="text-xs font-normal fc-text-dim">(g/day)</span>
            </label>
            <Input
              type="number"
              value={formData.carbs}
              onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
              placeholder="e.g., 250"
              min="0"
              step="0.1"
              className="fc-glass"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold fc-text-primary mb-2">
              Fat <span className="text-xs font-normal fc-text-dim">(g/day)</span>
            </label>
            <Input
              type="number"
              value={formData.fat}
              onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
              placeholder="e.g., 70"
              min="0"
              step="0.1"
              className="fc-glass"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold fc-text-primary mb-2">
              Water <span className="text-xs font-normal fc-text-dim">(ml/day)</span>
              <span className="text-xs font-normal fc-text-dim ml-1">(optional)</span>
            </label>
            <Input
              type="number"
              value={formData.water}
              onChange={(e) => setFormData({ ...formData, water: e.target.value })}
              placeholder="e.g., 2500"
              min="0"
              step="50"
              className="fc-glass"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[color:var(--fc-glass-border)]">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 fc-btn fc-btn-primary"
          >
            {saving ? 'Saving...' : 'Set Targets'}
          </Button>
          <Button
            onClick={handleRemoveAll}
            disabled={saving}
            variant="outline"
            className="flex-1 fc-btn fc-btn-ghost fc-text-error hover:fc-text-error"
          >
            Remove All Targets
          </Button>
        </div>
        
        {/* TODO: Macro Calculator Helper */}
        {/* 
        <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
          <details className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
            <summary className="cursor-pointer text-sm font-semibold fc-text-primary">
              Calculate from bodyweight (optional helper)
            </summary>
            <div className="mt-4 space-y-3">
              <Input
                type="number"
                placeholder="Client weight (kg)"
                className="fc-glass"
              />
              <select className="fc-glass w-full p-2 rounded-lg border border-[color:var(--fc-glass-border)]">
                <option>Cut</option>
                <option>Maintain</option>
                <option>Bulk</option>
              </select>
              <Button variant="outline" className="w-full">
                Calculate & Apply
              </Button>
            </div>
          </details>
        </div>
        */}
      </div>
    </div>
  );
}
