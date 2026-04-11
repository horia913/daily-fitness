"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import MealPlanCard from "@/components/features/nutrition/MealPlanCard";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import { useToast } from "@/components/ui/toast-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ChefHat, Plus, RefreshCw, Search } from "lucide-react";
import { DatabaseService, Client } from "@/lib/database";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePageData } from "@/hooks/usePageData";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MealPlansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { performanceSettings, isDark, getSemanticColor } = useTheme();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] =
    useState<MealPlan | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const fetchMealPlansData = useCallback(async (): Promise<{ mealPlans: MealPlan[] }> => {
    if (!user?.id) return { mealPlans: [] };
    const mealPlansData = await MealPlanService.getMealPlans(user.id);
    if (!mealPlansData || mealPlansData.length === 0) return { mealPlans: [] };

    const planIds = mealPlansData.map((p) => p.id);

    const { data: mealItemsData } = await supabase
      .from("meal_plan_items")
      .select("meal_plan_id, meal_type")
      .in("meal_plan_id", planIds);

    const { data: assignmentsData } = await supabase
      .from("meal_plan_assignments")
      .select("meal_plan_id")
      .in("meal_plan_id", planIds);

      const mealCountByPlan: Record<string, Set<string>> = {};
      planIds.forEach((id) => (mealCountByPlan[id] = new Set()));
      (mealItemsData || []).forEach((row: { meal_plan_id: string; meal_type: string }) => {
        if (mealCountByPlan[row.meal_plan_id]) mealCountByPlan[row.meal_plan_id].add(row.meal_type);
      });

      const assignCountByPlan: Record<string, number> = {};
      planIds.forEach((id) => (assignCountByPlan[id] = 0));
      (assignmentsData || []).forEach((row: { meal_plan_id: string }) => {
        if (assignCountByPlan[row.meal_plan_id] != null) assignCountByPlan[row.meal_plan_id] += 1;
      });

      const mealPlansWithStats = mealPlansData.map((plan) => ({
        ...plan,
        meal_count: mealCountByPlan[plan.id]?.size ?? 0,
        usage_count: assignCountByPlan[plan.id] ?? 0,
      }));

    return { mealPlans: mealPlansWithStats };
  }, [user?.id]);

  const { data, loading, refetch } = usePageData(fetchMealPlansData, [user?.id]);

  const mealPlans = data?.mealPlans ?? [];

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    try {
      await MealPlanService.deleteMealPlan(id);
      refetch();
      addToast({ title: "Deleted", description: "Meal plan deleted successfully.", variant: "success" });
    } catch (err) {
      console.error("Error deleting meal plan:", err);
      addToast({ title: "Error", description: "Error deleting meal plan. Please try again.", variant: "destructive" });
    }
  };

  const handleAssignMealPlan = async (mealPlan: MealPlan) => {
    setSelectedMealPlanForAssignment(mealPlan);
    setSelectedClients([]);

    if (user?.id) {
      try {
        const coachClients = await DatabaseService.getClients(user.id);
        setClients(coachClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        addToast({ title: "Error", description: "Error loading clients. Please try again.", variant: "destructive" });
        return;
      }
    }

    setShowAssignModal(true);
  };

  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedMealPlanForAssignment(null);
    setSelectedClients([]);
    refetch();
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

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-32">
          <div className="max-w-7xl mx-auto min-w-0 overflow-x-hidden p-4 sm:p-6 space-y-6">
            <Link
              href="/coach/nutrition"
              className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Nutrition
            </Link>

            <div className="fc-card-shell p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                    }}
                  >
                    <ChefHat className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      Meal Plans
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Create and manage reusable meal plan templates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => refetch()}
                    className="fc-btn fc-btn-ghost"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => router.push("/coach/nutrition/meal-plans/create")}
                    className="fc-btn fc-btn-primary"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Meal Plan
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="sticky top-0 z-10 flex-1 fc-card-shell p-2 rounded-xl border border-[color:var(--fc-glass-border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 fc-text-dim" />
                  <Input
                    placeholder="Search by plan name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl bg-transparent border-0 w-full fc-input"
                    style={{
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Meal Plans Grid */}
            {loading && mealPlans.length === 0 ? (
              <GlassCard elevation={2} className="p-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded-xl w-1/4 backdrop-blur-sm"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 bg-[color:var(--fc-glass-highlight)] rounded-2xl backdrop-blur-sm"
                      ></div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            ) : filteredMealPlans.length === 0 ? (
              <GlassCard elevation={2} className="p-12">
                <EmptyState
                  icon={ChefHat}
                  title={searchQuery ? "No meal plans found" : "No meal plans yet"}
                  description={
                    searchQuery
                      ? "Try adjusting your search query."
                      : "Create a meal plan from scratch or use the meal plan generator in Nutrition."
                  }
                  action={
                    !searchQuery
                      ? {
                          label: "Create meal plan",
                          href: "/coach/nutrition/meal-plans/create",
                        }
                      : undefined
                  }
                />
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
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
