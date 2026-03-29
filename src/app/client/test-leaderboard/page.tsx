"use client";

import React, { useMemo, useState } from "react";
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
import type { TimeWindow } from "@/lib/leaderboardService";
import {
  buildMockLeaderboardEntries,
  mockLeaderboardChampions,
} from "@/lib/testLeaderboardMockData";

const TEST_SELF_ID = "test-leaderboard-self";

function TestDataBadge() {
  return (
    <span className="pointer-events-none rounded-md border border-cyan-500/40 bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 backdrop-blur-sm">
      Test data
    </span>
  );
}

function TestLeaderboardContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const effectiveUserId = user?.id ?? TEST_SELF_ID;

  const [timeWindow, setTimeWindow] = useState<TimeWindow>("this_month");
  const [liftSet, setLiftSet] = useState<LiftSet>("A");
  const [activeExercise, setActiveExercise] = useState("Squat");
  const [metricType, setMetricType] = useState<MetricType>("1rm");
  const [sexFilter, setSexFilter] = useState<"all" | "M" | "F">("all");
  const [customExerciseId, setCustomExerciseId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState<string | null>(
    null
  );
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const leaderboardData = useMemo(
    () =>
      buildMockLeaderboardEntries(
        timeWindow,
        metricType,
        effectiveUserId,
        sexFilter
      ),
    [timeWindow, metricType, effectiveUserId, sexFilter]
  );

  const champions = useMemo(() => mockLeaderboardChampions(), []);

  const handleExerciseSearch = (query: string) => {
    setSearchQuery(query);
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
  };

  const clearCustomExercise = () => {
    setCustomExerciseId(null);
    setCustomExerciseName(null);
  };

  return (
    <AnimatedBackground>
      {performanceSettings?.floatingParticles && <FloatingParticles />}
      <ClientLeaderboardPageBody
        userId={effectiveUserId}
        leaderboardData={leaderboardData}
        champions={champions}
        loading={false}
        loadError={null}
        onRetry={() => {}}
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
        exerciseSearchResults={[]}
        searchQuery={searchQuery}
        handleExerciseSearch={handleExerciseSearch}
        selectCustomExercise={selectCustomExercise}
        backHref="/client/progress"
        cornerBadge={<TestDataBadge />}
        denseLayout
      />
    </AnimatedBackground>
  );
}

export default function TestLeaderboardPage() {
  return (
    <ProtectedRoute>
      <TestLeaderboardContent />
    </ProtectedRoute>
  );
}
