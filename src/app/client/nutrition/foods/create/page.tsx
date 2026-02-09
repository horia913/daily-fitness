"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import { X, Utensils, Save } from "lucide-react";
import Link from "next/link";

export default function AddCustomFoodPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

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
      alert("Please enter a food name.");
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

      alert("Custom food added successfully!");
      router.push("/client/nutrition");
    } catch (err: unknown) {
      console.error("Error adding custom food:", err);
      if (err instanceof Error && err.message === "timeout") {
        alert("Request took too long. Check your connection and try again.");
      } else {
        alert("Could not save food. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-end md:justify-center px-0 md:px-4">
          <div className="fc-surface w-full max-w-xl min-h-[90vh] md:min-h-0 md:rounded-3xl flex flex-col border border-[color:var(--fc-surface-card-border)] overflow-hidden">
            <header className="p-6 flex justify-between items-center border-b border-[color:var(--fc-glass-border)]">
              <div>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Add Custom Food</h1>
                <p className="text-sm fc-text-dim mt-0.5">Define your personal nutritional data</p>
              </div>
              <Link href="/client/nutrition">
                <button type="button" className="w-10 h-10 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle hover:fc-text-primary transition-colors" aria-label="Close">
                  <X className="w-6 h-6" />
                </button>
              </Link>
            </header>

            <form id="create-food-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              <section className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Food Name</Label>
                  <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] flex items-center px-4 py-1 focus-within:border-[color:var(--fc-domain-workouts)] focus-within:ring-2 focus-within:ring-[color:var(--fc-domain-workouts)]/20">
                    <Utensils className="w-5 h-5 fc-text-subtle mr-3" />
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Organic Greek Yogurt"
                      required
                      className="flex-1 h-12 bg-transparent border-0 outline-none text-lg font-medium fc-text-primary placeholder:fc-text-dim"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Serving Size</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.serving_size === "" ? "" : formData.serving_size}
                      onChange={(e) => setFormData({ ...formData, serving_size: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                      required
                      className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] h-12 text-lg font-mono bg-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Unit</Label>
                    <Select value={formData.serving_unit} onValueChange={(v) => setFormData({ ...formData, serving_unit: v })}>
                      <SelectTrigger className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] h-12 text-lg font-medium bg-transparent">
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
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Brand</Label>
                    <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Optional" className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] h-11 bg-transparent" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] h-11 bg-transparent">
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
                </div>
              </section>

              <section className="p-6 rounded-3xl fc-glass-soft border border-[color:var(--fc-glass-border)] flex flex-col items-center justify-center text-center">
                <Label className="text-xs font-semibold uppercase tracking-wider fc-text-subtle mb-2">Total Energy</Label>
                <div className="flex items-baseline gap-2">
                  <Input
                    type="number"
                    value={formData.calories_per_serving === "" || formData.calories_per_serving === 0 ? "" : formData.calories_per_serving}
                    onChange={(e) => setFormData({ ...formData, calories_per_serving: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-32 bg-transparent text-center text-4xl sm:text-5xl font-bold font-mono border-0 outline-none fc-text-primary placeholder:fc-text-dim"
                  />
                  <span className="text-xl font-medium fc-text-subtle uppercase tracking-widest">kcal</span>
                </div>
                <div className="w-full max-w-[200px] h-1.5 fc-glass-highlight rounded-full mt-6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--fc-domain-workouts)] to-[color:var(--fc-status-success)] transition-all"
                    style={{ width: `${Math.min(100, (num(formData.calories_per_serving) / 500) * 100)}%` }}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider fc-text-subtle ml-1">Macronutrients (per serving)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 focus-within:border-[color:var(--fc-domain-workouts)]/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[color:var(--fc-domain-workouts)]" />
                      <span className="text-sm font-bold fc-text-workouts">PRO</span>
                    </div>
                    <div className="flex items-baseline">
                      <Input type="number" step="0.1" value={formData.protein === "" || formData.protein === 0 ? "" : formData.protein} onChange={(e) => setFormData({ ...formData, protein: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })} className="w-full bg-transparent border-0 p-0 text-2xl font-bold font-mono fc-text-primary h-auto" />
                      <span className="text-xs fc-text-subtle font-bold ml-1">g</span>
                    </div>
                  </div>
                  <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 focus-within:border-[color:var(--fc-status-warning)]/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-warning)]" />
                      <span className="text-sm font-bold fc-text-warning">CHO</span>
                    </div>
                    <div className="flex items-baseline">
                      <Input type="number" step="0.1" value={formData.carbs === "" || formData.carbs === 0 ? "" : formData.carbs} onChange={(e) => setFormData({ ...formData, carbs: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })} className="w-full bg-transparent border-0 p-0 text-2xl font-bold font-mono fc-text-primary h-auto" />
                      <span className="text-xs fc-text-subtle font-bold ml-1">g</span>
                    </div>
                  </div>
                  <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 focus-within:border-[color:var(--fc-status-error)]/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-error)]" />
                      <span className="text-sm font-bold fc-text-error">FAT</span>
                    </div>
                    <div className="flex items-baseline">
                      <Input type="number" step="0.1" value={formData.fat === "" || formData.fat === 0 ? "" : formData.fat} onChange={(e) => setFormData({ ...formData, fat: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })} className="w-full bg-transparent border-0 p-0 text-2xl font-bold font-mono fc-text-primary h-auto" />
                      <span className="text-xs fc-text-subtle font-bold ml-1">g</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs fc-text-subtle">Fiber (g)</Label>
                  <Input type="number" step="0.1" value={formData.fiber === "" || formData.fiber === 0 ? "" : formData.fiber} onChange={(e) => setFormData({ ...formData, fiber: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })} className="w-24 fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] h-9 bg-transparent font-mono" />
                </div>
              </section>

              <div className="p-4 rounded-2xl bg-[color:var(--fc-domain-workouts)]/10 border border-[color:var(--fc-domain-workouts)]/20 flex gap-3">
                <div className="w-5 h-5 rounded flex items-center justify-center fc-text-workouts flex-shrink-0 mt-0.5">
                  <span className="text-lg">ℹ</span>
                </div>
                <p className="text-sm fc-text-dim leading-relaxed">
                  Custom foods are saved to your private library. Only you can see them unless you choose to share with your coach.
                </p>
              </div>
            </form>

            <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent pt-12 flex gap-4">
              <Link href="/client/nutrition" className="flex-1">
                <Button type="button" variant="outline" className="w-full h-14 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)] font-bold fc-text-dim hover:fc-glass-soft">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                form="create-food-form"
                disabled={loading}
                className="flex-[2] h-14 rounded-2xl flex items-center justify-center gap-2 font-bold bg-[color:var(--fc-status-success)] hover:opacity-90 text-white border-0"
              >
                {loading ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Food
                  </>
                )}
              </Button>
            </footer>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
