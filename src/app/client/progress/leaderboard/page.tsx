"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ClientLeaderboardPageBody,
  type LiftSet,
  type MetricType,
} from "@/components/client/progress/ClientLeaderboardPageBody";
import {
  getLeaderboard,
  getLeaderboardBySex,
  getCurrentChampions,
  type LeaderboardEntry,
  LeaderboardType,
  TimeWindow,
} from "@/lib/leaderboardService";
import { supabase } from "@/lib/supabase";

function LeaderboardPageContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("this_month");
  const [liftSet, setLiftSet] = useState<LiftSet>("A");
  const [activeExercise, setActiveExercise] = useState<string>("Squat");
  const [metricType, setMetricType] = useState<MetricType>("1rm");
  const [sexFilter, setSexFilter] = useState<"all" | "M" | "F">("all");
  const [customExerciseId, setCustomExerciseId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState<string | null>(
    null
  );
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<any[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [champions, setChampions] = useState<any[]>([]);

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

      let exerciseId: string | undefined;
      if (customExerciseId) {
        exerciseId = customExerciseId;
      } else {
        const { data: exactMatch } = await supabase
          .from("exercises")
          .select("id")
          .ilike("name", activeExercise)
          .limit(1)
          .maybeSingle();

        if (exactMatch?.id) {
          exerciseId = exactMatch.id;
        } else {
          const { data: fuzzyMatch } = await supabase
            .from("exercises")
            .select("id")
            .ilike("name", `%${activeExercise}%`)
            .limit(1)
            .maybeSingle();
          exerciseId = fuzzyMatch?.id;
        }
      }

      if (!exerciseId && metricType !== "tonnage") {
        setLeaderboardData([]);
        return;
      }

      const data =
        sexFilter === "all"
          ? await getLeaderboard(
              leaderboardType,
              exerciseId,
              effectiveTimeWindow
            )
          : await getLeaderboardBySex(
              leaderboardType,
              exerciseId,
              effectiveTimeWindow,
              sexFilter
            );
      setLeaderboardData(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load leaderboard"
      );
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  }, [timeWindow, activeExercise, metricType, customExerciseId, sexFilter]);

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
    getCurrentChampions(5).then(setChampions).catch(() => setChampions([]));
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

  const selectCustomExercise = (exercise: any) => {
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
    loadLeaderboardData();
  };

  return (
    <AnimatedBackground>
      {performanceSettings?.floatingParticles && <FloatingParticles />}
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
        liftSet={liftSet}
        setLiftSet={setLiftSet}
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
      />
    </AnimatedBackground>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardPageContent />
    </ProtectedRoute>
  );
}
