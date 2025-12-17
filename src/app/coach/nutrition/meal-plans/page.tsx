"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, Client } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import MealPlanCard from "@/components/features/nutrition/MealPlanCard";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import { RefreshCw, Plus, ChefHat, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MealPlansPage() {
  const { user } = useAuth();
  const { getThemeStyles, isDark, getSemanticColor, performanceSettings } =
    useTheme();
  const theme = getThemeStyles();
  const router = useRouter();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] =
    useState<MealPlan | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadMealPlans();
    }
  }, [user]);

  const loadMealPlans = async () => {
    try {
      if (!user) return;
      setLoading(true);

      const mealPlans = await MealPlanService.getMealPlans(user.id);

      // Calculate actual stats for each meal plan
      const mealPlansWithStats = await Promise.all(
        mealPlans.map(async (plan) => {
          // Get meal count (from meal_plan_items - count distinct meal_type)
          let mealCount = 0;
          try {
            const { data, error } = await supabase
              .from("meal_plan_items")
              .select("meal_type")
              .eq("meal_plan_id", plan.id);

            if (!error && data) {
              // Count unique meal types
              const uniqueMealTypes = new Set(
                data.map((item) => item.meal_type)
              );
              mealCount = uniqueMealTypes.size;
            }
          } catch (error) {
            // Silently fail - meal count is optional
          }

          // Get assignment count
          let assignmentCount = 0;
          try {
            const { count, error } = await supabase
              .from("meal_plan_assignments")
              .select("*", { count: "exact", head: true })
              .eq("meal_plan_id", plan.id);
            if (!error && count !== null) {
              assignmentCount = count;
            }
          } catch (error) {
            console.warn(
              `Error counting assignments for plan ${plan.id}:`,
              error
            );
          }

          return {
            ...plan,
            meal_count: mealCount,
            usage_count: assignmentCount,
          };
        })
      );

      setMealPlans(mealPlansWithStats);
    } catch (error) {
      console.error("Error loading meal plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    try {
      setLoading(true);
      await MealPlanService.deleteMealPlan(id);
      loadMealPlans();
      alert("Meal plan deleted successfully!");
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      alert("Error deleting meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMealPlan = async (mealPlan: MealPlan) => {
    setSelectedMealPlanForAssignment(mealPlan);
    setSelectedClients([]);

    // Load clients for this coach
    if (user?.id) {
      try {
        const coachClients = await DatabaseService.getClients(user.id);
        setClients(coachClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        alert("Error loading clients. Please try again.");
        return;
      }
    }

    setShowAssignModal(true);
  };

  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedMealPlanForAssignment(null);
    setSelectedClients([]);
    loadMealPlans(); // Refresh to update usage counts
  };

  const filteredMealPlans = useMemo(() => {
    if (!searchQuery.trim()) return mealPlans;
    const query = searchQuery.toLowerCase();
    return mealPlans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(query) ||
        (plan.description && plan.description.toLowerCase().includes(query))
    );
  }, [mealPlans, searchQuery]);

  if (loading && mealPlans.length === 0) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-white/20 dark:bg-slate-700/20 rounded-xl w-1/4 backdrop-blur-sm"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-64 bg-white/20 dark:bg-slate-700/20 rounded-2xl backdrop-blur-sm"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <GlassCard elevation={2} className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <Link href="/coach/nutrition">
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: getSemanticColor("success").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("success").primary
                        }30`,
                      }}
                    >
                      <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <h1
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Meal Plans
                    </h1>
                  </div>
                  <p
                    className="text-sm sm:text-base"
                    style={{ color: isDark ? "#A1A1AA" : "#6B7280" }}
                  >
                    Create and manage nutrition plans for your clients
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <GlassCard elevation={1} className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    style={{ color: isDark ? "#A1A1AA" : "#9CA3AF" }}
                  />
                  <Input
                    placeholder="Search meal plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl bg-transparent border-0"
                    style={{
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>
              </GlassCard>
              <Button
                onClick={loadMealPlans}
                variant="ghost"
                className="rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/coach/nutrition/meal-plans/create">
                <Button
                  className="rounded-xl"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meal Plan
                </Button>
              </Link>
            </div>

            {/* Meal Plans Grid */}
            {filteredMealPlans.length === 0 ? (
              <GlassCard elevation={2} className="p-12 text-center">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 8px 24px ${
                      getSemanticColor("success").primary
                    }40`,
                  }}
                >
                  <ChefHat className="w-10 h-10 text-white" />
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {searchQuery ? "No meal plans found" : "No meal plans yet"}
                </h3>
                <p
                  className="mb-6 max-w-md mx-auto"
                  style={{ color: isDark ? "#A1A1AA" : "#6B7280" }}
                >
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first meal plan to get started with nutrition planning."}
                </p>
                {!searchQuery && (
                  <Link href="/coach/nutrition/meal-plans/create">
                    <Button
                      className="rounded-xl"
                      style={{
                        background: getSemanticColor("success").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("success").primary
                        }30`,
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Meal Plan
                    </Button>
                  </Link>
                )}
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMealPlans.map((plan) => (
                  <MealPlanCard
                    key={plan.id}
                    mealPlan={plan}
                    onEdit={(plan) =>
                      router.push(`/coach/nutrition/meal-plans/${plan.id}/edit`)
                    }
                    onDelete={handleDeleteMealPlan}
                    onAssign={handleAssignMealPlan}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedBackground>

      {/* Assignment Modal */}
      {showAssignModal && selectedMealPlanForAssignment && (
        <MealPlanAssignmentModal
          mealPlan={selectedMealPlanForAssignment}
          clients={clients}
          selectedClients={selectedClients}
          onSelectedClientsChange={setSelectedClients}
          onClose={handleAssignmentComplete}
          onComplete={handleAssignmentComplete}
        />
      )}
    </ProtectedRoute>
  );
}
