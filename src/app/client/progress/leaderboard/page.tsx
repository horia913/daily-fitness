"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClientLeaderboardPageBody,
  type MetricType,
} from "@/components/client/progress/ClientLeaderboardPageBody";
import {
  getLeaderboard,
  getLeaderboardBySex,
  getCurrentChampions,
  resolveLeaderboardExerciseId,
  updateLeaderboardVisibility,
  type LeaderboardEntry,
  type LeaderboardVisibility,
  type LeaderboardType,
  type TimeWindow,
} from "@/lib/leaderboardService";
import { supabase } from "@/lib/supabase";

function normalizeLeaderboardVisibility(raw: unknown): LeaderboardVisibility {
  const v = String(raw ?? "public").toLowerCase();
  if (v === "anonymous" || v === "hidden") return v;
  return "public";
}

function LeaderboardPageContent() {
  const { user } = useAuth();

  /** `?from=workouts` — entered from the Train area, so back returns there. */
  const [backHref, setBackHref] = useState("/client/me");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "workouts") {
      setBackHref("/client/workouts");
    }
  }, []);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("this_month");
  const [activeExercise, setActiveExercise] = useState<string>("Bench Press");
  const [metricType, setMetricType] = useState<MetricType>("1rm");
  const [sexFilter, setSexFilter] = useState<"all" | "M" | "F">("all");
  const [customExerciseId, setCustomExerciseId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState<string | null>(
    null,
  );
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<
    Array<{ id: string; name: string; category?: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [champions, setChampions] = useState<
    Array<{ name?: string; category?: string; score?: number | string }>
  >([]);
  const [visibility, setVisibility] =
    useState<LeaderboardVisibility>("public");
  const [savingVisibility, setSavingVisibility] = useState(false);

  const loadVisibility = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("leaderboard_visibility")
      .eq("id", user.id)
      .maybeSingle();
    setVisibility(
      normalizeLeaderboardVisibility(data?.leaderboard_visibility),
    );
  }, [user?.id]);

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let leaderboardType: LeaderboardType;
      let effectiveTimeWindow: TimeWindow;

      if (metricType === "tonnage") {
        effectiveTimeWindow = timeWindow;
        if (timeWindow === "this_week") {
          leaderboardType = "tonnage_week";
        } else if (timeWindow === "this_month") {
          leaderboardType = "tonnage_month";
        } else {
          leaderboardType = "tonnage_all_time";
        }
      } else {
        leaderboardType = `pr_${metricType}` as LeaderboardType;
        effectiveTimeWindow = "all_time";
      }

      const exerciseId = customExerciseId
        ? customExerciseId
        : await resolveLeaderboardExerciseId(activeExercise);

      if (!exerciseId && metricType !== "tonnage") {
        setLeaderboardData([]);
        return;
      }

      const data =
        sexFilter === "all"
          ? await getLeaderboard(
              leaderboardType,
              exerciseId,
              effectiveTimeWindow,
            )
          : await getLeaderboardBySex(
              leaderboardType,
              exerciseId,
              effectiveTimeWindow,
              sexFilter,
            );
      setLeaderboardData(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load leaderboard",
      );
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  }, [timeWindow, activeExercise, metricType, customExerciseId, sexFilter]);

  useEffect(() => {
    void loadVisibility();
  }, [loadVisibility]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadLeaderboardData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadLeaderboardData]);

  useEffect(() => {
    getCurrentChampions(5)
      .then(setChampions)
      .catch(() => setChampions([]));
  }, []);

  const handleExerciseSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setExerciseSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("exercises")
      .select("id, name, category")
      .ilike("name", `%${query}%`)
      .limit(10);

    setExerciseSearchResults(data || []);
  };

  const selectCustomExercise = (exercise: {
    id: string;
    name: string;
    category?: string;
  }) => {
    setCustomExerciseId(exercise.id);
    setCustomExerciseName(exercise.name);
    setShowExerciseSearch(false);
    setSearchQuery("");
    setExerciseSearchResults([]);
  };

  const clearCustomExercise = () => {
    setCustomExerciseId(null);
    setCustomExerciseName(null);
  };

  const onRetry = () => {
    setLoadError(null);
    void loadLeaderboardData();
  };

  const onVisibilityChange = async (next: LeaderboardVisibility) => {
    if (!user?.id || next === visibility) return;
    setSavingVisibility(true);
    try {
      const ok = await updateLeaderboardVisibility(user.id, next);
      if (!ok) return;
      setVisibility(next);
      await loadLeaderboardData();
      getCurrentChampions(5)
        .then(setChampions)
        .catch(() => setChampions([]));
    } finally {
      setSavingVisibility(false);
    }
  };

  return (
    <ClientLeaderboardPageBody
      userId={user?.id}
      leaderboardData={leaderboardData}
      champions={champions}
      loading={loading}
      loadError={loadError}
      onRetry={onRetry}
      timeWindow={timeWindow}
      setTimeWindow={setTimeWindow}
      sexFilter={sexFilter}
      setSexFilter={setSexFilter}
      metricType={metricType}
      setMetricType={setMetricType}
      activeExercise={activeExercise}
      setActiveExercise={setActiveExercise}
      customExerciseId={customExerciseId}
      customExerciseName={customExerciseName}
      clearCustomExercise={clearCustomExercise}
      showExerciseSearch={showExerciseSearch}
      setShowExerciseSearch={setShowExerciseSearch}
      exerciseSearchResults={exerciseSearchResults}
      searchQuery={searchQuery}
      handleExerciseSearch={handleExerciseSearch}
      selectCustomExercise={selectCustomExercise}
      backHref={backHref}
      visibility={visibility}
      savingVisibility={savingVisibility}
      onVisibilityChange={(next) => void onVisibilityChange(next)}
    />
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <LeaderboardPageContent />
    </ProtectedRoute>
  );
}
