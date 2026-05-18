/**
 * Appendix A — Tests 2–5 for Popescu (client@test.com) only.
 * Restores Test 1 baseline via `seed-popescu-athlete-score-v2.mjs` + program_assignments reset.
 *
 * Usage (from dailyfitness-app, dev server on :3000 for cron):
 *   node scripts/appendix-a-tests-2-5-popescu.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
dotenv.config({ path: join(ROOT, ".env.local") });

const APPENDIX_NOTE = "__APPENDIX_A_FIXTURE__";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

function normalizeClientTimezone(raw) {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : "UTC";
}

function zonedCalendarDateString(now, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addCalendarDaysYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  const u = Date.UTC(y, m - 1, d + deltaDays);
  return new Date(u).toISOString().slice(0, 10);
}

function diffCalendarDaysYmd(ymdStart, ymdEnd) {
  const [ys, ms, ds] = ymdStart.split("-").map(Number);
  const [ye, me, de] = ymdEnd.split("-").map(Number);
  const u0 = Date.UTC(ys, ms - 1, ds);
  const u1 = Date.UTC(ye, me - 1, de);
  return Math.floor((u1 - u0) / 86400000);
}

function zonedYmdFromIsoTimestamp(iso, timeZone) {
  return zonedCalendarDateString(new Date(iso), timeZone);
}

function midnightInTimezone(dateStr, ianaTimezone) {
  if (!dateStr || !ianaTimezone) {
    const fallback = (dateStr || new Date().toISOString().slice(0, 10)) + "T00:00:00.000Z";
    const d = new Date(fallback);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  try {
    const d = new Date(dateStr + "T12:00:00.000Z");
    if (isNaN(d.getTime())) return new Date().toISOString();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
    const msFromMidnight = (hour * 3600 + minute * 60 + second) * 1000;
    const midnightUtc = new Date(d.getTime() - msFromMidnight);
    return midnightUtc.toISOString();
  } catch {
    const d = new Date(dateStr + "T00:00:00.000Z");
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
}

function zonedDayInclusiveUtcBounds(ymd, timeZone) {
  const tz = timeZone || "UTC";
  const startIso = midnightInTimezone(ymd, tz);
  const nextYmd = addCalendarDaysYmd(ymd, 1);
  const nextStartMs = Date.parse(midnightInTimezone(nextYmd, tz));
  const endIso = new Date(nextStartMs - 1).toISOString();
  return { startIso, endIso };
}

function weekdayMon0Sun6InTimezone(instant, timeZone) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    weekday: "short",
  }).format(instant);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

function mondayYmdOfZonedWeekContaining(now, timeZone) {
  const todayYmd = zonedCalendarDateString(now, timeZone);
  const dow = weekdayMon0Sun6InTimezone(now, timeZone);
  return addCalendarDaysYmd(todayYmd, -dow);
}

function getCurrentWeekBoundsForClient(clientTimeZone, now = new Date()) {
  const timeZone = normalizeClientTimezone(clientTimeZone);
  const mondayYmd = mondayYmdOfZonedWeekContaining(now, timeZone);
  const sundayYmd = addCalendarDaysYmd(mondayYmd, 6);
  const { startIso: weekStartUtcIso } = zonedDayInclusiveUtcBounds(mondayYmd, timeZone);
  const { endIso: weekEndUtcIso } = zonedDayInclusiveUtcBounds(sundayYmd, timeZone);
  return { weekStartUtcIso, weekEndUtcIso, mondayYmd, sundayYmd, timeZone };
}

function computeCurrentProgramWeek(args) {
  const startRaw =
    typeof args.assignmentStartDate === "string" ? args.assignmentStartDate.trim() : "";
  const startYmd = startRaw.length >= 10 ? startRaw.slice(0, 10) : startRaw;
  if (!startYmd) return 1;

  const pauseAccum = Math.max(0, Number(args.pauseAccumulatedDays) || 0);
  const effectiveStartYmd = addCalendarDaysYmd(startYmd, pauseAccum);
  const pausedYmd =
    args.pauseStatus === "paused" && args.pausedAt
      ? zonedYmdFromIsoTimestamp(args.pausedAt, args.clientTimezone)
      : null;
  const effectiveTargetYmd =
    pausedYmd && args.targetYmd > pausedYmd ? pausedYmd : args.targetYmd;
  const elapsed = Math.max(0, diffCalendarDaysYmd(effectiveStartYmd, effectiveTargetYmd));
  return Math.floor(elapsed / 7) + 1;
}

function computeCurrentProgramWeekForAssignment(assignment, clientTimezoneFallback, targetYmdOverride) {
  const tz =
    normalizeClientTimezone(assignment.timezone_snapshot) ||
    normalizeClientTimezone(clientTimezoneFallback) ||
    "UTC";
  const targetYmd = targetYmdOverride ?? zonedCalendarDateString(new Date(), tz);
  const raw = computeCurrentProgramWeek({
    assignmentStartDate: assignment.start_date,
    pauseAccumulatedDays: assignment.pause_accumulated_days,
    pauseStatus: assignment.pause_status,
    pausedAt: assignment.paused_at,
    targetYmd,
    clientTimezone: tz,
  });
  const floored = Math.max(1, raw);
  const cap = assignment.duration_weeks ?? Number.POSITIVE_INFINITY;
  if (floored > cap) return { week: cap, clamped: true };
  return { week: floored, clamped: false };
}

function scheduleLookupKey(weekNumber, dayWithinWeek) {
  return `${weekNumber}:${dayWithinWeek}`;
}

function mapPdaRows(data) {
  return (data ?? []).map((row) => {
    const dayNum = Number(row.day_number) || 1;
    const weekNum = Math.max(1, Math.ceil(dayNum / 7));
    const programDayRaw = row.program_day;
    const programDay =
      typeof programDayRaw === "number" && programDayRaw >= 1 && programDayRaw <= 7
        ? programDayRaw
        : Math.max(1, Math.min(7, dayNum - (weekNum - 1) * 7));
    return {
      week_number: weekNum,
      program_day: programDay,
      workout_template_id: row.workout_template_id ?? null,
      is_optional: Boolean(row.is_optional),
    };
  });
}

async function loadProgramSlots(admin, programId, assignmentId) {
  const [pdaRes, psRes] = await Promise.all([
    admin
      .from("program_day_assignments")
      .select(
        "id, program_assignment_id, day_number, program_day, workout_template_id, name, is_customized, day_type, is_optional"
      )
      .eq("program_assignment_id", assignmentId)
      .order("day_number", { ascending: true }),
    admin
      .from("program_schedule")
      .select("id, program_id, week_number, day_number, day_of_week, template_id")
      .eq("program_id", programId),
  ]);
  if (pdaRes.error) throw pdaRes.error;
  if (psRes.error) throw psRes.error;
  const snapshots = mapPdaRows(pdaRes.data);
  const lookup = new Map();
  for (const ps of psRes.data ?? []) {
    const w = Number(ps.week_number) || 1;
    const d =
      Number(ps.day_number) ||
      (typeof ps.day_of_week === "number" ? ps.day_of_week + 1 : 1);
    lookup.set(scheduleLookupKey(w, d), ps);
  }
  return snapshots.map((snap) => {
    const ps = lookup.get(scheduleLookupKey(snap.week_number, snap.program_day));
    const templateFromSnapshot = snap.workout_template_id;
    const templateFromMaster = ps?.template_id ?? "";
    const templateId =
      templateFromSnapshot && templateFromSnapshot.length > 0
        ? templateFromSnapshot
        : templateFromMaster;
    const id = ps?.id ?? null;
    return {
      id,
      week_number: snap.week_number,
      day_number: snap.program_day,
      template_id: templateId || templateFromMaster || "",
      is_optional: snap.is_optional ?? false,
    };
  });
}

function pickScheduledSlot(slots, ppWeek) {
  return (
    slots.find(
      (s) =>
        s.week_number === ppWeek &&
        !s.is_optional &&
        s.id != null &&
        typeof s.template_id === "string" &&
        s.template_id.length > 0
    ) ?? null
  );
}

async function fetchLatestScores(admin, cid, limit = 3) {
  const { data, error } = await admin
    .from("athlete_scores")
    .select(
      "score, tier, training_score, training_completion_score, training_execution_score, recovery_score, recovery_sleep_score, recovery_steps_score, nutrition_score, extras_score, window_start, window_end, calculated_at"
    )
    .eq("client_id", cid)
    .order("calculated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

function runSeedBaseline() {
  execSync("node scripts/seed-popescu-athlete-score-v2.mjs", { cwd: ROOT, stdio: "inherit" });
}

function runCron() {
  execSync("node scripts/trigger-cron-daily-sync.mjs", { cwd: ROOT, stdio: "inherit" });
}

async function restoreProgramAndBaseline(admin, assignmentId) {
  const { error: uerr } = await admin
    .from("program_assignments")
    .update({
      status: "active",
      pause_status: "active",
      paused_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);
  if (uerr) throw uerr;
  runSeedBaseline();
}

// --- main ---
const { data: profile, error: pe } = await admin
  .from("profiles")
  .select("id, timezone")
  .eq("email", "client@test.com")
  .maybeSingle();
if (pe) throw pe;
if (!profile?.id) {
  console.error("No profile client@test.com");
  process.exit(1);
}
const cid = profile.id;
const tz = normalizeClientTimezone(profile.timezone);

const { data: paRow, error: pae } = await admin
  .from("program_assignments")
  .select(
    "id, program_id, client_id, start_date, duration_weeks, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status"
  )
  .eq("client_id", cid)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (pae) throw pae;
if (!paRow?.id) {
  console.error("No program_assignments row for Popescu");
  process.exit(1);
}
const assignmentId = paRow.id;
const programId = paRow.program_id;

const { data: coachRow, error: ce } = await admin
  .from("clients")
  .select("coach_id")
  .eq("client_id", cid)
  .eq("status", "active")
  .maybeSingle();
if (ce) throw ce;
if (!coachRow?.coach_id) {
  const fb = await admin.from("clients").select("coach_id").eq("client_id", cid).limit(1).maybeSingle();
  if (fb.error) throw fb.error;
  if (!fb.data?.coach_id) {
    console.error("No coach_id for client");
    process.exit(1);
  }
  coachRow.coach_id = fb.data.coach_id;
}
const coachId = coachRow.coach_id;

/** Active assignment row shape for week math (use latest row fields; status may vary mid-test). */
function assignmentFieldsFromRow(row) {
  return {
    start_date: row.start_date ?? null,
    duration_weeks: row.duration_weeks ?? null,
    pause_accumulated_days: row.pause_accumulated_days ?? null,
    pause_status: row.pause_status ?? null,
    paused_at: row.paused_at ?? null,
    timezone_snapshot: row.timezone_snapshot ?? null,
  };
}

