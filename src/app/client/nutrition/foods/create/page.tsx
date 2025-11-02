"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/client/nutrition">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  Add Custom Food
                </h1>
                <p className={`${theme.textSecondary}`}>
                  Add a new food item to the database
                </p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className={`${theme.card} ${theme.shadow} rounded-3xl p-6 sm:p-8 space-y-6 border-2 border-slate-200 dark:border-slate-700`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
                    Food Name *
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Grilled Chicken Breast"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>Brand</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="e.g., Generic"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
                    Unit *
                  </Label>
                  <Select
                    value={formData.serving_unit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, serving_unit: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
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
                  <Label className={`${theme.text} font-semibold`}>
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`${theme.text} font-semibold`}>
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
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className={`${theme.text} font-semibold`}>
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
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/client/nutrition" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-2xl"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-2xl"
                >
                  {loading ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Food
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
