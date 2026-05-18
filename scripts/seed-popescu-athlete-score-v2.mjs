/**
 * Test fixture: Popescu (client@test.com) only — week 2026-05-11 .. 2026-05-17.
 * Mirrors seeds/seed_popescu_athlete_score_v2_week_20260511.sql using the service role.
 *
 * Usage: node scripts/seed-popescu-athlete-score-v2.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const WEEK_START = "2026-05-11";
const WEEK_END = "2026-05-17";
const FIXTURE_NOTE = "__AS_V2_FIXTURE__";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

function zonedYmd(date, timeZone) {
  return date.toLocaleDateString("en-CA", { timeZone });
}

/** UTC ISO for a given local wall-clock time on `ymd` in `timeZone`. */
function utcIsoForLocalDateTime(ymd, timeZone, hour, minute) {
  const start = Date.parse(`${ymd}T00:00:00Z`) - 48 * 3600000;
  const end = Date.parse(`${ymd}T23:59:59Z`) + 48 * 3600000;
  for (let t = start; t <= end; t += 60000) {
    const d = new Date(t);
    if (zonedYmd(d, timeZone) !== ymd) continue;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    if (hh === hour && mm === minute) return d.toISOString();
  }
  throw new Error(`Could not resolve local ${hour}:${minute} on ${ymd} in ${timeZone}`);
}

function* eachDayYmd() {
  let cur = new Date(`${WEEK_START}T12:00:00Z`);
  const end = new Date(`${WEEK_END}T12:00:00Z`);
  while (cur <= end) {
    yield cur.toISOString().slice(0, 10);
    cur = new Date(cur.getTime() + 86400000);
  }
}

const { data: profile, error: pe } = await admin
  .from("profiles")
  .select("id, timezone")
  .eq("email", "client@test.com")
  .maybeSingle();
if (pe) throw pe;
if (!profile?.id) {
  console.error("No profile with email client@test.com");
  process.exit(1);
}
const cid = profile.id;
const tz = profile.timezone && String(profile.timezone).trim() ? profile.timezone : "UTC";

let { data: coachRow, error: ce } = await admin
  .from("clients")
  .select("coach_id")
  .eq("client_id", cid)
  .eq("status", "active")
  .maybeSingle();
if (ce) throw ce;
if (!coachRow?.coach_id) {
  const fb = await admin.from("clients").select("coach_id").eq("client_id", cid).limit(1).maybeSingle();
  if (fb.error) throw fb.error;
  coachRow = fb.data;
}
if (!coachRow?.coach_id) {
  console.error("No clients.coach_id for client@test.com (required for meal_plan_assignments)");
  process.exit(1);
}
const coachId = coachRow.coach_id;

// --- Zero training: delete workout_logs in client-local week ---
const { data: logsRaw, error: le } = await admin
  .from("workout_logs")
  .select("id, completed_at")
  .eq("client_id", cid)
  .not("completed_at", "is", null)
  .gte("completed_at", "2026-05-08T00:00:00.000Z")
  .lte("completed_at", "2026-05-21T00:00:00.000Z");
if (le) throw le;
const logIds = (logsRaw ?? [])
  .filter((row) => {
    const y = zonedYmd(new Date(row.completed_at), tz);
    return y >= WEEK_START && y <= WEEK_END;
  })
  .map((r) => r.id);
if (logIds.length) {
  const { error: de } = await admin.from("workout_logs").delete().in("id", logIds);
  if (de) throw de;
  console.log("Deleted workout_logs in week:", logIds.length);
} else {
  console.log("No workout_logs to delete in target week.");
}

// --- Fixture cleanup ---
await admin.from("meal_completions").delete().eq("client_id", cid).eq("notes", FIXTURE_NOTE);
await admin
  .from("client_activities")
  .delete()
  .eq("client_id", cid)
  .eq("notes", FIXTURE_NOTE)
  .gte("activity_date", WEEK_START)
  .lte("activity_date", WEEK_END);
await admin
  .from("daily_wellness_logs")
  .delete()
  .eq("client_id", cid)
  .gte("log_date", WEEK_START)
  .lte("log_date", WEEK_END);

// --- Perfect recovery ---
const wellnessRows = [...eachDayYmd()].map((log_date) => ({
  client_id: cid,
  log_date,
  sleep_hours: 8,
  steps: 10000,
}));
const { error: we } = await admin.from("daily_wellness_logs").upsert(wellnessRows, {
  onConflict: "client_id,log_date",
});
if (we) throw we;
console.log("Upserted daily_wellness_logs:", wellnessRows.length);

// --- Perfect nutrition: one active assignment + 7 completions ---
await admin.from("meal_plan_assignments").update({ is_active: false }).eq("client_id", cid);

const { data: mp, error: mpe } = await admin
  .from("meal_plans")
  .insert({
    coach_id: coachId,
    name: "Athlete score v2 fixture (safe to delete)",
    is_active: true,
  })
  .select("id")
  .single();
if (mpe) throw mpe;

const { data: meal, error: mele } = await admin
  .from("meals")
  .insert({
    meal_plan_id: mp.id,
    name: "Fixture breakfast",
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
  start_date: "2026-05-01",
  end_date: null,
  is_active: true,
  notes: "Athlete score v2 fixture — delete with meal_plan / meals",
});
if (mpae) throw mpae;

const completions = [...eachDayYmd()].map((d) => ({
  meal_id: meal.id,
  client_id: cid,
  completed_at: utcIsoForLocalDateTime(d, tz, 12, 0),
  notes: FIXTURE_NOTE,
}));
const { error: mce } = await admin.from("meal_completions").insert(completions);
if (mce) throw mce;
console.log("Inserted meal_completions:", completions.length);

// --- Perfect extras ---
const { error: cae } = await admin.from("client_activities").insert([
  {
    client_id: cid,
    activity_type: "running",
    duration_minutes: 30,
    intensity: "vigorous",
    activity_date: "2026-05-11",
    notes: FIXTURE_NOTE,
  },
  {
    client_id: cid,
    activity_type: "running",
    duration_minutes: 30,
    intensity: "vigorous",
    activity_date: "2026-05-13",
    notes: FIXTURE_NOTE,
  },
  {
    client_id: cid,
    activity_type: "running",
    duration_minutes: 30,
    intensity: "vigorous",
    activity_date: "2026-05-15",
    notes: FIXTURE_NOTE,
  },
]);
if (cae) throw cae;
console.log("Inserted client_activities: 3");

console.log("Done. Run cron, then query athlete_scores.");
