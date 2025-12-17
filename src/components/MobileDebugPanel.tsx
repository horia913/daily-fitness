"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DebugResult {
  test: string;
  success: boolean;
  data?: any;
  error?: any;
  timestamp: string;
}

export default function MobileDebugPanel() {
  const { user } = useAuth();
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (
    test: string,
    success: boolean,
    data?: any,
    error?: any
  ) => {
    const result: DebugResult = {
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString(),
    };
    setResults((prev) => [...prev, result]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    console.log("🔍 Starting Mobile Debug Tests...");
    console.log("🔍 User:", user);
    console.log("🔍 User ID:", user?.id);

    // Test 1: Check user authentication
    addResult("User Authentication", !!user, {
      userId: user?.id,
      email: user?.email,
    });

    if (!user) {
      setIsRunning(false);
      return;
    }

    // Test 2: Basic profile query
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      addResult("Profile Query", !profileError, profile, profileError);
    } catch (error) {
      addResult("Profile Query", false, null, error);
    }

    // Test 3: Check workout_assignments table access
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("workout_assignments")
        .select("id, client_id, status")
        .eq("client_id", user.id)
        .limit(5);

      addResult(
        "Workout Assignments Query",
        !assignmentsError,
        assignments,
        assignmentsError
      );
    } catch (error) {
      addResult("Workout Assignments Query", false, null, error);
    }

    // Test 4: Check workout_templates table access
    try {
      const { data: templates, error: templatesError } = await supabase
        .from("workout_templates")
        .select("id, name")
        .limit(5);

      addResult(
        "Workout Templates Query",
        !templatesError,
        templates,
        templatesError
      );
    } catch (error) {
      addResult("Workout Templates Query", false, null, error);
    }

    // Test 5: Check clients table access (for coach relationships)
    try {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, client_id, coach_id, status")
        .eq("client_id", user.id)
        .limit(5);

      addResult(
        "Clients Relationship Query",
        !clientsError,
        clients,
        clientsError
      );
    } catch (error) {
      addResult("Clients Relationship Query", false, null, error);
    }

    // Test 6: Check today's workout assignment specifically
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: todaysWorkout, error: todaysError } = await supabase
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
        .maybeSingle();

      addResult(
        "Today's Workout Query",
        !todaysError,
        todaysWorkout,
        todaysError
      );
    } catch (error) {
      addResult("Today's Workout Query", false, null, error);
    }

    // Test 7: Check if user has any workout assignments at all
    try {
      const { data: anyWorkouts, error: anyWorkoutsError } = await supabase
        .from("workout_assignments")
        .select("id, scheduled_date, status")
        .eq("client_id", user.id)
        .limit(10);

      addResult(
        "Any Workout Assignments",
        !anyWorkoutsError,
        anyWorkouts,
        anyWorkoutsError
      );
    } catch (error) {
      addResult("Any Workout Assignments", false, null, error);
    }

    // Test 8: Check if there are ANY workout assignments in the database (not user-specific)
    try {
      const { data: allWorkouts, error: allWorkoutsError } = await supabase
        .from("workout_assignments")
        .select("id, client_id, scheduled_date, status")
        .limit(5);

      addResult(
        "All Workout Assignments (Any User)",
        !allWorkoutsError,
        allWorkouts,
        allWorkoutsError
      );
    } catch (error) {
      addResult("All Workout Assignments (Any User)", false, null, error);
    }

    // Test 9: Check if there are ANY client relationships in the database
    try {
      const { data: allClients, error: allClientsError } = await supabase
        .from("clients")
        .select("id, client_id, coach_id, status")
        .limit(5);

      addResult(
        "All Client Relationships (Any User)",
        !allClientsError,
        allClients,
        allClientsError
      );
    } catch (error) {
      addResult("All Client Relationships (Any User)", false, null, error);
    }

    setIsRunning(false);
    console.log("🔍 Mobile Debug Tests Complete");
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Mobile Debug Panel</span>
          <div className="flex gap-2">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              {isRunning ? "Running..." : "Run Tests"}
            </Button>
            <Button
              onClick={clearResults}
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{result.test}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "✅ PASS" : "❌ FAIL"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {result.timestamp}
                  </span>
                </div>
              </div>

              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <div className="text-sm font-medium text-red-800">Error:</div>
                  <div className="text-xs text-red-600 font-mono">
                    {JSON.stringify(result.error, null, 2)}
                  </div>
                </div>
              )}

              {result.data && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-sm font-medium text-green-800">
                    Data:
                  </div>
                  <div className="text-xs text-green-600 font-mono max-h-32 overflow-y-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </div>
                </div>
              )}
            </div>
          ))}

          {results.length === 0 && !isRunning && (
            <div className="text-center text-gray-500 py-4">
              Click "Run Tests" to start debugging mobile data issues
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