const slotsTemplate = await loadProgramSlots(admin, programId, assignmentId);
const week = getCurrentWeekBoundsForClient(tz);
const { week: ppWeek } = computeCurrentProgramWeekForAssignment(
  assignmentFieldsFromRow(paRow),
  tz
);
const anchorSlot = pickScheduledSlot(slotsTemplate, ppWeek);
if (!anchorSlot?.id) {
  console.error("No scheduled program_schedule slot for current program week — cannot run Tests 4–5");
  process.exit(1);
}

console.log("\n=== Ensure Test 1 baseline (program active + seed) ===\n");
await restoreProgramAndBaseline(admin, assignmentId);
runCron();
let latest = (await fetchLatestScores(admin, cid, 1))[0];
console.log("\n[Test 1 baseline] latest athlete_scores:", JSON.stringify(latest, null, 2));

// ----- Test 2 -----
console.log("\n========== Appendix A Test 2 — Paused skip ==========\n");
const before2 = (await fetchLatestScores(admin, cid, 1))[0];
const { error: p2e } = await admin
  .from("program_assignments")
  .update({
    pause_status: "paused",
    paused_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq("id", assignmentId);
if (p2e) throw p2e;
runCron();
const after2 = (await fetchLatestScores(admin, cid, 1))[0];
console.log("\nSELECT (latest row after paused cron):", JSON.stringify(after2, null, 2));
console.log(
  "INTERPRETATION:",
  before2.calculated_at === after2.calculated_at
    ? "Cron skipped paused client — athlete_scores.calculated_at unchanged (no upsert this week)."
    : "UNEXPECTED: calculated_at changed while assignment paused."
);
console.log(
  "UI (/client as Popescu): verify Paused badge manually — not automated in this script."
);
await restoreProgramAndBaseline(admin, assignmentId);

// ----- Test 3 -----
console.log("\n========== Appendix A Test 3 — No program ==========\n");
const before3 = (await fetchLatestScores(admin, cid, 1))[0];
const { error: p3e } = await admin
  .from("program_assignments")
  .update({
    status: "completed",
    pause_status: "active",
    paused_at: null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", assignmentId);
if (p3e) throw p3e;
runCron();
const after3 = (await fetchLatestScores(admin, cid, 1))[0];
console.log("\nSELECT (latest row after completed assignment cron):", JSON.stringify(after3, null, 2));
console.log(
  "INTERPRETATION:",
  before3.calculated_at === after3.calculated_at
    ? "Cron skipped — no active program; latest athlete_scores row unchanged."
    : "UNEXPECTED: score row updated without active program."
);
console.log(
  "UI: verify placeholder ring + “Your score will appear once you start a program” on /client manually."
);
await restoreProgramAndBaseline(admin, assignmentId);

// ----- Test 4 -----
console.log("\n========== Appendix A Test 4 — Recovery null / factor 1 ==========\n");
await admin
  .from("daily_wellness_logs")
  .delete()
  .eq("client_id", cid)
  .gte("log_date", week.mondayYmd)
  .lte("log_date", week.sundayYmd);

const { data: waIns, error: wae } = await admin
  .from("workout_assignments")
  .insert({
    client_id: cid,
    coach_id: coachId,
    workout_template_id: anchorSlot.template_id,
    name: "Appendix A Test 4 fixture",
    status: "completed",
    notes: APPENDIX_NOTE,
  })
  .select("id")
  .single();
if (wae) throw wae;

const nowIso = new Date().toISOString();
const { data: wlIns, error: wle } = await admin
  .from("workout_logs")
  .insert({
    workout_assignment_id: waIns.id,
    client_id: cid,
    started_at: nowIso,
    completed_at: nowIso,
    program_assignment_id: assignmentId,
    program_schedule_id: anchorSlot.id,
    notes: APPENDIX_NOTE,
  })
  .select("id")
  .single();
if (wle) throw wle;

runCron();
const after4 = (await fetchLatestScores(admin, cid, 1))[0];
console.log("\nSELECT:", JSON.stringify(after4, null, 2));
const recoveryOk = after4.recovery_score == null;
console.log(
  "INTERPRETATION:",
  recoveryOk
    ? "recovery_score is null (no wellness); recovery_factor defaults to 1.0 so training is not dampened — final score adds small nutrition/extras bonuses on top of the training core when those fixtures are present."
    : "Unexpected: recovery_score should be null without wellness rows."
);

// cleanup test 4
await admin.from("workout_logs").delete().eq("id", wlIns.id);
await admin.from("workout_assignments").delete().eq("id", waIns.id);
await restoreProgramAndBaseline(admin, assignmentId);

// ----- Test 5 -----
console.log("\n========== Appendix A Test 5 — Execution math ==========\n");
await restoreProgramAndBaseline(admin, assignmentId);

const { data: wsePick, error: wseeErr } = await admin
  .from("workout_set_entries")
  .select("id")
  .eq("template_id", anchorSlot.template_id)
  .eq("set_type", "straight_set")
  .limit(1)
  .maybeSingle();
if (wseeErr) throw wseeErr;
if (!wsePick?.id) {
  console.error("No straight_set workout_set_entries for template", anchorSlot.template_id);
  process.exit(1);
}
const setEntryId = wsePick.id;

const { data: wseeRows, error: wseeQ } = await admin
  .from("workout_set_entry_exercises")
  .select("id, set_entry_id, exercise_id, reps, weight_kg, rir")
  .eq("set_entry_id", setEntryId)
  .limit(1);
if (wseeQ) throw wseeQ;
const wsee = (wseeRows ?? [])[0];
if (!wsee?.exercise_id) {
  console.error("No workout_set_entry_exercises for set entry", setEntryId);
  process.exit(1);
}

const wseeBackup = {
  id: wsee.id,
  reps: wsee.reps,
  weight_kg: wsee.weight_kg,
  rir: wsee.rir,
};

const { error: upSee } = await admin
  .from("workout_set_entry_exercises")
  .update({ reps: "8", weight_kg: 80, rir: 8 })
  .eq("id", wsee.id);
if (upSee) throw upSee;

const { data: wa5, error: wa5e } = await admin
  .from("workout_assignments")
  .insert({
    client_id: cid,
    coach_id: coachId,
    workout_template_id: anchorSlot.template_id,
    name: "Appendix A Test 5 fixture",
    status: "completed",
    notes: APPENDIX_NOTE,
  })
  .select("id")
  .single();
if (wa5e) throw wa5e;

const now5 = new Date().toISOString();
const { data: wl5, error: wl5e } = await admin
  .from("workout_logs")
  .insert({
    workout_assignment_id: wa5.id,
    client_id: cid,
    started_at: now5,
    completed_at: now5,
    program_assignment_id: assignmentId,
    program_schedule_id: anchorSlot.id,
    notes: APPENDIX_NOTE,
  })
  .select("id")
  .single();
if (wl5e) throw wl5e;

const setRows = [
  { reps: 8, weight: 80, rpe: 8, set_number: 1 },
  { reps: 6, weight: 80, rpe: 8, set_number: 2 },
  { reps: 8, weight: 80, rpe: 9, set_number: 3 },
];
for (const sr of setRows) {
  const { error: se } = await admin.from("workout_set_logs").insert({
    workout_log_id: wl5.id,
    client_id: cid,
    set_entry_id: setEntryId,
    exercise_id: wsee.exercise_id,
    set_type: "straight_set",
    reps: sr.reps,
    weight: sr.weight,
    rpe: sr.rpe,
    set_number: sr.set_number,
  });
  if (se) throw se;
}

runCron();
const after5 = (await fetchLatestScores(admin, cid, 1))[0];
console.log("\nSELECT:", JSON.stringify(after5, null, 2));
const ex = after5.training_execution_score != null ? Number(after5.training_execution_score) : null;
console.log(
  "INTERPRETATION:",
  ex != null && ex >= 91 && ex <= 95
    ? `training_execution_score=${ex} (expected ~93–94 from three straight-set qualities); math spot-check OK.`
    : `training_execution_score=${ex} — outside expected ±2 band around 93; inspect prescription join.`
);

// cleanup test 5 + restore prescription
await admin.from("workout_logs").delete().eq("id", wl5.id);
await admin.from("workout_assignments").delete().eq("id", wa5.id);
await admin
  .from("workout_set_entry_exercises")
  .update({
    reps: wseeBackup.reps,
    weight_kg: wseeBackup.weight_kg,
    rir: wseeBackup.rir,
  })
  .eq("id", wsee.id);

await restoreProgramAndBaseline(admin, assignmentId);
runCron();
console.log("\n=== Final restore: Test 1 baseline re-applied ===\n");
console.log(JSON.stringify((await fetchLatestScores(admin, cid, 1))[0], null, 2));
