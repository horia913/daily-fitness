"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";

interface FoodResult {
  id: string;
  name: string;
  calories_per_serving: number | null;
  serving_size: number;
  serving_unit: string;
}

interface AddFoodModalProps {
  open: boolean;
  onClose: () => void;
  mealId: string;
  onFoodAdded?: () => void;
}

const DEBOUNCE_MS = 300;

export default function AddFoodModal({
  open,
  onClose,
  mealId,
  onFoodAdded,
}: AddFoodModalProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [foods, setFoods] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"food" | "recipes" | "favorites">("food");

  const fetchFoods = useCallback(async (term: string) => {
    if (!term.trim()) {
      setFoods([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("foods")
        .select("id, name, calories_per_serving, serving_size, serving_unit")
        .ilike("name", `%${term.trim()}%`)
        .eq("is_active", true)
        .order("name")
        .limit(50);

      if (error) throw error;
      setFoods((data as FoodResult[]) || []);
    } catch (err) {
      console.error("Error fetching foods:", err);
      setFoods([]);
      addToast({
        title: "Error",
        description: "Could not search foods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchFoods(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, open, fetchFoods]);

  const handleAddFood = async (food: FoodResult) => {
    setAddingId(food.id);
    try {
      const { error } = await supabase.from("meal_food_items").insert({
        meal_id: mealId,
        food_id: food.id,
        quantity: 1,
        unit: food.serving_unit || "serving",
      });

      if (error) throw error;

      addToast({
        title: "Added",
        description: `${food.name} added to meal`,
        variant: "success",
      });
      onFoodAdded?.();
      onClose();
    } catch (err) {
      console.error("Error adding food:", err);
      addToast({
        title: "Error",
        description: "Could not add food. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingId(null);
    }
  };

  const kcalDisplay = (f: FoodResult) => {
    const cal = f.calories_per_serving ?? 0;
    return cal > 0 ? `${Math.round(cal)} kcal` : "—";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col fc-modal fc-glass">
        <DialogHeader>
          <DialogTitle className="fc-text-primary">Add food or drink</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim" />
            <Input
              placeholder="Search foods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 fc-input"
              autoFocus
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[color:var(--fc-glass-border)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("food")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === "food"
                  ? "fc-text-primary bg-[color:var(--fc-accent)]/20 font-medium"
                  : "fc-text-dim hover:fc-text-primary"
              }`}
            >
              Food
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin fc-text-dim" />
              </div>
            ) : activeTab === "food" && foods.length === 0 ? (
              <p className="text-sm fc-text-dim text-center py-8">
                {search.trim() ? "No foods found. Try a different search." : "Type to search foods."}
              </p>
            ) : (
              foods.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-[color:var(--fc-surface-sunken)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium fc-text-primary truncate">{f.name}</p>
                    <p className="text-xs fc-text-dim">{kcalDisplay(f)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="min-h-[44px] min-w-[44px] rounded-full flex-shrink-0"
                    onClick={() => handleAddFood(f)}
                    disabled={addingId === f.id}
                  >
                    {addingId === f.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
