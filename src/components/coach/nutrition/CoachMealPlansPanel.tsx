"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, UserPlus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import { MealPlanService, type MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, type Client } from "@/lib/database";
import { useToast } from "@/components/ui/toast-provider";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import {
  CollectionCard,
  CollectionCardAssignedStat,
  CollectionCardIconAction,
  CollectionCardMetaSep,
  CollectionCardMetaText,
  CollectionCardMetaValue,
  CollectionCardStack,
} from "@/components/ui/CollectionCard";
import {
  avatarHueByIndex,
  programCollectionHue,
} from "@/lib/programs/programListDisplayUtils";
import { MealPlanMetadataModal } from "./MealPlanMetadataModal";
import {
  fetchCoachMealPlansWithStats,
  fetchNutritionWorkspaceMeta,
  type MealPlanWithStats,
  type NutritionWorkspaceMeta,
} from "./fetchNutritionWorkspaceData";
import styles from "./coachNutritionWorkspace.module.css";

type StatusFilter = "all" | "active";

function PlanMeta({ plan, mealCount }: { plan: MealPlan; mealCount: number }) {
  const hasComputed = plan.computed_calories != null;
  const calories = Math.round(plan.computed_calories ?? plan.target_calories ?? 0);
  const protein = Math.round(plan.computed_protein ?? plan.target_protein ?? 0);
  const carbs = Math.round(plan.computed_carbs ?? plan.target_carbs ?? 0);
  const fat = Math.round(plan.computed_fat ?? plan.target_fat ?? 0);

  const hasAny =
    hasComputed ||
    plan.target_calories != null ||
    plan.target_protein != null ||
    plan.target_carbs != null ||
    plan.target_fat != null;

  if (!hasAny) {
    return (
      <>
        <CollectionCardMetaText>—</CollectionCardMetaText>
        <CollectionCardMetaSep />
        <CollectionCardMetaText>
          <CollectionCardMetaValue>{mealCount}</CollectionCardMetaValue> meals/day
        </CollectionCardMetaText>
      </>
    );
  }

  const kcalStr =
    calories > 0 || plan.target_calories != null
      ? `${calories.toLocaleString("en-US")} kcal`
      : "— kcal";

  return (
    <>
      <CollectionCardMetaText>
        <CollectionCardMetaValue>{kcalStr}</CollectionCardMetaValue>
        <CollectionCardMetaSep />
        P{" "}
        {protein > 0 || plan.target_protein != null ? (
          <CollectionCardMetaValue>{protein}g</CollectionCardMetaValue>
        ) : (
          "—"
        )}
        <CollectionCardMetaSep />
        C{" "}
        {carbs > 0 || plan.target_carbs != null ? (
          <CollectionCardMetaValue>{carbs}g</CollectionCardMetaValue>
        ) : (
          "—"
        )}
        <CollectionCardMetaSep />
        F{" "}
        {fat > 0 || plan.target_fat != null ? (
          <CollectionCardMetaValue>{fat}g</CollectionCardMetaValue>
        ) : (
          "—"
        )}
      </CollectionCardMetaText>
      <CollectionCardMetaSep />
      <CollectionCardMetaText>
        <CollectionCardMetaValue>{mealCount}</CollectionCardMetaValue> meals/day
      </CollectionCardMetaText>
    </>
  );
}

export interface CoachMealPlansPanelProps {
  onMetaChange?: (meta: Partial<NutritionWorkspaceMeta>) => void;
}

