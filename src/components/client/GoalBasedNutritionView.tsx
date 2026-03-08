"use client";

// DEPRECATED: Scheduled for removal after Phase N3 nutrition redesign. No longer used on client Fuel page.

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getClientNutritionGoals, updateDailyLog } from "@/lib/nutritionLogService";
import { getDayEntries, deleteEntry, type FoodLogEntry } from "@/lib/foodLogService";
import { FoodLogEntry as FoodLogEntryComponent } from "./FoodLogEntry";
import { QuickFoodSearch } from "./QuickFoodSearch";

const MEAL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'morning_snack', label: 'Morning Snack', emoji: '🍎' },
  { value: 'lunch', label: 'Lunch', emoji: '🥗' },
  { value: 'afternoon_snack', label: 'Afternoon Snack', emoji: '🥜' },
  { value: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { value: 'evening_snack', label: 'Evening Snack', emoji: '🍌' },
] as const;

interface MacroProgress {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;
}

interface GoalBasedNutritionViewProps {
  clientId: string;
}

export function GoalBasedNutritionView({ clientId }: GoalBasedNutritionViewProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const [goals, setGoals] = useState<{
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | null>(null);
  
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMealSlot, setSelectedMealSlot] = useState<string | null>(null);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate macro progress
  const macroProgress: {
    calories: MacroProgress;
    protein: MacroProgress;
    carbs: MacroProgress;
    fat: MacroProgress;
  } = {
    calories: {
      consumed: entries.reduce((sum, e) => sum + e.calories, 0),
      goal: goals?.calories || 0,
      remaining: Math.max((goals?.calories || 0) - entries.reduce((sum, e) => sum + e.calories, 0), 0),
      percentage: goals?.calories ? Math.min((entries.reduce((sum, e) => sum + e.calories, 0) / goals.calories) * 100, 100) : 0,
    },
    protein: {
      consumed: entries.reduce((sum, e) => sum + e.protein_g, 0),
      goal: goals?.protein || 0,
      remaining: Math.max((goals?.protein || 0) - entries.reduce((sum, e) => sum + e.protein_g, 0), 0),
      percentage: goals?.protein ? Math.min((entries.reduce((sum, e) => sum + e.protein_g, 0) / goals.protein) * 100, 100) : 0,
    },
    carbs: {
      consumed: entries.reduce((sum, e) => sum + e.carbs_g, 0),
      goal: goals?.carbs || 0,
      remaining: Math.max((goals?.carbs || 0) - entries.reduce((sum, e) => sum + e.carbs_g, 0), 0),
      percentage: goals?.carbs ? Math.min((entries.reduce((sum, e) => sum + e.carbs_g, 0) / goals.carbs) * 100, 100) : 0,
    },
    fat: {
      consumed: entries.reduce((sum, e) => sum + e.fat_g, 0),
      goal: goals?.fat || 0,
      remaining: Math.max((goals?.fat || 0) - entries.reduce((sum, e) => sum + e.fat_g, 0), 0),
      percentage: goals?.fat ? Math.min((entries.reduce((sum, e) => sum + e.fat_g, 0) / goals.fat) * 100, 100) : 0,
    },
  };
  
  const loadData = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // Load goals
      const nutritionGoals = await getClientNutritionGoals(clientId);
      setGoals(nutritionGoals);
      
      // Load today's entries
      const todayEntries = await getDayEntries(clientId, today);
      setEntries(todayEntries);
      
      // Ensure daily log is up to date
      await updateDailyLog(clientId, today);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, today]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Listen for entry updates
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('foodEntryUpdated', handleUpdate);
    return () => window.removeEventListener('foodEntryUpdated', handleUpdate);
  }, [loadData]);
  
  const handleFoodAdded = async () => {
    await loadData();
    setShowFoodSearch(false);
    setSelectedMealSlot(null);
  };
  
  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(entryId, clientId, today);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };
  
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90 && percentage <= 110) return '#22C55E'; // green
    if (percentage > 120) return '#EF4444'; // red
    return '#EAB308'; // yellow
  };
  
  const getNextEmptySlot = (): string | null => {
    const slotsWithEntries = new Set(entries.map(e => e.meal_slot));
    for (const slot of MEAL_SLOTS) {
      if (!slotsWithEntries.has(slot.value)) {
        return slot.value;
      }
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!goals || (Object.keys(goals).length === 0)) {
    return (
      <ClientGlassCard className="p-8 text-center">
        <p className="fc-text-dim">
          Your coach hasn't set up your nutrition goals yet. Reach out to them to get started.
        </p>
      </ClientGlassCard>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Progress Rings Section */}
        <ClientGlassCard className="p-6">
          <div className="space-y-6">
            {/* Calories - Large Central Ring */}
            {goals.calories && (
              <div className="flex flex-col items-center">
                <MacroProgressRing
                  consumed={macroProgress.calories.consumed}
                  goal={macroProgress.calories.goal}
                  remaining={macroProgress.calories.remaining}
                  percentage={macroProgress.calories.percentage}
                  label="Calories"
                  unit="kcal"
                  size={180}
                  strokeWidth={16}
                  color={getProgressColor(macroProgress.calories.percentage)}
                />
              </div>
            )}
            
            {/* Protein, Carbs, Fat - Three Smaller Rings */}
            {(goals.protein || goals.carbs || goals.fat) && (
              <div className="grid grid-cols-3 gap-4">
                {goals.protein && (
                  <MacroProgressRing
                    consumed={macroProgress.protein.consumed}
                    goal={macroProgress.protein.goal}
                    remaining={macroProgress.protein.remaining}
                    percentage={macroProgress.protein.percentage}
                    label="Protein"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.protein.percentage)}
                  />
                )}
                {goals.carbs && (
                  <MacroProgressRing
                    consumed={macroProgress.carbs.consumed}
                    goal={macroProgress.carbs.goal}
                    remaining={macroProgress.carbs.remaining}
                    percentage={macroProgress.carbs.percentage}
                    label="Carbs"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.carbs.percentage)}
                  />
                )}
                {goals.fat && (
                  <MacroProgressRing
                    consumed={macroProgress.fat.consumed}
                    goal={macroProgress.fat.goal}
                    remaining={macroProgress.fat.remaining}
                    percentage={macroProgress.fat.percentage}
                    label="Fat"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.fat.percentage)}
                  />
                )}
              </div>
            )}
          </div>
        </ClientGlassCard>
        
        {/* Meal Slots */}
        <div className="space-y-4">
          {MEAL_SLOTS.map((slot) => {
            const slotEntries = entries.filter(e => e.meal_slot === slot.value);
            const hasEntries = slotEntries.length > 0;
            const isNextEmpty = !hasEntries && getNextEmptySlot() === slot.value;
            
            // Only show slots with entries OR the next logical empty slot
            if (!hasEntries && !isNextEmpty) {
              return null;
            }
            
            return (
              <ClientGlassCard key={slot.value} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{slot.emoji}</span>
                    <h3 className="text-lg font-semibold fc-text-primary">{slot.label}</h3>
                  </div>
                  
                  {hasEntries ? (
                    <>
                      <div className="space-y-2">
                        {slotEntries.map((entry) => (
                          <FoodLogEntryComponent
                            key={entry.id}
                            entry={entry}
                            onDelete={() => handleDeleteEntry(entry.id)}
                          />
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMealSlot(slot.value);
                          setShowFoodSearch(true);
                        }}
                        className="w-full mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Food
                      </Button>
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="fc-text-dim mb-4">
                        What did you have for {slot.label.toLowerCase()}?
                      </p>
                      <Button
                        variant="fc-primary"
                        onClick={() => {
                          setSelectedMealSlot(slot.value);
                          setShowFoodSearch(true);
                        }}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Food
                      </Button>
                    </div>
                  )}
                </div>
              </ClientGlassCard>
            );
          })}
        </div>
      </div>
      
      {/* Quick Food Search Modal */}
      {showFoodSearch && selectedMealSlot && (
        <QuickFoodSearch
          isOpen={showFoodSearch}
          onClose={() => {
            setShowFoodSearch(false);
            setSelectedMealSlot(null);
          }}
          mealSlot={selectedMealSlot as any}
          clientId={clientId}
          onFoodAdded={handleFoodAdded}
        />
      )}
    </>
  );
}

// Macro Progress Ring Component
interface MacroProgressRingProps {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;
  label: string;
  unit: string;
  size: number;
  strokeWidth: number;
  color: string;
}

function MacroProgressRing({
  consumed,
  goal,
  remaining,
  percentage,
  label,
  unit,
  size,
  strokeWidth,
  color,
}: MacroProgressRingProps) {
  const { isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold font-mono fc-text-primary">
              {Math.round(consumed)}
            </div>
            <div className="text-xs fc-text-dim">/ {Math.round(goal)} {unit}</div>
          </div>
        </div>
      </div>
      {/* Label and remaining */}
      <div className="mt-2 text-center">
        <div className="text-sm font-semibold fc-text-primary">{label}</div>
        {remaining > 0 && (
          <div className="text-xs fc-text-dim mt-0.5">
            {Math.round(remaining)} {unit} remaining
          </div>
        )}
        {remaining <= 0 && (
          <div className="text-xs fc-text-dim mt-0.5">
            Goal reached!
          </div>
        )}
      </div>
    </div>
  );
}
