/**
 * Seed Athlete Score v2 demo states for test personas only.
 * alice / bob / carol / dan / eve @dailyfitness.app
 *
 * Does NOT touch Popescu, Roxana, Luminita, or other real clients.
 *
 * Usage:
 *   node scripts/seed-personas-athlete-score-v2.mjs
 *   node scripts/trigger-cron-daily-sync.mjs   # dev server on :3000
 *   node scripts/query-personas-athlete-scores.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  FIXTURE_NOTE,
  PERSONA_EMAILS,
  addCalendarDaysYmd,
  computeCurrentProgramWeekForAssignment,
  eachDayYmd,
  getCurrentWeekBoundsForClient,
  getStraightSetPrescription,
  loadProgramSlots,
  scheduledSlotsForWeek,
  utcIsoForLocalDateTime,
  zonedYmdFromIsoTimestamp,
} from "./lib/personaSeedShared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

async function loadPersona(email) {
  const { data: profile, error: pe } = await admin
    .from("profiles")
    .select("id, email, timezone")
    .eq("email", email)
    .maybeSingle();
  if (pe) throw pe;
  if (!profile?.id) throw new Error(`No profile for ${email}`);

  const { data: pa, error: pae } = await admin
    .from("program_assignments")
    .select(
      "id, program_id, client_id, start_date, duration_weeks, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status"
    )
    .eq("client_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pae) throw pae;
  if (!pa?.id) throw new Error(`No program_assignments for ${email}`);

  const { data: coachRow, error: ce } = await admin
    .from("clients")
    .select("coach_id")
    .eq("client_id", profile.id)
    .maybeSingle();
  if (ce) throw ce;
  if (!coachRow?.coach_id) throw new Error(`No coach_id for ${email}`);

  return { profile, assignment: pa, coachId: coachRow.coach_id };
}

async function cleanWeekData(cid, week, tz) {
  const { data: logsRaw, error: le } = await admin
    .from("workout_logs")
    .select("id, completed_at")
    .eq("client_id", cid)
    .not("completed_at", "is", null)
    .gte("completed_at", week.weekStartUtcIso)
    .lte("completed_at", week.weekEndUtcIso);
  if (le) throw le;
  const logIds = (logsRaw ?? [])
    .filter((row) => {
      const y = zonedYmdFromIsoTimestamp(row.completed_at, tz);
      return y >= week.mondayYmd && y <= week.sundayYmd;
    })
    .map((r) => r.id);
  if (logIds.length) {
    const { error: de } = await admin.from("workout_logs").delete().in("id", logIds);
    if (de) throw de;
  }

  await admin.from("meal_completions").delete().eq("client_id", cid).eq("notes", FIXTURE_NOTE);
  await admin
    .from("client_activities")
    .delete()
    .eq("client_id", cid)
    .eq("notes", FIXTURE_NOTE)
    .gte("activity_date", week.mondayYmd)
    .lte("activity_date", week.sundayYmd);
  await admin
    .from("daily_wellness_logs")
    .delete()
    .eq("client_id", cid)
    .gte("log_date", week.mondayYmd)
    .lte("log_date", week.sundayYmd);

  await admin
    .from("athlete_scores")
    .delete()
    .eq("client_id", cid)
    .eq("window_start", week.mondayYmd)
    .eq("window_end", week.sundayYmd);
}

async function seedWellness(cid, week, { sleepHours, steps }) {
  const rows = [...eachDayYmd(week.mondayYmd, week.sundayYmd)].map((log_date) => ({
    client_id: cid,
    log_date,
    sleep_hours: sleepHours,
    steps,
  }));
  const { error } = await admin.from("daily_wellness_logs").upsert(rows, {
    onConflict: "client_id,log_date",
  });
  if (error) throw error;
}

async function seedNutrition(cid, coachId, week, tz) {
  await admin.from("meal_plan_assignments").update({ is_active: false }).eq("client_id", cid);

  const { data: mp, error: mpe } = await admin
    .from("meal_plans")
    .insert({
      coach_id: coachId,
      name: `Persona AS v2 fixture (${cid.slice(0, 8)})`,
      is_active: true,
    })
    .select("id")
    .single();
  if (mpe) throw mpe;

  const { data: meal, error: mele } = await admin
    .from("meals")
    .insert({
      meal_plan_id: mp.id,
      name: "Persona fixture breakfast",
      meal_type: "breakfast",
      order_index: 0,
    })
    .select("id")
    .single();
  if (mele) throw mele;

  const { error: mpae } = await admin.from("meal_plan_assignments").insert({
    coach_id: coachId,
    client_id: cid,
    meal_plan_id: mp.id,
    start_date: week.mondayYmd,
    end_date: null,
    is_active: true,
    notes: FIXTURE_NOTE,
  });
  if (mpae) throw mpae;

  const completions = [...eachDayYmd(week.mondayYmd, week.sundayYmd)].map((d) => ({
    meal_id: meal.id,
    client_id: cid,
    completed_at: utcIsoForLocalDateTime(d, tz, 12, 0),
    notes: FIXTURE_NOTE,
  }));
  const { error: mce } = await admin.from("meal_completions").insert(completions);
  if (mce) throw mce;
}

async function seedExtras(cid, week, sessions) {
  if (!sessions?.length) return;
  const { error } = await admin.from("client_activities").insert(
    sessions.map((s) => ({
      client_id: cid,
      activity_type: "running",
      duration_minutes: 30,
      intensity: "vigorous",
      activity_date: s,
      notes: FIXTURE_NOTE,
    }))
  );
  if (error) throw error;
}

async function ensurePrescription(admin, templateId, mode) {
  const rx = await getStraightSetPrescription(admin, templateId);
  if (!rx) return null;
  const { setEntryId, wsee } = rx;
  const target = { reps: "8", weight_kg: 80, rir: 2 };
  const { error } = await admin
    .from("workout_set_entry_exercises")
    .update(target)
    .eq("id", wsee.id);
  if (error) throw error;
  return { setEntryId, exerciseId: wsee.exercise_id, target, mode };
}

async function insertWorkoutLog({
  cid,
  coachId,
  assignmentId,
  slot,
  completedYmd,
  tz,
  executionMode,
}) {
  const rx = await ensurePrescription(admin, slot.template_id, executionMode);
  const completedAt = utcIsoForLocalDateTime(completedYmd, tz, 10, 0);

  const { data: wa, error: wae } = await admin
    .from("workout_assignments")
    .insert({
      client_id: cid,
      coach_id: coachId,
      workout_template_id: slot.template_id,
      name: `Persona fixture ${slot.id.slice(0, 8)}`,
      status: "completed",
      notes: FIXTURE_NOTE,
    })
    .select("id")
    .single();
  if (wae) throw wae;

  const { data: wl, error: wle } = await admin
    .from("workout_logs")
    .insert({
      workout_assignment_id: wa.id,
      client_id: cid,
      started_at: completedAt,
      completed_at: completedAt,
      program_assignment_id: assignmentId,
      program_schedule_id: slot.id,
      notes: FIXTURE_NOTE,
    })
    .select("id")
    .single();
  if (wle) throw wle;

  if (rx) {
    const { setEntryId, exerciseId, target } = rx;
    const prescribedRpe = Number(target.rir);
    const setRows =
      executionMode === "perfect"
        ? [
            { reps: 8, weight: 80, rpe: prescribedRpe, set_number: 1 },
            { reps: 8, weight: 80, rpe: prescribedRpe, set_number: 2 },
            { reps: 8, weight: 80, rpe: prescribedRpe, set_number: 3 },
          ]
        : [
            { reps: 8, weight: 76, rpe: prescribedRpe + 2, set_number: 1 },
            { reps: 7, weight: 78, rpe: prescribedRpe + 2, set_number: 2 },
            { reps: 6, weight: 80, rpe: prescribedRpe + 3, set_number: 3 },
          ];

    for (const sr of setRows) {
      const { error: se } = await admin.from("workout_set_logs").insert({
        workout_log_id: wl.id,
        client_id: cid,
        set_entry_id: setEntryId,
        exercise_id: exerciseId,
        set_type: "straight_set",
        reps: sr.reps,
        weight: sr.weight,
        rpe: sr.rpe,
        set_number: sr.set_number,
      });
      if (se) throw se;
    }
  }
}

async function upsertFrozenScore(cid, week, payload) {
  const row = {
    client_id: cid,
    window_start: week.mondayYmd,
    window_end: week.sundayYmd,
    calculated_at: payload.calculated_at,
    score: payload.score,
    tier: payload.tier,
    training_score: payload.training_score,
    training_completion_score: payload.training_completion_score,
    training_execution_score: payload.training_execution_score,
    recovery_score: payload.recovery_score,
    recovery_sleep_score: payload.recovery_sleep_score,
    recovery_steps_score: payload.recovery_steps_score,
    nutrition_score: payload.nutrition_score,
    extras_score: payload.extras_score,
  };
  const { error } = await admin
    .from("athlete_scores")
    .upsert(row, { onConflict: "client_id,window_start,window_end" });
  if (error) throw error;
}

async function setAssignment(assignmentId, patch) {
  const { error } = await admin
    .from("program_assignments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);
  if (error) throw error;
}

function ymdForSlotIndex(week, index) {
  const days = [...eachDayYmd(week.mondayYmd, week.sundayYmd)];
  return days[Math.min(index, days.length - 1)];
}

console.log("=== Persona Athlete Score v2 seed ===\n");

const contexts = {};
for (const [name, email] of Object.entries(PERSONA_EMAILS)) {
  contexts[name] = await loadPersona(email);
  contexts[name].week = getCurrentWeekBoundsForClient(contexts[name].profile.timezone);
  console.log(`Loaded ${name}: ${email} (${contexts[name].profile.id})`);
}

const week = contexts.alice.week;

/** Persona program has 4 schedule weeks; clamp calendar week so athlete score sees slots. */
for (const ctx of Object.values(contexts)) {
  await setAssignment(ctx.assignment.id, { duration_weeks: 4 });
  ctx.assignment.duration_weeks = 4;
}

