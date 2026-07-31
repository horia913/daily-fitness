"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchDashboardPageData } from "@/lib/clientDashboardPageData";
import { HomeGreetingHeader } from "@/components/client/home/HomeGreetingHeader";
import { HomeScoreHero } from "@/components/client/home/HomeScoreHero";
import { HomeCheckInCta } from "@/components/client/home/HomeCheckInCta";
import { HomeTodayTrainingCard } from "@/components/client/home/HomeTodayTrainingCard";
import { HomeFuelGlance } from "@/components/client/home/HomeFuelGlance";
import { HomeAdherenceCalendars } from "@/components/client/home/HomeAdherenceCalendars";
import { fetchHomeFuelGlance } from "@/components/client/home/fetchHomeFuelGlance";
import styles from "@/components/client/home/homePage.module.css";

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const todayDateString = new Date().toISOString().split("T")[0];

  const dashboardQuery = useQuery({
    queryKey: ["client-dashboard", user?.id],
    queryFn: () => fetchDashboardPageData(user!.id),
    enabled: !!user?.id,
  });

  const fuelQuery = useQuery({
    queryKey: ["home-fuel-glance", user?.id, todayDateString],
    queryFn: () => fetchHomeFuelGlance(user!.id),
    enabled: !!user?.id,
  });

  const dashboardData = dashboardQuery.data?.dashboard ?? null;
  const athleteScore = dashboardQuery.data?.athleteScore ?? null;
  const hasCheckInToday = dashboardQuery.data?.hasCheckInToday ?? null;
  const scoreError = dashboardQuery.data?.scoreError ?? null;
  const dailyDoneToday = hasCheckInToday === true;
  const fuelGlance = fuelQuery.data ?? null;

  const userName = dashboardData?.firstName || profile?.first_name || "there";
  const todaysWorkout = dashboardData?.todaysWorkout;
  const programProgress = dashboardData?.programProgress;
  const hasActiveProgram = programProgress != null;

  const loading = dashboardQuery.isLoading;
  const error = dashboardQuery.isError;

  if (error) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="max-w-lg lg:max-w-3xl w-full !p-0">
            <div className={styles.page}>
              <div className={styles.errorBlock}>
                <p className={styles.errorText}>
                  Couldn&apos;t load this page. Please try again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void dashboardQuery.refetch();
                    void fuelQuery.refetch();
                  }}
                  className="btn-action"
                >
                  Retry
                </button>
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg lg:max-w-3xl w-full !p-0">
          <div className={styles.page}>
            {loading ? (
              <div className={styles.loadingStack}>
                <div className="min-w-0 space-y-2">
                  <Skeleton variant="text" className="h-3 w-36" />
                  <Skeleton variant="text" className="h-7 w-48" />
                  <Skeleton variant="text" className="h-3 w-40" />
                </div>
                <div className="flex justify-center py-2">
                  <Skeleton variant="circular" className="h-[150px] w-[150px]" />
                </div>
                <Skeleton variant="rectangular" className="h-[54px] w-full rounded-[15px]" />
                <div className="space-y-2">
                  <Skeleton variant="text" className="h-4 w-40" />
                  <Skeleton variant="rectangular" className="h-[88px] w-full rounded-2xl" />
                </div>
              </div>
            ) : (
              <>
                <HomeGreetingHeader
                  firstName={userName}
                  todaysWorkout={todaysWorkout}
                  programProgress={programProgress}
                  hasActiveProgram={hasActiveProgram}
                />

                <HomeScoreHero
                  userId={user?.id ?? null}
                  athleteScore={athleteScore}
                  scoreError={scoreError}
                  chipState={dashboardData?.athleteScoreChipState}
                />

                <HomeCheckInCta dailyDoneToday={dailyDoneToday} />

                <HomeTodayTrainingCard
                  todaysWorkout={todaysWorkout}
                  programProgress={programProgress}
                  activeProgramPauseStatus={
                    dashboardData?.activeProgramPauseStatus
                  }
                />

                {user?.id ? (
                  <HomeAdherenceCalendars clientId={user.id} />
                ) : null}

                {fuelGlance ? <HomeFuelGlance data={fuelGlance} /> : null}
              </>
            )}
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
