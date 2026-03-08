"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addEntry, getEntryRange, type FoodLogEntry } from "@/lib/foodLogService";
import { useToast } from "@/components/ui/toast-provider";

interface QuickFoodSearchProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlot: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  clientId: string;
  onFoodAdded: () => void;
}

interface Food {
  id: string;
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface QuantitySelectorProps {
  food: Food;
  onLog: (quantity: number) => void;
  onCancel: () => void;
}

function QuantitySelector({ food, onLog, onCancel }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(food.serving_size);
  const multiplier = quantity / food.serving_size;
  
  const calculatedMacros = {
    calories: Math.round(food.calories_per_serving * multiplier),
    protein: Math.round((food.protein * multiplier) * 10) / 10,
    carbs: Math.round((food.carbs * multiplier) * 10) / 10,
    fat: Math.round((food.fat * multiplier) * 10) / 10,
  };
  
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold fc-text-primary">{food.name}</div>
        {food.brand && <div className="text-sm fc-text-dim">{food.brand}</div>}
        <div className="text-xs fc-text-dim mt-1">
          {food.serving_size} {food.serving_unit} = {food.calories_per_serving} cal
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold fc-text-dim uppercase tracking-wider mb-2 block">
            Quantity
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(0.1, quantity - 0.1))}
              className="h-10 w-10 p-0"
            >
              −
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0.1"
              className="flex-1 text-center text-lg font-mono font-bold fc-text-primary"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 0.1)}
              className="h-10 w-10 p-0"
            >
              +
            </Button>
            <span className="text-sm fc-text-dim w-16">{food.serving_unit}</span>
          </div>
        </div>
        
        <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3">
          <div className="text-xs font-semibold fc-text-dim uppercase tracking-wider mb-2">
            Macros
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="fc-text-dim">Cal</div>
              <div className="font-bold font-mono fc-text-primary">{calculatedMacros.calories}</div>
            </div>
            <div>
              <div className="fc-text-dim">Protein</div>
              <div className="font-bold font-mono fc-text-primary">{calculatedMacros.protein}g</div>
            </div>
            <div>
              <div className="fc-text-dim">Carbs</div>
              <div className="font-bold font-mono fc-text-primary">{calculatedMacros.carbs}g</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="fc-primary"
          onClick={() => onLog(quantity)}
          className="flex-1"
        >
          Log
        </Button>
      </div>
    </div>
  );
}

export function QuickFoodSearch({
  isOpen,
  onClose,
  mealSlot,
  clientId,
  onFoodAdded,
}: QuickFoodSearchProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [logging, setLogging] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const today = new Date().toISOString().split('T')[0];
  
  // Load recent foods
  useEffect(() => {
    if (!isOpen || !clientId) return;
    
    const loadRecentFoods = async () => {
      try {
        // Get entries from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        
        const entries = await getEntryRange(clientId, startDate, today);
        
        // Get unique food IDs (most recent first)
        const foodIds = Array.from(new Set(entries.map(e => e.food_id)));
        const recentFoodIds = foodIds.slice(0, 10);
        
        if (recentFoodIds.length > 0) {
          const { data, error } = await supabase
            .from('foods')
            .select('*')
            .in('id', recentFoodIds)
            .eq('is_active', true);
          
          if (!error && data) {
            // Preserve order from recentFoodIds
            const orderedFoods = recentFoodIds
              .map(id => data.find(f => f.id === id))
              .filter(Boolean) as Food[];
            setRecentFoods(orderedFoods);
          }
        }
      } catch (error) {
        console.error('Error loading recent foods:', error);
      }
    };
    
    loadRecentFoods();
  }, [isOpen, clientId, today]);
  
  // Search foods with debounce
  useEffect(() => {
    if (!isOpen) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!search.trim()) {
      setFoods([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .ilike('name', `%${search.trim()}%`)
          .eq('is_active', true)
          .order('name')
          .limit(20);
        
        if (error) throw error;
        setFoods((data || []) as Food[]);
      } catch (error) {
        console.error('Error searching foods:', error);
        setFoods([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, isOpen]);
  
  const handleLogFood = async (food: Food, quantity: number) => {
    try {
      setLogging(true);
      await addEntry(clientId, {
        food_id: food.id,
        log_date: today,
        meal_slot: mealSlot,
        quantity,
        unit: food.serving_unit,
      });
      
      addToast({
        title: 'Food logged',
        description: `${food.name} added to ${mealSlot.replace('_', ' ')}`,
        variant: 'success',
      });
      
      onFoodAdded();
    } catch (error) {
      console.error('Error logging food:', error);
      addToast({
        title: 'Error',
        description: 'Failed to log food. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLogging(false);
    }
  };
  
  const handleQuickAdd = async (food: Food) => {
    // Use food's serving_size as default quantity
    await handleLogFood(food, food.serving_size);
  };
  
  if (!isOpen) return null;
  
  if (selectedFood) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md max-h-[90vh] fc-glass-soft rounded-t-2xl sm:rounded-2xl border border-[color:var(--fc-glass-border)] shadow-xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-300">
          <div className="p-4 flex items-center justify-between border-b border-[color:var(--fc-glass-border)]">
            <h2 className="text-lg font-semibold fc-text-primary">Log Food</h2>
            <Button variant="ghost" size="icon" onClick={() => setSelectedFood(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 overflow-y-auto">
            <QuantitySelector
              food={selectedFood}
              onLog={(quantity) => handleLogFood(selectedFood, quantity)}
              onCancel={() => setSelectedFood(null)}
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[85vh] fc-glass-soft rounded-t-2xl sm:rounded-2xl border border-[color:var(--fc-glass-border)] shadow-xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-300">
        <div className="p-4 flex items-center justify-between border-b border-[color:var(--fc-glass-border)] flex-shrink-0">
          <h2 className="text-lg font-semibold fc-text-primary">Add Food</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search Input */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search foods..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading && (
            <div className="text-center py-8 fc-text-dim">Searching...</div>
          )}
          
          {!loading && search.trim() && foods.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <p className="fc-text-dim">No foods found</p>
              <p className="text-sm fc-text-dim">
                Can't find it? Ask your coach to add it.
              </p>
            </div>
          )}
          
          {!loading && search.trim() && foods.length > 0 && (
            <div className="space-y-1">
              {foods.map((food) => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3 hover:bg-white/5 transition-colors"
                >
                  <div className="font-semibold fc-text-primary">{food.name}</div>
                  {food.brand && <div className="text-xs fc-text-dim">{food.brand}</div>}
                  <div className="text-xs fc-text-dim mt-1">
                    {food.serving_size} {food.serving_unit} • {food.calories_per_serving} cal
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!loading && !search.trim() && recentFoods.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold fc-text-dim">
                <Clock className="w-4 h-4" />
                Recent Foods
              </div>
              <div className="space-y-1">
                {recentFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleQuickAdd(food)}
                    className="w-full text-left fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="font-semibold fc-text-primary">{food.name}</div>
                    {food.brand && <div className="text-xs fc-text-dim">{food.brand}</div>}
                    <div className="text-xs fc-text-dim mt-1">
                      {food.serving_size} {food.serving_unit} • {food.calories_per_serving} cal
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {!loading && !search.trim() && recentFoods.length === 0 && (
            <div className="text-center py-8 fc-text-dim">
              Start typing to search for foods
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
