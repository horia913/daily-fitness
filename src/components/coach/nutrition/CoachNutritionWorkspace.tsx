"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast-provider";
import {
  CoachMealPlansPanel,
  useNutritionWorkspaceMeta,
} from "./CoachMealPlansPanel";
import { CoachAssignmentsPanel } from "./CoachAssignmentsPanel";
import { CoachFoodDatabasePanel } from "./CoachFoodDatabasePanel";
import { MealPlanMetadataModal } from "./MealPlanMetadataModal";
import type { MealPlan } from "@/lib/mealPlanService";
import styles from "./coachNutritionWorkspace.module.css";

export type NutritionTab = "plans" | "assignments" | "foods";

function parseTab(value: string | null): NutritionTab {
  if (value === "assignments" || value === "foods") return value;
  return "plans";
}

export function CoachNutritionWorkspace() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const activeTab = parseTab(searchParams.get("tab"));
  const createParamHandled = useRef(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: meta, loading: metaLoading } = useNutritionWorkspaceMeta(user?.id);
  const [planCountOverride, setPlanCountOverride] = useState<number | null>(null);
  const [assignmentCountOverride, setAssignmentCountOverride] = useState<number | null>(
    null,
  );
  const [foodCountOverride, setFoodCountOverride] = useState<number | null>(null);

  const mealPlanCount = planCountOverride ?? meta?.mealPlanCount ?? 0;
  const assignmentCount =
    assignmentCountOverride ?? meta?.activeAssignmentCount ?? 0;
  const foodCount = foodCountOverride ?? meta?.foodCount ?? 0;

  const subParts = useMemo(() => {
    const parts: string[] = [];
    if (mealPlanCount > 0 || !metaLoading) {
      parts.push(`${mealPlanCount} meal plan${mealPlanCount === 1 ? "" : "s"}`);
    }
    if (assignmentCount > 0 || !metaLoading) {
      parts.push(
        `${assignmentCount} active assignment${assignmentCount === 1 ? "" : "s"}`,
      );
    }
    if (foodCount > 0 || !metaLoading) {
      parts.push(`${foodCount} food${foodCount === 1 ? "" : "s"}`);
    }
    return parts;
  }, [mealPlanCount, assignmentCount, foodCount, metaLoading]);

  const setTab = useCallback(
    (tab: NutritionTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "plans") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `/coach/nutrition?${qs}` : "/coach/nutrition", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const onMetaChange = useCallback(
    (partial: {
      mealPlanCount?: number;
      activeAssignmentCount?: number;
      foodCount?: number;
    }) => {
      if (partial.mealPlanCount != null) setPlanCountOverride(partial.mealPlanCount);
      if (partial.activeAssignmentCount != null) {
        setAssignmentCountOverride(partial.activeAssignmentCount);
      }
      if (partial.foodCount != null) setFoodCountOverride(partial.foodCount);
    },
    [],
  );

  useEffect(() => {
    if (createParamHandled.current) return;
    if (searchParams.get("create") !== "1") return;
    createParamHandled.current = true;
    setShowCreateModal(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    const qs = params.toString();
    router.replace(qs ? `/coach/nutrition?${qs}` : "/coach/nutrition", {
      scroll: false,
    });
  }, [router, searchParams]);

  const handleMealPlanCreated = useCallback(
    (plan: MealPlan) => {
      setShowCreateModal(false);
      addToast({
        title: "Created",
        description: `${plan.name} created.`,
        variant: "success",
      });
      router.push(`/coach/nutrition/meal-plans/${plan.id}`);
    },
    [addToast, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div className="min-w-0">
          <h1 className={styles.h1}>Nutrition</h1>
          {subParts.length > 0 ? (
            <p className={styles.sub}>{subParts.join(" · ")}</p>
          ) : null}
        </div>
        <div className={styles.headerActions}>
          <Link href="/coach/nutrition/generator" className={styles.ghostBtn}>
            ⚡ Generator
          </Link>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={() => setShowCreateModal(true)}
          >
            ＋ Create meal plan
          </button>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Nutrition workspace">
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "plans" ? styles.tabActive : ""}`}
          onClick={() => setTab("plans")}
        >
          Meal plans
          <span className={styles.tabCount}>{mealPlanCount}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "assignments" ? styles.tabActive : ""}`}
          onClick={() => setTab("assignments")}
        >
          Assignments
          <span className={styles.tabCount}>{assignmentCount}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "foods" ? styles.tabActive : ""}`}
          onClick={() => setTab("foods")}
        >
          Food database
          <span className={styles.tabCount}>{foodCount}</span>
        </button>
      </nav>

      {activeTab === "plans" ? (
        <CoachMealPlansPanel onMetaChange={onMetaChange} />
      ) : null}

      {activeTab === "assignments" ? (
        <CoachAssignmentsPanel onMetaChange={onMetaChange} />
      ) : null}

      {activeTab === "foods" ? (
        <CoachFoodDatabasePanel onMetaChange={onMetaChange} />
      ) : null}

      <MealPlanMetadataModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        onCreated={handleMealPlanCreated}
      />
    </div>
  );
}
