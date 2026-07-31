"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import { MealPlanService, type MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, type Client } from "@/lib/database";
import { useToast } from "@/components/ui/toast-provider";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  CollectionCard,
  CollectionCardIconAction,
  CollectionCardMetaSep,
  CollectionCardMetaText,
  CollectionCardMetaValue,
  CollectionCardStack,
} from "@/components/ui/CollectionCard";
import cardStyles from "@/components/ui/collectionCard.module.css";
import { programCollectionHue } from "@/lib/programs/programListDisplayUtils";
import { cn } from "@/lib/utils";
import {
  fetchCoachAssignments,
  type CoachAssignmentRow,
} from "./fetchCoachAssignments";
import type { NutritionWorkspaceMeta } from "./fetchNutritionWorkspaceData";
import styles from "./coachNutritionWorkspace.module.css";

type StatusFilter = "active" | "all";

function clientDisplayName(client: CoachAssignmentRow["client"]): string {
  if (!client) return "Unknown client";
  const name = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return name || "Unknown client";
}

function formatStartDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function complianceTierClass(pct: number | null): string {
  if (pct === null) return styles.complianceNone;
  if (pct >= 80) return styles.complianceGood;
  if (pct >= 50) return styles.complianceWarn;
  return styles.complianceBad;
}

function AssignmentMeta({ row }: { row: CoachAssignmentRow }) {
  const planName = row.meal_plan?.name ?? "Unknown plan";
  const label = row.label?.trim();

  return (
    <>
      <CollectionCardMetaText>{planName}</CollectionCardMetaText>
      <CollectionCardMetaSep />
      <CollectionCardMetaText>
        Started{" "}
        <CollectionCardMetaValue>{formatStartDate(row.start_date)}</CollectionCardMetaValue>
      </CollectionCardMetaText>
      {label ? (
        <>
          <CollectionCardMetaSep />
          <CollectionCardMetaText>
            Label <CollectionCardMetaValue>{label}</CollectionCardMetaValue>
          </CollectionCardMetaText>
        </>
      ) : null}
    </>
  );
}

function ComplianceRightStat({ row }: { row: CoachAssignmentRow }) {
  const pct = row.compliancePct30d;
  const tierClass = complianceTierClass(pct);

  return (
    <div className={cardStyles.acount}>
      <span
        className={cn(
          cardStyles.acountN,
          tierClass,
          pct === null && cardStyles.acountZero,
        )}
      >
        {pct === null ? "—" : `${pct}%`}
      </span>
      <span className={cardStyles.acountL}>30d</span>
    </div>
  );
}

export interface CoachAssignmentsPanelProps {
  onMetaChange?: (meta: Partial<NutritionWorkspaceMeta>) => void;
}

