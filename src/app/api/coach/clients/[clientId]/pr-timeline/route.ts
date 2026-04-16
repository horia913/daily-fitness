import { NextRequest, NextResponse } from "next/server";
import {
  validateApiAuth,
  createForbiddenResponse,
  createUnauthorizedResponse,
} from "@/lib/apiAuth";

type PrRow = {
  exercise_id: string | null;
  record_type: string;
  record_value: number;
  achieved_date: string;
  workout_assignment_id: string | null;
  exercises?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const { data: clientLink, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .limit(1)
      .maybeSingle();

    if (clientErr) {
      return NextResponse.json({ error: "Failed to verify client access" }, { status: 500 });
    }
    if (!clientLink) {
      return createForbiddenResponse("Forbidden - Client not found or access denied");
    }

    const { data: rows, error: prErr } = await supabaseAdmin
      .from("personal_records")
      .select(
        "exercise_id, record_type, record_value, achieved_date, workout_assignment_id, exercises(name)"
      )
      .eq("client_id", clientId)
      .order("achieved_date", { ascending: false })
      .limit(200);

    if (prErr) {
      return NextResponse.json({ error: "Failed to load PR history" }, { status: 500 });
    }

    const prRows = (rows ?? []) as PrRow[];
    const workoutLogIds = [
      ...new Set(prRows.map((r) => r.workout_assignment_id).filter((v): v is string => !!v)),
    ];
    const exerciseIds = [
      ...new Set(prRows.map((r) => r.exercise_id).filter((v): v is string => !!v)),
    ];

    const setRowsRes =
      workoutLogIds.length > 0 && exerciseIds.length > 0
        ? await supabaseAdmin
            .from("workout_set_logs")
            .select("workout_log_id, exercise_id, weight, reps")
            .eq("client_id", clientId)
            .in("workout_log_id", workoutLogIds)
            .in("exercise_id", exerciseIds)
        : { data: [], error: null };

    if (setRowsRes.error) {
      return NextResponse.json({ error: "Failed to load PR set details" }, { status: 500 });
    }

    const bestSetByLogExercise = new Map<string, { weight: number | null; reps: number | null }>();
    for (const row of (setRowsRes.data ?? []) as Array<{
      workout_log_id: string;
      exercise_id: string | null;
      weight: number | null;
      reps: number | null;
    }>) {
      if (!row.exercise_id) continue;
      const key = `${row.workout_log_id}:${row.exercise_id}`;
      const curr = bestSetByLogExercise.get(key);
      const nextWeight = Number(row.weight) || 0;
      const nextReps = Number(row.reps) || 0;
      if (!curr) {
        bestSetByLogExercise.set(key, { weight: row.weight, reps: row.reps });
        continue;
      }
      const currWeight = Number(curr.weight) || 0;
      const currReps = Number(curr.reps) || 0;
      if (nextWeight > currWeight || (nextWeight === currWeight && nextReps > currReps)) {
        bestSetByLogExercise.set(key, { weight: row.weight, reps: row.reps });
      }
    }

    const milestones = prRows
      .filter((r) => r.record_type === "weight" && Number.isFinite(Number(r.record_value)))
      .map((r) => ({
        date: r.achieved_date,
        weight: Number(r.record_value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const recent = prRows.slice(0, 5).map((r) => {
      const exerciseName = Array.isArray(r.exercises)
        ? r.exercises[0]?.name ?? null
        : r.exercises?.name ?? null;
      const setKey =
        r.workout_assignment_id && r.exercise_id
          ? `${r.workout_assignment_id}:${r.exercise_id}`
          : null;
      const bestSet = setKey ? bestSetByLogExercise.get(setKey) : null;
      const weight =
        r.record_type === "weight"
          ? Number(r.record_value)
          : bestSet?.weight != null
            ? Number(bestSet.weight)
            : null;
      const reps =
        r.record_type === "reps"
          ? Number(r.record_value)
          : bestSet?.reps != null
            ? Number(bestSet.reps)
            : null;
      return {
        exerciseId: r.exercise_id,
        exerciseName,
        weight,
        reps,
        achievedDate: r.achieved_date,
        workoutLogId: r.workout_assignment_id,
      };
    });

    return NextResponse.json({
      clientId,
      milestones,
      recent,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    if (msg === "User not authenticated") {
      return createUnauthorizedResponse();
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
