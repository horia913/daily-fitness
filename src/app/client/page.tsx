"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Dumbbell,
  Apple,
  CheckCircle,
  Trophy,
  MessageCircle,
  Flame,
  Droplets,
  Moon,
  Footprints,
  Calendar,
  TrendingUp,
  Target,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  const [loadingWorkout, setLoadingWorkout] = useState(true);

  useEffect(() => {
    fetchTodaysWorkout();
  }, [user]);

  const fetchTodaysWorkout = async () => {
    if (!user) return;

    try {
      // Check for today's workout assignment
      const today = new Date().toISOString().split("T")[0];
      console.log("🔍 Mobile Debug - Today date:", today);

      // Check for today's workout assignment using correct column names
      console.log(
        "🔍 Mobile Debug - Querying workout_assignments for client_id:",
        user.id
      );
      console.log("🔍 Mobile Debug - Looking for today:", today);

      // First, let's see ALL assignments for this user
      const { data: allAssignments, error: allAssignmentsError } =
        await supabase
          .from("workout_assignments")
          .select(
            `
          id,
          workout_template_id,
          assigned_date,
          scheduled_date,
          status
        `
          )
          .eq("client_id", user.id)
          .order("scheduled_date", { ascending: false });

      console.log(
        "🔍 Mobile Debug - ALL assignments for user:",
        allAssignments,
        allAssignmentsError
      );

      // Now look for today's assignment
      const { data: workoutAssignment, error: workoutError } = await supabase
        .from("workout_assignments")
        .select(
          `
          id,
          workout_template_id,
          assigned_date,
          scheduled_date,
          status
        `
        )
        .eq("client_id", user.id)
        .eq("scheduled_date", today)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      console.log("🔍 Mobile Debug - Workout assignment result:", {
        workoutAssignment,
        workoutError,
      });

      if (workoutError) {
        console.error("Error fetching workout assignment:", workoutError);
        console.log("Trying without date filter...");

        // Try without date filter as fallback - get the most recent assignment
        console.log(
          "🔍 Mobile Debug - Trying fallback query for any assignment..."
        );
        const { data: fallbackWorkout, error: fallbackError } = await supabase
          .from("workout_assignments")
          .select(
            `
            id,
            workout_template_id,
            assigned_date,
            scheduled_date,
            status
          `
          )
          .eq("client_id", user.id)
          .in("status", ["assigned", "active"])
          .order("scheduled_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("🔍 Mobile Debug - Fallback query result:", {
          fallbackWorkout,
          fallbackError,
        });

        if (fallbackError) {
          console.error("Fallback query also failed:", fallbackError);
          setLoadingWorkout(false);
          return;
        }

        if (fallbackWorkout && fallbackWorkout.workout_template_id) {
          console.log("Fallback workout found:", fallbackWorkout);
          const { data: template } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .eq("id", fallbackWorkout.workout_template_id)
            .single();

          if (template) {
            // Get exercise count from workout_blocks using WorkoutBlockService
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

            console.log(
              "🔍 Mobile Debug - Fallback exercises count:",
              exerciseCount
            );

            setTodaysWorkout({
              id: fallbackWorkout.id,
              templateId: template.id,
              name: template.name,
              type: "workout",
              exercises: exerciseCount,
              estimatedDuration: template.estimated_duration || 45,
            });
            setLoadingWorkout(false);
            return;
          }
        }
      }

      // If we found today's assignment, use it
      if (workoutAssignment && workoutAssignment.workout_template_id) {
        console.log(
          "🔍 Mobile Debug - Today assignment found:",
          workoutAssignment
        );
        const { data: template } = await supabase
          .from("workout_templates")
          .select("id, name, description, estimated_duration")
          .eq("id", workoutAssignment.workout_template_id)
          .single();

        if (template) {
          // Get exercise count from workout_blocks using WorkoutBlockService
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

          console.log(
            "🔍 Mobile Debug - Today exercises count:",
            exerciseCount
          );

          setTodaysWorkout({
            id: workoutAssignment.id,
            templateId: template.id,
            name: template.name,
            type: "workout",
            exercises: exerciseCount,
            estimatedDuration: template.estimated_duration || 45,
          });
          setLoadingWorkout(false);
          return;
        }
      }

      // If no assignment for today, check if we have any assignments at all
      if (allAssignments && allAssignments.length > 0) {
        console.log(
          "🔍 Mobile Debug - No assignment for today, but found assignments:",
          allAssignments.length
        );

        // Get the most recent assignment
        const mostRecentAssignment = allAssignments[0];
        console.log(
          "🔍 Mobile Debug - Most recent assignment:",
          mostRecentAssignment
        );

        if (mostRecentAssignment.workout_template_id) {
          console.log(
            "🔍 Mobile Debug - Fetching template for assignment:",
            mostRecentAssignment.workout_template_id
          );
          const { data: template, error: templateError } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .eq("id", mostRecentAssignment.workout_template_id)
            .single();

          console.log(
            "🔍 Mobile Debug - Template result:",
            template,
            templateError
          );

          if (template) {
            // Get exercise count from workout_blocks using WorkoutBlockService
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

            console.log("🔍 Mobile Debug - Exercises count:", exerciseCount);

            console.log(
              "🔍 Mobile Debug - Setting todays workout with template:",
              template
            );
            setTodaysWorkout({
              id: mostRecentAssignment.id,
              templateId: template.id,
              name: template.name,
              type: "workout",
              exercises: exerciseCount,
              estimatedDuration: template.estimated_duration || 45,
            });
            setLoadingWorkout(false);
            return;
          } else {
            console.log(
              "🔍 Mobile Debug - Template fetch failed:",
              templateError
            );
          }
        }
      }

      // Check for active program assignment (if program tables exist)
      try {
        // First, let's see what program assignments exist at all
        const { data: allProgramAssignments, error: allProgramError } =
          await supabase
            .from("program_assignments")
            .select(
              `
            id,
            start_date,
            status,
            program_id
          `
            )
            .eq("client_id", user.id);

        console.log(
          "🔍 Mobile Debug - ALL program assignments:",
          allProgramAssignments,
          allProgramError
        );

        // Then get the most recent one
        const { data: programAssignment, error: programError } = await supabase
          .from("program_assignments")
          .select(
            `
            id,
            start_date,
            status,
            program_id
          `
          )
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log(
          "🔍 Mobile Debug - Program assignment:",
          programAssignment,
          programError
        );

        if (programError) {
          console.log(
            "🔍 Program assignments table may not exist:",
            programError.message
          );
        } else if (programAssignment && programAssignment.program_id) {
          // Fetch the program details
          const { data: program, error: programDetailsError } = await supabase
            .from("workout_programs")
            .select("id, name, description, duration_weeks")
            .eq("id", programAssignment.program_id)
            .single();

          console.log(
            "🔍 Mobile Debug - Program details:",
            program,
            programDetailsError
          );

          if (programDetailsError) {
            console.log(
              "🔍 Workout programs table may not exist:",
              programDetailsError.message
            );
          } else if (program) {
            // If no workout found but program exists, show the program
            if (!todaysWorkout) {
              setTodaysWorkout({
                id: programAssignment.id,
                templateId: program.id,
                name: program.name,
                type: "program",
                duration: program.duration_weeks,
                startDate: programAssignment.start_date,
                estimatedDuration: 60, // Default for programs
                exercises: 0, // Programs don't have direct exercise count
              });
              setLoadingWorkout(false);
              return;
            }
          }
        }
      } catch (error) {
        console.log("🔍 Program queries failed (tables may not exist):", error);
      }

      // No active workout or program
      setTodaysWorkout(null);
    } catch (error) {
      console.error("Error loading workout:", error);
      setTodaysWorkout(null);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const fetchAllWorkouts = async () => {
    if (!user) return;

    try {
      console.log("🔍 Fetching all workouts for user:", user.id);

      // Fetch all workout assignments for this user
      const { data: workoutAssignments, error: workoutError } = await supabase
        .from("workout_assignments")
        .select(
          `
          id,
          workout_template_id,
          assigned_date,
          scheduled_date,
          status
        `
        )
        .eq("client_id", user.id)
        .eq("status", "assigned")
        .order("scheduled_date", { ascending: true });

      if (workoutError) {
        console.error("Error fetching all workouts:", workoutError);
        return;
      }

      console.log("🔍 Found workout assignments:", workoutAssignments);

      if (workoutAssignments && workoutAssignments.length > 0) {
        // Fetch template details for each assignment
        const workoutPromises = workoutAssignments.map(async (assignment) => {
          const { data: template } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .eq("id", assignment.workout_template_id)
            .single();

          // Get exercise count from workout_blocks
          let exerciseCount = 0;
          if (template?.id) {
            try {
              const { WorkoutBlockService } = await import(
                "@/lib/workoutBlockService"
              );
              const blocks = await WorkoutBlockService.getWorkoutBlocks(
                template.id
              );
              exerciseCount = blocks.reduce(
                (sum, block) => sum + (block.exercises?.length || 0),
                0
              );
            } catch (err) {
              console.error("Error getting exercise count:", err);
            }
          }

          return {
            id: assignment.id,
            templateId: assignment.workout_template_id,
            name: template?.name || "Unknown Workout",
            type: "workout",
            exercises: exerciseCount,
            estimatedDuration: template?.estimated_duration || 45,
            scheduledDate: assignment.scheduled_date,
            status: assignment.status,
          };
        });

        const workouts = await Promise.all(workoutPromises);
        setAllWorkouts(workouts);
        console.log("🔍 Set all workouts:", workouts);
      } else {
        console.log("🔍 No workout assignments found");
        setAllWorkouts([]);
      }
    } catch (error) {
      console.error("Error in fetchAllWorkouts:", error);
    }
  };

  const todaysMeals = {
    breakfast: { logged: true, name: "Protein Oatmeal" },
    lunch: { logged: false, name: "Chicken & Rice" },
    dinner: { logged: false, name: "Salmon & Vegetables" },
  };

  const todaysHabits = {
    water: 5,
    waterGoal: 8,
    sleep: 7.5,
    steps: 8542,
    stepsGoal: 10000,
  };

  const quickStats = {
    weeklyWorkouts: 3,
    weeklyGoal: 4,
    currentStreak: 8,
    leaderboardRank: 12,
  };

  const greeting = getTimeBasedGreeting();

  return (
    <ProtectedRoute requiredRole="client">
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#E8E9F3",
          paddingBottom: "100px",
        }}
      >
        <div style={{ padding: "24px 20px" }}>
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Greeting Header */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Flame
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                  />
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    {greeting}! 👋
                  </h1>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    {quickStats.currentStreak} day streak • Let's keep it going!
                  </p>
                </div>
              </div>
            </div>

            {/* 1. LIVE WORKOUT - Priority #1 */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Dumbbell
                      style={{
                        width: "32px",
                        height: "32px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1A1A1A",
                      }}
                    >
                      Today's Workout
                    </h2>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                      }}
                    >
                      {loadingWorkout
                        ? "Loading..."
                        : todaysWorkout?.name || "Not assigned yet"}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                {loadingWorkout ? (
                  <div className="text-center py-6">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : todaysWorkout ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      {todaysWorkout.type === "program" ? (
                        <>
                          <Badge
                            style={{
                              backgroundColor: "#EDE7F6",
                              color: "#6C5CE7",
                              fontSize: "12px",
                              fontWeight: "600",
                              padding: "6px 12px",
                              borderRadius: "12px",
                            }}
                          >
                            {todaysWorkout.duration} week program
                          </Badge>
                          {todaysWorkout.startDate && (
                            <Badge
                              style={{
                                backgroundColor: "#D1FAE5",
                                color: "#4CAF50",
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "6px 12px",
                                borderRadius: "12px",
                              }}
                            >
                              Started{" "}
                              {new Date(
                                todaysWorkout.startDate
                              ).toLocaleDateString("en-GB")}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge
                            style={{
                              backgroundColor: "#DBEAFE",
                              color: "#2196F3",
                              fontSize: "12px",
                              fontWeight: "600",
                              padding: "6px 12px",
                              borderRadius: "12px",
                            }}
                          >
                            {todaysWorkout.exercises} exercises
                          </Badge>
                          <Badge
                            style={{
                              backgroundColor: "#EDE7F6",
                              color: "#6C5CE7",
                              fontSize: "12px",
                              fontWeight: "600",
                              padding: "6px 12px",
                              borderRadius: "12px",
                            }}
                          >
                            ~{todaysWorkout.estimatedDuration} min
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/client/workouts/${todaysWorkout.id}/start`}
                        className="flex-1"
                      >
                        <Button
                          className="w-full text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                            borderRadius: "20px",
                            padding: "24px 32px",
                            fontSize: "16px",
                            fontWeight: "600",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <Play className="w-6 h-6 mr-2" />
                          {todaysWorkout.type === "program"
                            ? "View Program"
                            : "Start Workout"}
                        </Button>
                      </Link>
                      <Link href="/client/workouts">
                        <Button
                          variant="outline"
                          style={{
                            borderRadius: "20px",
                            padding: "24px",
                            border: "2px solid #6C5CE7",
                            color: "#6C5CE7",
                          }}
                        >
                          <Calendar className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                        marginBottom: "16px",
                      }}
                    >
                      No workout assigned for today
                    </p>
                    <Link href="/client/workouts">
                      <Button
                        variant="outline"
                        style={{
                          borderRadius: "20px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: "600",
                          border: "2px solid #6C5CE7",
                          color: "#6C5CE7",
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Browse Workouts
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 2. MEAL PLAN COMPLETION - Quick Overview */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        background:
                          "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Apple
                        style={{
                          width: "32px",
                          height: "32px",
                          color: "#FFFFFF",
                        }}
                      />
                    </div>
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1A1A1A",
                      }}
                    >
                      Today's Nutrition
                    </h2>
                  </div>
                  <Link href="/client/nutrition">
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{
                        borderRadius: "16px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#6C5CE7",
                      }}
                    >
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {/* Breakfast */}
                <div
                  className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.breakfast.logged
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${
                          isDark
                            ? "bg-slate-800 border-2 border-slate-700"
                            : "bg-slate-50 border-2 border-slate-200"
                        }`
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍳</span>
                    <span className={`font-medium ${theme.text}`}>
                      {todaysMeals.breakfast.name}
                    </span>
                  </div>
                  {todaysMeals.breakfast.logged ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      className="bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Log
                    </Button>
                  )}
                </div>

                {/* Lunch */}
                <div
                  className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.lunch.logged
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${
                          isDark
                            ? "bg-slate-800 border-2 border-slate-700"
                            : "bg-slate-50 border-2 border-slate-200"
                        }`
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥗</span>
                    <span className={`font-medium ${theme.text}`}>
                      {todaysMeals.lunch.name}
                    </span>
                  </div>
                  {todaysMeals.lunch.logged ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      className="bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Log
                    </Button>
                  )}
                </div>

                {/* Dinner */}
                <div
                  className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.dinner.logged
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${
                          isDark
                            ? "bg-slate-800 border-2 border-slate-700"
                            : "bg-slate-50 border-2 border-slate-200"
                        }`
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍽️</span>
                    <span className={`font-medium ${theme.text}`}>
                      {todaysMeals.dinner.name}
                    </span>
                  </div>
                  {todaysMeals.dinner.logged ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      className="bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Log
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. HABIT TRACKING - Quick Log */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className={`text-xl ${theme.text}`}>
                        Today's Habits
                      </CardTitle>
                    </div>
                    <Link href="/client/progress">
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        Full Tracking
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Water */}
                    <div
                      className={cn(
                        "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                        todaysHabits.water >= todaysHabits.waterGoal
                          ? "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700"
                          : `${
                              isDark
                                ? "bg-slate-800 border-slate-700"
                                : "bg-slate-50 border-slate-200"
                            }`
                      )}
                    >
                      <Droplets
                        className={`w-6 h-6 mx-auto mb-1 ${
                          todaysHabits.water >= todaysHabits.waterGoal
                            ? "text-blue-600"
                            : theme.textSecondary
                        }`}
                      />
                      <p className={`text-xl font-bold ${theme.text}`}>
                        {todaysHabits.water}/{todaysHabits.waterGoal}
                      </p>
                      <p className={`text-xs ${theme.textSecondary}`}>
                        glasses
                      </p>
                    </div>

                    {/* Sleep */}
                    <div
                      className={cn(
                        "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                        todaysHabits.sleep >= 7
                          ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700"
                          : `${
                              isDark
                                ? "bg-slate-800 border-slate-700"
                                : "bg-slate-50 border-slate-200"
                            }`
                      )}
                    >
                      <Moon
                        className={`w-6 h-6 mx-auto mb-1 ${
                          todaysHabits.sleep >= 7
                            ? "text-indigo-600"
                            : theme.textSecondary
                        }`}
                      />
                      <p className={`text-xl font-bold ${theme.text}`}>
                        {todaysHabits.sleep}h
                      </p>
                      <p className={`text-xs ${theme.textSecondary}`}>sleep</p>
                    </div>

                    {/* Steps */}
                    <div
                      className={cn(
                        "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                        todaysHabits.steps >= todaysHabits.stepsGoal
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700"
                          : `${
                              isDark
                                ? "bg-slate-800 border-slate-700"
                                : "bg-slate-50 border-slate-200"
                            }`
                      )}
                    >
                      <Footprints
                        className={`w-6 h-6 mx-auto mb-1 ${
                          todaysHabits.steps >= todaysHabits.stepsGoal
                            ? "text-green-600"
                            : theme.textSecondary
                        }`}
                      />
                      <p className={`text-xl font-bold ${theme.text}`}>
                        {(todaysHabits.steps / 1000).toFixed(1)}k
                      </p>
                      <p className={`text-xs ${theme.textSecondary}`}>steps</p>
                    </div>

                    {/* Cardio */}
                    <div
                      className={cn(
                        "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                        isDark
                          ? "bg-slate-800 border-slate-700"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <Dumbbell
                        className={`w-6 h-6 mx-auto mb-1 ${theme.textSecondary}`}
                      />
                      <p className={`text-xl font-bold ${theme.text}`}>0</p>
                      <p className={`text-xs ${theme.textSecondary}`}>cardio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4. PROGRESS & LEADERBOARDS - Quick Access */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Progress Stats */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600 shadow-2xl">
                <Card
                  className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
                >
                  <CardContent className="p-6">
                    <Link href="/client/progress">
                      <div className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`font-bold ${theme.text}`}>
                              Progress
                            </h3>
                            <p className={`text-sm ${theme.textSecondary}`}>
                              Track your journey
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${theme.textSecondary}`}>
                              This Week
                            </span>
                            <span className={`font-bold ${theme.text}`}>
                              {quickStats.weeklyWorkouts}/
                              {quickStats.weeklyGoal} workouts
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                              style={{
                                width: `${
                                  (quickStats.weeklyWorkouts /
                                    quickStats.weeklyGoal) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard Rank */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-yellow-500 to-orange-600 shadow-2xl">
                <Card
                  className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
                >
                  <CardContent className="p-6">
                    <Link href="/client/progress">
                      <div className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`font-bold ${theme.text}`}>
                              Leaderboard
                            </h3>
                            <p className={`text-sm ${theme.textSecondary}`}>
                              Community ranking
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${theme.textSecondary}`}>
                            Your Rank
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-3xl font-bold ${theme.text}`}
                            >
                              #{quickStats.leaderboardRank}
                            </span>
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Elite
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 5. WHATSAPP COACH CONTACT - Quick Access */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>
                        Contact Your Coach
                      </CardTitle>
                      <p className={`text-sm ${theme.textSecondary}`}>
                        Get instant support
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <a
                    href="https://wa.me/40755888840?text=Hi! I have a question about my training"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Open WhatsApp
                    </Button>
                  </a>
                  <p
                    className={`text-xs ${theme.textSecondary} mt-3 text-center`}
                  >
                    💬 Chat directly via WhatsApp for fastest response
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Sessions */}
              <Link href="/client/sessions" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:shadow-xl transition-all">
                  <div
                    className={cn(
                      "rounded-2xl p-4 h-full",
                      isDark ? "bg-slate-800" : "bg-white"
                    )}
                  >
                    <Calendar className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>
                      Sessions
                    </p>
                  </div>
                </div>
              </Link>

              {/* Check-In */}
              <Link href="/client/progress?view=checkins" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg hover:shadow-xl transition-all">
                  <div
                    className={cn(
                      "rounded-2xl p-4 h-full",
                      isDark ? "bg-slate-800" : "bg-white"
                    )}
                  >
                    <CheckCircle className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>
                      Check-In
                    </p>
                  </div>
                </div>
              </Link>

              {/* Goals */}
              <Link href="/client/progress?view=goals" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg hover:shadow-xl transition-all">
                  <div
                    className={cn(
                      "rounded-2xl p-4 h-full",
                      isDark ? "bg-slate-800" : "bg-white"
                    )}
                  >
                    <Target className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>Goals</p>
                  </div>
                </div>
              </Link>

              {/* Leaderboard */}
              <Link href="/client/progress?view=leaderboard" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-yellow-500 to-orange-600 shadow-lg hover:shadow-xl transition-all">
                  <div
                    className={cn(
                      "rounded-2xl p-4 h-full",
                      isDark ? "bg-slate-800" : "bg-white"
                    )}
                  >
                    <Trophy className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>
                      Leaderboard
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
