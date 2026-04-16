"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { X, Utensils, Save } from "lucide-react";

const labelClass = "text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5";
const fieldClass =
  "h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40";

export default function AddCustomFoodPage() {
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

  const SUBMIT_TIMEOUT_MS = 25000;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    serving_size: 1 as number | "",
    serving_unit: "g",
    calories_per_serving: 0 as number | "",
    protein: 0 as number | "",
    carbs: 0 as number | "",
    fat: 0 as number | "",
    fiber: 0 as number | "",
    category: "Other",
  });

  const num = (v: number | ""): number => (v === "" ? 0 : Number(v) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast({ title: "Required", description: "Please enter a food name.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const insertPromise = supabase.from("foods").insert({
        name: formData.name.trim(),
        brand: formData.brand?.trim() || null,
        serving_size: num(formData.serving_size) || 1,
        serving_unit: formData.serving_unit,
        calories_per_serving: num(formData.calories_per_serving),
        protein: num(formData.protein),
        carbs: num(formData.carbs),
        fat: num(formData.fat),
        fiber: num(formData.fiber),
        category: formData.category,
        is_active: true,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), SUBMIT_TIMEOUT_MS)
      );
      const { error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) throw error;

      addToast({ title: "Saved", description: "Custom food added successfully!", variant: "success" });
      window.location.href = "/client/nutrition";
    } catch (err: unknown) {
      console.error("Error adding custom food:", err);
      if (err instanceof Error && err.message === "timeout") {
        addToast({ title: "Timeout", description: "Request took too long. Check your connection and try again.", variant: "destructive" });
      } else {
        addToast({ title: "Error", description: "Could not save food. Please try again.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="relative z-10 max-w-lg mx-auto px-4 pb-40 pt-6 overflow-x-hidden min-h-screen">
          <header className="flex justify-between items-start gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white tracking-tight">Add Custom Food</h1>
              <p className="text-sm text-gray-500 leading-relaxed mt-0.5">Define your personal nutritional data</p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/nutrition";
              }}
              className="shrink-0 h-11 w-11 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <form id="create-food-form" onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <div>
                <Label className={labelClass}>Food name</Label>
                <div className="flex items-center gap-2 h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 focus-within:ring-1 focus-within:ring-cyan-500/40">
                  <Utensils className="w-4 h-4 text-gray-500 shrink-0" />
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Organic Greek Yogurt"
                    required
                    className="flex-1 h-full border-0 bg-transparent p-0 text-sm text-white placeholder:text-gray-500 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div>
                <Label className={labelClass}>Serving size</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.serving_size === "" ? "" : formData.serving_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serving_size: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className={fieldClass + " font-mono tabular-nums"}
                />
              </div>

              <div>
                <Label className={labelClass}>Unit</Label>
                <Select value={formData.serving_unit} onValueChange={(v) => setFormData({ ...formData, serving_unit: v })}>
                  <SelectTrigger className={fieldClass + " !h-11"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">grams (g)</SelectItem>
                    <SelectItem value="ml">milliliters (ml)</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                    <SelectItem value="tsp">tsp</SelectItem>
                    <SelectItem value="piece">pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={labelClass}>Brand</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>

              <div>
                <Label className={labelClass}>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className={fieldClass + " !h-11"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fruits">Fruits</SelectItem>
                    <SelectItem value="Vegetables">Vegetables</SelectItem>
                    <SelectItem value="Grains">Grains</SelectItem>
                    <SelectItem value="Protein">Protein</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                    <SelectItem value="Snacks">Snacks</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Condiments">Condiments</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <Label className={labelClass + " mb-3"}>Total energy (per serving)</Label>
              <div className="flex flex-wrap items-baseline gap-2">
                <Input
                  type="number"
                  value={
                    formData.calories_per_serving === "" || formData.calories_per_serving === 0
                      ? ""
                      : formData.calories_per_serving
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      calories_per_serving: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="w-28 border-0 bg-transparent p-0 text-2xl font-semibold tabular-nums text-white placeholder:text-gray-500 focus-visible:ring-0"
                />
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">kcal</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 mt-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-emerald-500/60 transition-all"
                  style={{ width: `${Math.min(100, (num(formData.calories_per_serving) / 500) * 100)}%` }}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className={labelClass + " mb-1"}>Macronutrients (per serving)</h3>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500/80 shrink-0" />
                  <span className="text-sm font-semibold text-white tracking-tight">Protein</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.protein === "" || formData.protein === 0 ? "" : formData.protein}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        protein: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      })
                    }
                    className={fieldClass + " font-mono tabular-nums flex-1"}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 w-6 shrink-0">g</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500/80 shrink-0" />
                  <span className="text-sm font-semibold text-white tracking-tight">Carbohydrates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.carbs === "" || formData.carbs === 0 ? "" : formData.carbs}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carbs: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      })
                    }
                    className={fieldClass + " font-mono tabular-nums flex-1"}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 w-6 shrink-0">g</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500/70 shrink-0" />
                  <span className="text-sm font-semibold text-white tracking-tight">Fat</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.fat === "" || formData.fat === 0 ? "" : formData.fat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fat: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      })
                    }
                    className={fieldClass + " font-mono tabular-nums flex-1"}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 w-6 shrink-0">g</span>
                </div>
              </div>

              <div>
                <Label className={labelClass}>Fiber</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fiber === "" || formData.fiber === 0 ? "" : formData.fiber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fiber: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className={fieldClass + " font-mono tabular-nums"}
                />
              </div>
            </section>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex gap-3">
              <span className="text-gray-500 shrink-0 text-sm leading-relaxed">ℹ</span>
              <p className="text-sm text-gray-400 leading-relaxed">
                Custom foods are saved to your private library. Only you can see them unless you choose to share with
                your coach.
              </p>
            </div>
          </form>

          <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent z-50 pt-8">
            <div className="max-w-lg mx-auto w-full flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.location.href = "/client/nutrition";
                }}
                className="flex-1 h-11 rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 font-semibold text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-food-form"
                disabled={loading}
                className="flex-[2] h-11 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                {loading ? (
                  "Saving…"
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save food
                  </>
                )}
              </Button>
            </div>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