// --- Alice: perfect everything ---
{
  const { profile, assignment, coachId } = contexts.alice;
  const tz = week.timeZone;
  await cleanWeekData(profile.id, week, tz);
  await setAssignment(assignment.id, { status: "active", pause_status: "active", paused_at: null });
  const slots = scheduledSlotsForWeek(
    await loadProgramSlots(admin, assignment.program_id, assignment.id),
    computeCurrentProgramWeekForAssignment(assignment, tz).week
  );
  for (let i = 0; i < slots.length; i++) {
    await insertWorkoutLog({
      cid: profile.id,
      coachId,
      assignmentId: assignment.id,
      slot: slots[i],
      completedYmd: ymdForSlotIndex(week, i * 2),
      tz,
      executionMode: "perfect",
    });
  }
  await seedWellness(profile.id, week, { sleepHours: 8, steps: 10000 });
  await seedNutrition(profile.id, coachId, week, tz);
  const extraDays = [...eachDayYmd(week.mondayYmd, week.sundayYmd)].filter((_, i) => i % 2 === 0);
  await seedExtras(profile.id, week, extraDays);
  console.log(`Alice: seeded ${slots.length} workouts + wellness/nutrition/extras`);
}

// --- Bob: 2/3 workouts, drift execution, 7h/6k wellness, nutrition only ---
{
  const { profile, assignment, coachId } = contexts.bob;
  const tz = week.timeZone;
  await cleanWeekData(profile.id, week, tz);
  await setAssignment(assignment.id, { status: "active", pause_status: "active", paused_at: null });
  const slotsRaw = scheduledSlotsForWeek(
    await loadProgramSlots(admin, assignment.program_id, assignment.id),
    computeCurrentProgramWeekForAssignment(assignment, tz).week
  );
  const slots = [];
  for (const s of slotsRaw) {
    const hasStraight = !!(await getStraightSetPrescription(admin, s.template_id));
    slots.push({ slot: s, hasStraight });
  }
  slots.sort((a, b) => Number(b.hasStraight) - Number(a.hasStraight));
  const toComplete = slots.slice(0, Math.max(0, slots.length - 1));
  for (let i = 0; i < toComplete.length; i++) {
    await insertWorkoutLog({
      cid: profile.id,
      coachId,
      assignmentId: assignment.id,
      slot: toComplete[i].slot,
      completedYmd: ymdForSlotIndex(week, i * 2 + 1),
      tz,
      executionMode: "drift",
    });
  }
  await seedWellness(profile.id, week, { sleepHours: 7, steps: 6000 });
  await seedNutrition(profile.id, coachId, week, tz);
  console.log(
    `Bob: seeded ${toComplete.length}/${slots.length} workouts (missed ${Math.max(0, slots.length - toComplete.length)}), 7h/6k wellness, no extras`
  );
}

