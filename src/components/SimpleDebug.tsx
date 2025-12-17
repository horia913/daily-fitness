"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function SimpleDebug() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>("");

  const runTest = async () => {
    try {
      console.log("🔍 Simple Debug - User:", user);
      console.log("🔍 Simple Debug - User ID:", user?.id);

      if (!user) {
        setTestResult("❌ No user found");
        return;
      }

      // Test 1: Basic profile query
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setTestResult(`❌ Profile Error: ${profileError.message}`);
        console.error("Profile query error:", profileError);
        return;
      }

      // Test 2: Check workout assignments
      const { data: workouts, error: workoutError } = await supabase
        .from("workout_assignments")
        .select("id, workout_template_id, scheduled_date, status")
        .eq("client_id", user.id)
        .order("scheduled_date", { ascending: false });

      console.log("Workout assignments:", workouts, workoutError);

      // Test 2b: Check today's specific assignment
      const today = new Date().toISOString().split("T")[0];
      const { data: todaysWorkout, error: todaysError } = await supabase
        .from("workout_assignments")
        .select("id, workout_template_id, scheduled_date, status")
        .eq("client_id", user.id)
        .eq("scheduled_date", today)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      console.log("Today's workout:", todaysWorkout, todaysError);

      // Test 3: Check if program tables exist
      const { data: programs, error: programError } = await supabase
        .from("program_assignments")
        .select("id, program_id")
        .eq("client_id", user.id)
        .limit(5);

      console.log("Program assignments:", programs, programError);

      // Test 4: Check workout templates
      const { data: templates, error: templateError } = await supabase
        .from("workout_templates")
        .select("id, name, is_active")
        .limit(5);

      console.log("Workout templates:", templates, templateError);

      const results = [
        `✅ Profile: ${profile.email} (${profile.role})`,
        `Workouts: ${workouts?.length || 0} assignments`,
        `Today: ${todaysWorkout ? "Found" : "None"}`,
        `Programs: ${programs?.length || 0} assignments (${
          programError ? "Error: " + programError.message : "OK"
        })`,
        `Templates: ${templates?.length || 0} available`,
      ].join(" | ");

      setTestResult(results);
    } catch (err: any) {
      setTestResult(`❌ Exception: ${err.message}`);
      console.error("Test exception:", err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
        right: "10px",
        background: "white",
        border: "2px solid red",
        padding: "10px",
        zIndex: 9999,
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "red" }}>
        🔍 SIMPLE DEBUG PANEL
      </h3>
      <p style={{ margin: "0 0 10px 0" }}>
        <strong>User:</strong> {user ? `${user.email} (${user.id})` : "No user"}
      </p>
      <button
        onClick={runTest}
        style={{
          background: "blue",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Run Test
      </button>
      {testResult && (
        <p
          style={{
            margin: "10px 0 0 0",
            color: testResult.includes("✅") ? "green" : "red",
          }}
        >
          <strong>Result:</strong> {testResult}
        </p>
      )}
    </div>
  );
}
