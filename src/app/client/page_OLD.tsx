"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Play,
  Dumbbell,
  Apple,
  MessageCircle,
  Flame,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌞" };
  return { text: "Good evening", emoji: "🌙" };
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { isDark, getSemanticColor } = useTheme();

  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [streak, setStreak] = useState(8);
  const [weeklyProgress, setWeeklyProgress] = useState({ current: 3, goal: 4 });

  const greeting = getTimeBasedGreeting();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoadingWorkout(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch today's workout assignment
      const { data: workoutAssignment } = await supabase
        .from("workout_assignments")
        .select(
          `
          id,
          workout_template_id,
          scheduled_date,
          status
        `
        )
        .eq("client_id", user.id)
        .eq("scheduled_date", today)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      if (workoutAssignment?.workout_template_id) {
        const { data: template } = await supabase
          .from("workout_templates")
          .select("id, name, description, estimated_duration")
          .eq("id", workoutAssignment.workout_template_id)
          .single();

        if (template) {
          const { WorkoutBlockService } = await import(
            "@/lib/workoutBlockService"
          );
          const blocks = await WorkoutBlockService.getWorkoutBlocks(
            template.id
          );
          const exerciseCount = blocks.reduce(
            (sum, block) => sum + (block.exercises?.length || 0),
            0
          );

          setTodaysWorkout({
            id: workoutAssignment.id,
            templateId: template.id,
            name: template.name,
            exercises: exerciseCount,
            estimatedDuration: template.estimated_duration || 45,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const weeklyProgressPercent =
    (weeklyProgress.current / weeklyProgress.goal) * 100;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <FloatingParticles enabled count={15} />

        <div className="min-h-screen pb-24 pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
            {/* Hero Greeting Section */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: getSemanticColor("energy").gradient,
                    boxShadow: `0 8px 24px ${
                      getSemanticColor("energy").primary
                    }40`,
                  }}
                >
                  <span className="text-4xl">{greeting.emoji}</span>
                </div>

                <div className="flex-1">
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{
                      color: isDark ? "#fff" : "#1A1A1A",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {greeting.text}! 👋
                  </h1>
                  <div className="flex items-center gap-2">
                    <AnimatedNumber
                      value={streak}
                      size="h2"
                      weight="bold"
                      color={getSemanticColor("energy").primary}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                        fontWeight: 500,
                      }}
                    >
                      day streak • Let's keep it going! 🔥
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Today's Workout Card */}
            <GlassCard elevation={2} className="p-6">
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <Dumbbell className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Today's Workout
                    </h2>
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      {loadingWorkout
                        ? "Loading..."
                        : todaysWorkout?.name || "Not assigned yet"}
                    </p>
                  </div>
                </div>
              </div>

              {loadingWorkout ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : todaysWorkout ? (
                <>
                  <div className="flex gap-3 mb-4">
                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        background: isDark
                          ? "rgba(66,153,225,0.2)"
                          : "rgba(66,153,225,0.1)",
                        color: "#4299E1",
                      }}
                    >
                      {todaysWorkout.exercises} exercises
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        background: isDark
                          ? "rgba(139,92,246,0.2)"
                          : "rgba(139,92,246,0.1)",
                        color: "#8B5CF6",
                      }}
                    >
                      ~{todaysWorkout.estimatedDuration} min
                    </div>
                  </div>

                  <div
                    className="h-1 mb-4 rounded-full"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                      borderLeft: `4px solid ${
                        getSemanticColor("trust").primary
                      }`,
                    }}
                  />

                  <Link href={`/client/workouts/${todaysWorkout.id}/start`}>
                    <Button variant="energy" size="xl" className="w-full">
                      <Play className="w-6 h-6 mr-2" />
                      Start Workout
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="mb-6">
                    <Dumbbell
                      className="w-24 h-24 mx-auto mb-4 animate-pulse"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.1)",
                      }}
                    />
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Your workout awaits!
                    </h3>
                    <p
                      className="text-sm mb-6"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Your coach will assign today's session soon
                    </p>
                  </div>

                  <Link href="/client/workouts">
                    <Button variant="trust" size="lg" className="mb-3">
                      Browse Workout Library
                    </Button>
                  </Link>

                  <Link href="/client/workouts">
                    <Button variant="ghost" size="default">
                      View Past Workouts
                    </Button>
                  </Link>
                </div>
              )}
            </GlassCard>

            {/* Weekly Progress Ring */}
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-lg font-bold mb-4"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Weekly Progress
              </h3>

              <div className="flex items-center justify-center mb-4">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke={
                        isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
                      }
                      strokeWidth="12"
                      fill="none"
                    />
                    <defs>
                      <linearGradient
                        id="progressGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#7CB342" />
                        <stop offset="100%" stopColor="#558B2F" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#progressGradient)"
                      strokeWidth="12"
                      strokeDasharray={`${
                        (weeklyProgressPercent / 100) * 440
                      } 440`}
                      strokeLinecap="round"
                      fill="none"
                      style={{ transition: "stroke-dasharray 0.8s ease-out" }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatedNumber
                      value={weeklyProgress.current}
                      size="hero"
                      weight="heavy"
                      color={getSemanticColor("success").primary}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      of {weeklyProgress.goal} this week
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="text-center text-sm font-semibold"
                style={{
                  color:
                    weeklyProgressPercent >= 100
                      ? getSemanticColor("success").primary
                      : weeklyProgressPercent >= 75
                      ? getSemanticColor("warning").primary
                      : getSemanticColor("trust").primary,
                }}
              >
                {weeklyProgressPercent >= 100
                  ? "🎉 Goal achieved! Amazing work!"
                  : `${Math.round(
                      weeklyProgressPercent
                    )}% complete - keep pushing!`}
              </div>
            </GlassCard>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/client/nutrition">
                <GlassCard
                  pressable
                  elevation={1}
                  className="p-5 h-full hover:shadow-xl transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("success").primary
                      }30`,
                    }}
                  >
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <h4
                    className="text-base font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Nutrition
                  </h4>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Track your meals
                  </p>
                </GlassCard>
              </Link>

              <Link href="/client/progress">
                <GlassCard
                  pressable
                  elevation={1}
                  className="p-5 h-full hover:shadow-xl transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h4
                    className="text-base font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Progress
                  </h4>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    View your stats
                  </p>
                </GlassCard>
              </Link>

              <Link href="/client/goals">
                <GlassCard
                  pressable
                  elevation={1}
                  className="p-5 h-full hover:shadow-xl transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("warning").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("warning").primary
                      }30`,
                    }}
                  >
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h4
                    className="text-base font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Goals
                  </h4>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Set & track goals
                  </p>
                </GlassCard>
              </Link>

              <Link href="/client/messages">
                <GlassCard
                  pressable
                  elevation={1}
                  className="p-5 h-full hover:shadow-xl transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background:
                        "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)",
                      boxShadow: "0 4px 12px rgba(155,89,182,0.3)",
                    }}
                  >
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h4
                    className="text-base font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Messages
                  </h4>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Chat with coach
                  </p>
                </GlassCard>
              </Link>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