export function CoachMealPlansPanel({ onMetaChange }: CoachMealPlansPanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] =
    useState<MealPlan | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const fetchFn = useCallback(async () => {
    if (!user?.id) return { mealPlans: [] as MealPlanWithStats[] };
    return fetchCoachMealPlansWithStats(user.id);
  }, [user?.id]);

  const { data, loading, refetch } = usePageData(fetchFn, [user?.id]);
  const mealPlans: MealPlanWithStats[] = data?.mealPlans ?? [];

  React.useEffect(() => {
    onMetaChange?.({ mealPlanCount: mealPlans.length });
  }, [mealPlans.length, onMetaChange]);

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;
    try {
      await MealPlanService.deleteMealPlan(id);
      refetch();
      addToast({
        title: "Deleted",
        description: "Meal plan deleted successfully.",
        variant: "success",
      });
    } catch (err) {
      console.error("Error deleting meal plan:", err);
      addToast({
        title: "Error",
        description: "Error deleting meal plan. Please try again.",
        variant: "destructive",
      });
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
        addToast({
          title: "Error",
          description: "Error loading clients. Please try again.",
          variant: "destructive",
        });
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

  const filteredPlans = useMemo(() => {
    let list = mealPlans;
    if (statusFilter === "active") {
      list = list.filter((p) => p.is_active);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (plan) =>
        plan.name.toLowerCase().includes(q) ||
        (plan.notes ?? plan.description ?? "").toLowerCase().includes(q),
    );
  }, [mealPlans, searchQuery, statusFilter]);

  const activeCount = mealPlans.filter((p) => p.is_active).length;
  const showActiveChip = mealPlans.some((p) => !p.is_active);

  return (
    <>
      <div className={styles.searchRow}>
        <label className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search meal plans…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.chip} ${statusFilter === "all" ? styles.chipOn : styles.chipOff}`}
          onClick={() => setStatusFilter("all")}
        >
          All {mealPlans.length}
        </button>
        {showActiveChip ? (
          <button
            type="button"
            className={`${styles.chip} ${statusFilter === "active" ? styles.chipOn : styles.chipOff}`}
            onClick={() => setStatusFilter("active")}
          >
            Active {activeCount}
          </button>
        ) : null}
      </div>

      {loading && mealPlans.length === 0 ? (
        <div className={styles.loadingStack} aria-busy="true">
          <div className="fc-skeleton h-[88px] rounded-xl" />
          <div className="fc-skeleton h-[88px] rounded-xl" />
          <div className="fc-skeleton h-[88px] rounded-xl" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery ? "No meal plans match your search." : "No meal plans yet."}
        </p>
      ) : (
        <CollectionCardStack>
          {filteredPlans.map((plan) => {
            const mealCount = plan.meal_count ?? 0;
            const clientCount = plan.usage_count ?? 0;
            const preview = plan.assignedPreview;
            const hue = programCollectionHue(plan.id);

            return (
              <CollectionCard
                key={plan.id}
                hue={hue}
                name={plan.name}
                status={plan.is_active ? "active" : "inactive"}
                statusLabel={plan.is_active ? "Active" : "Draft"}
                meta={<PlanMeta plan={plan} mealCount={mealCount} />}
                rightStat={
                  <CollectionCardAssignedStat
                    count={clientCount}
                    avatars={
                      clientCount > 0 && preview?.initials?.length
                        ? preview.initials.slice(0, 3).map((initials, i) => ({
                            initials,
                            background: avatarHueByIndex(i),
                          }))
                        : undefined
                    }
                  />
                }
                actions={
                  <>
                    <CollectionCardIconAction
                      icon={<Eye className="h-[15px] w-[15px]" />}
                      label="View meal plan"
                      onClick={() =>
                        router.push(`/coach/nutrition/meal-plans/${plan.id}`)
                      }
                    />
                    <CollectionCardIconAction
                      icon={<UserPlus className="h-[15px] w-[15px]" />}
                      label="Assign meal plan"
                      onClick={() => void handleAssignMealPlan(plan)}
                    />
                    <CollectionCardIconAction
                      icon={<Edit className="h-[15px] w-[15px]" />}
                      label="Edit meal plan"
                      onClick={() => setEditingPlan(plan)}
                    />
                    <CollectionCardIconAction
                      icon={<Trash2 className="h-[15px] w-[15px]" />}
                      label="Delete meal plan"
                      variant="danger"
                      onClick={() => void handleDeleteMealPlan(plan.id)}
                    />
                  </>
                }
              />
            );
          })}
        </CollectionCardStack>
      )}

      {showAssignModal && selectedMealPlanForAssignment ? (
        <MealPlanAssignmentModal
          mealPlan={selectedMealPlanForAssignment}
          clients={clients}
          selectedClients={selectedClients}
          onSelectedClientsChange={setSelectedClients}
          onClose={handleAssignmentComplete}
          onComplete={handleAssignmentComplete}
        />
      ) : null}

      <MealPlanMetadataModal
        isOpen={editingPlan != null}
        onClose={() => setEditingPlan(null)}
        mode="edit"
        mealPlan={editingPlan}
        onUpdated={() => {
          setEditingPlan(null);
          refetch();
          addToast({
            title: "Saved",
            description: "Meal plan updated.",
            variant: "success",
          });
        }}
      />
    </>
  );
}

export function useNutritionWorkspaceMeta(coachId: string | undefined) {
  const fetchMeta = useCallback(async () => {
    if (!coachId) {
      return {
        mealPlanCount: 0,
        activeAssignmentCount: 0,
        foodCount: 0,
      };
    }
    return fetchNutritionWorkspaceMeta(coachId);
  }, [coachId]);

  return usePageData(fetchMeta, [coachId]);
}