export function CoachAssignmentsPanel({ onMetaChange }: CoachAssignmentsPanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [planPickerLoading, setPlanPickerLoading] = useState(false);
  const [pickerPlans, setPickerPlans] = useState<MealPlan[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] =
    useState<MealPlan | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const fetchFn = useCallback(async () => {
    if (!user?.id) {
      return { assignments: [], activeCount: 0, totalCount: 0 };
    }
    return fetchCoachAssignments(user.id);
  }, [user?.id]);

  const { data, loading, error, refetch } = usePageData(fetchFn, [user?.id]);
  const assignments = data?.assignments ?? [];
  const activeCount = data?.activeCount ?? 0;
  const totalCount = data?.totalCount ?? 0;

  React.useEffect(() => {
    onMetaChange?.({ activeAssignmentCount: activeCount });
  }, [activeCount, onMetaChange]);

  const handleUnassign = async (assignmentId: string) => {
    if (
      !confirm(
        "Deactivate this plan assignment? The client will no longer see it, but history is preserved.",
      )
    ) {
      return;
    }
    try {
      await MealPlanService.deactivateAssignment(assignmentId);
      refetch();
      addToast({ title: "Plan deactivated", variant: "success" });
    } catch (err) {
      console.error("Error deactivating assignment:", err);
      addToast({
        title: "Couldn't deactivate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openAssignWithPlan = async (mealPlan: MealPlan) => {
    setSelectedMealPlanForAssignment(mealPlan);
    setSelectedClients([]);
    if (user?.id) {
      try {
        const coachClients = await DatabaseService.getClients(user.id);
        setClients(coachClients);
      } catch (err) {
        console.error("Error loading clients:", err);
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

  const handleAssignPlanClick = async () => {
    if (!user?.id) return;
    setPlanPickerLoading(true);
    setShowPlanPicker(true);
    try {
      const plans = await MealPlanService.getMealPlans(user.id);
      setPickerPlans(plans);
    } catch (err) {
      console.error("Error loading meal plans:", err);
      setShowPlanPicker(false);
      addToast({
        title: "Error",
        description: "Could not load meal plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPlanPickerLoading(false);
    }
  };

  const handlePlanPicked = (plan: MealPlan) => {
    setShowPlanPicker(false);
    void openAssignWithPlan(plan);
  };

  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedMealPlanForAssignment(null);
    setSelectedClients([]);
    refetch();
  };

  const filteredAssignments = useMemo(() => {
    let list = assignments;
    if (statusFilter === "active") {
      list = list.filter((a) => a.is_active);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((row) => {
      const clientName = clientDisplayName(row.client).toLowerCase();
      const planName = (row.meal_plan?.name ?? "").toLowerCase();
      return clientName.includes(q) || planName.includes(q);
    });
  }, [assignments, searchQuery, statusFilter]);

  if (error && !loading && assignments.length === 0) {
    return (
      <div className={styles.errorBlock}>
        <p className={styles.errorText}>{error}</p>
        <button type="button" className={styles.ghostBtn} onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.assignHeader}>
        <p className={styles.tabSummary}>
          {activeCount} active · {totalCount} total
        </p>
        <label className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by client or plan…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.chip} ${statusFilter === "active" ? styles.chipOn : styles.chipOff}`}
          onClick={() => setStatusFilter("active")}
        >
          Active {activeCount}
        </button>
        <button
          type="button"
          className={`${styles.chip} ${statusFilter === "all" ? styles.chipOn : styles.chipOff}`}
          onClick={() => setStatusFilter("all")}
        >
          All {totalCount}
        </button>
        <button
          type="button"
          className={`${styles.ghostBtn} ${styles.assignCta}`}
          onClick={() => void handleAssignPlanClick()}
        >
          ＋ Assign plan
        </button>
      </div>

      {loading && assignments.length === 0 ? (
        <div className={styles.loadingStack} aria-busy="true">
          <div className="fc-skeleton h-[88px] rounded-xl" />
          <div className="fc-skeleton h-[88px] rounded-xl" />
          <div className="fc-skeleton h-[88px] rounded-xl" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <p className={styles.emptyText}>
          {searchQuery
            ? "No assignments match your search."
            : statusFilter === "active"
              ? "No active assignments yet."
              : "No assignments yet."}
        </p>
      ) : (
        <CollectionCardStack>
          {filteredAssignments.map((row) => {
            const name = clientDisplayName(row.client);
            const hue = programCollectionHue(row.id);

            return (
              <CollectionCard
                key={row.id}
                hue={hue}
                name={name}
                status={row.is_active ? "active" : "inactive"}
                meta={<AssignmentMeta row={row} />}
                rightStat={<ComplianceRightStat row={row} />}
                actions={
                  <>
                    <CollectionCardIconAction
                      icon={<Eye className="h-[15px] w-[15px]" />}
                      label="View client"
                      onClick={() =>
                        router.push(`/coach/clients/${row.client_id}`)
                      }
                    />
                    {row.is_active ? (
                      <CollectionCardIconAction
                        icon={<UserMinus className="h-[15px] w-[15px]" />}
                        label="Unassign plan"
                        variant="danger"
                        onClick={() => void handleUnassign(row.id)}
                      />
                    ) : null}
                  </>
                }
              />
            );
          })}
        </CollectionCardStack>
      )}

      <ResponsiveModal
        isOpen={showPlanPicker}
        onClose={() => setShowPlanPicker(false)}
        title="Select meal plan"
        subtitle="Choose a plan to assign to clients"
        maxWidth="md"
      >
        {planPickerLoading ? (
          <p className={styles.emptyText}>Loading plans…</p>
        ) : pickerPlans.length === 0 ? (
          <p className={styles.emptyText}>No meal plans available.</p>
        ) : (
          <ul className={styles.planPickerList}>
            {pickerPlans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  className={styles.planPickerItem}
                  onClick={() => handlePlanPicked(plan)}
                >
                  <span className={styles.planName}>{plan.name}</span>
                  {!plan.is_active ? (
                    <span className={`${styles.pill} ${styles.pillMute}`}>Draft</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </ResponsiveModal>

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
    </>
  );
}