// --- Carol: 0 training, full recovery/nutrition/extras ---
{
  const { profile, assignment, coachId } = contexts.carol;
  const tz = week.timeZone;
  await cleanWeekData(profile.id, week, tz);
  await setAssignment(assignment.id, { status: "active", pause_status: "active", paused_at: null });
  await seedWellness(profile.id, week, { sleepHours: 8, steps: 10000 });
  await seedNutrition(profile.id, coachId, week, tz);
  await seedExtras(profile.id, week, [...eachDayYmd(week.mondayYmd, week.sundayYmd)].slice(0, 3));
  console.log("Carol: seeded 0 workouts, full recovery/nutrition/extras (constraint test)");
}

// --- Dan: paused + frozen pre-pause score ~80 (locked_in) ---
{
  const { profile, assignment } = contexts.dan;
  const tz = week.timeZone;
  await cleanWeekData(profile.id, week, tz);
  const pausedAt = new Date().toISOString();
  await setAssignment(assignment.id, {
    status: "active",
    pause_status: "paused",
    paused_at: pausedAt,
  });
  const frozenAt = new Date(Date.now() - 3 * 86400000).toISOString();
  await upsertFrozenScore(profile.id, week, {
    calculated_at: frozenAt,
    score: 80,
    tier: "locked_in",
    training_score: 78,
    training_completion_score: 80,
    training_execution_score: 75,
    recovery_score: 82,
    recovery_sleep_score: 85,
    recovery_steps_score: 75,
    nutrition_score: 90,
    extras_score: 55,
  });
  console.log("Dan: paused assignment + frozen athlete_scores row (~80, locked_in)");
}

// --- Eve: completed program + frozen score ~50 ---
{
  const { profile, assignment } = contexts.eve;
  const tz = week.timeZone;
  await cleanWeekData(profile.id, week, tz);
  await setAssignment(assignment.id, {
    status: "completed",
    pause_status: "active",
    paused_at: null,
  });
  const frozenAt = new Date(Date.now() - 2 * 86400000).toISOString();
  await upsertFrozenScore(profile.id, week, {
    calculated_at: frozenAt,
    score: 50,
    tier: "slipping",
    training_score: 48,
    training_completion_score: 50,
    training_execution_score: 45,
    recovery_score: 55,
    recovery_sleep_score: 60,
    recovery_steps_score: 45,
    nutrition_score: 70,
    extras_score: 20,
  });
  console.log("Eve: completed assignment + frozen athlete_scores row (~50)");
}

console.log("\nDone seeding. Next: node scripts/trigger-cron-daily-sync.mjs");
console.log("Then: node scripts/query-personas-athlete-scores.mjs\n");
