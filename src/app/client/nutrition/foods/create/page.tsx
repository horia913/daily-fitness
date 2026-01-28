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
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function AddCustomFoodPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    serving_size: 1,
    serving_unit: "g",
    calories_per_serving: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    category: "Other",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a food name.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("foods").insert({
        name: formData.name,
        brand: formData.brand || null,
        serving_size: formData.serving_size,
        serving_unit: formData.serving_unit,
        calories_per_serving: formData.calories_per_serving,
        protein: formData.protein,
        carbs: formData.carbs,
        fat: formData.fat,
        fiber: formData.fiber,
        category: formData.category,
        is_active: true,
      });

      if (error) throw error;

      alert("Custom food added successfully!");
      router.push("/client/nutrition");
    } catch (error) {
      console.error("Error adding custom food:", error);
      alert("Error adding custom food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-4xl space-y-8">
            <div className="flex items-center gap-3">
              <Link href="/client/nutrition">
                <Button
                  variant="outline"
                  size="icon"
                  className="fc-btn fc-btn-secondary h-10 w-10 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                Nutrition
              </span>
            </div>

            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    Add custom food
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Add a new food item to your nutrition database.
                  </p>
                </div>
              </div>
            </GlassCard>

            <form onSubmit={handleSubmit} className="space-y-6">
              <GlassCard elevation={1} className="fc-glass fc-card p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Food basics
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Name and brand details for this item.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Food Name *
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Grilled Chicken Breast"
                      required
                      className="fc-input rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Brand
                    </Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      placeholder="e.g., Generic"
                      className="fc-input rounded-xl"
                    />
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={1} className="fc-glass fc-card p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Serving details
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Serving size, unit, and food category.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Serving Size *
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.serving_size}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serving_size: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="fc-input rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Unit *
                    </Label>
                    <Select
                      value={formData.serving_unit}
                      onValueChange={(value) =>
                        setFormData({ ...formData, serving_unit: value })
                      }
                    >
                      <SelectTrigger className="fc-input rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="tbsp">tbsp</SelectItem>
                        <SelectItem value="tsp">tsp</SelectItem>
                        <SelectItem value="piece">piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Category *
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger className="fc-input rounded-xl">
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
              </GlassCard>

              <GlassCard elevation={1} className="fc-glass fc-card p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Nutrition facts
                  </h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Calories and macro breakdown per serving.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Calories *
                    </Label>
                    <Input
                      type="number"
                      value={formData.calories_per_serving}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          calories_per_serving: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="fc-input rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Protein (g)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.protein}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          protein: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="fc-input rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Carbs (g)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.carbs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carbs: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="fc-input rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                      Fat (g)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.fat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fat: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="fc-input rounded-xl"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="font-semibold text-[color:var(--fc-text-primary)]">
                    Fiber (g)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.fiber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fiber: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="fc-input mt-2 rounded-xl"
                  />
                </div>
              </GlassCard>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/client/nutrition" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="fc-btn fc-btn-secondary w-full"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="fc-btn fc-btn-primary flex-1"
                >
                  {loading ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Food
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
