/**
 * PR v2 validation — Popescu (client@test.com), six sequential log-set tests.
 * Usage: node scripts/pr-v2-validation-popescu.mjs
 * Requires: .env.local, dev server on BASE_URL (default http://localhost:3000)
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
dotenv.config({ path: join(ROOT, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = process.env.PR_TEST_BASE_URL || "http://localhost:3000";
const clientEmail = process.env.CLIENT_EMAIL || "client@test.com";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

function projectRefFromUrl(supabaseUrl) {
  const m = supabaseUrl.match(/https:\/\/([^.]+)\./);
  return m ? m[1] : "localhost";
}

function authCookieHeader(session, user) {
  const ref = projectRefFromUrl(url);
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user,
  };
  const name = `sb-${ref}-auth-token`;
  const value = encodeURIComponent(JSON.stringify(payload));
  return `${name}=${value}`;
}

async function fetchPrRows(clientId, exerciseId) {
  const { data, error } = await admin
    .from("personal_records")
    .select(
      "record_type, record_value, weight_at_record, reps_at_record, previous_record_value, improvement_percentage, is_current_record, achieved_date, created_at",
    )
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .order("record_type")
    .order("achieved_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function logSet(cookieHeader, body) {
  const res = await fetch(`${baseUrl}/api/log-set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text, parseError: true };
  }
  return { status: res.status, json };
}

function hasBothPrs(pr) {
  return !!(pr?.max_strength && pr?.strength_endurance);
}

function prSummary(pr) {
  if (!pr) return "null";
  return JSON.stringify(
    {
      max_strength: pr.max_strength ?? null,
      strength_endurance: pr.strength_endurance ?? null,
    },
    null,
    2,
  );
}

// --- Resolve Popescu ---
const { data: profile, error: pe } = await admin
  .from("profiles")
  .select("id, email")
  .eq("email", clientEmail)
  .maybeSingle();
if (pe) throw pe;
if (!profile?.id) {
  console.error("No profile for", clientEmail);
  process.exit(1);
}
const clientId = profile.id;

// --- Exercise never logged by Popescu ---
const { data: loggedEx, error: le } = await admin
  .from("workout_set_logs")
  .select("exercise_id")
  .eq("client_id", clientId)
  .not("exercise_id", "is", null);
if (le) throw le;
const loggedSet = new Set((loggedEx ?? []).map((r) => r.exercise_id));

const { data: candidates, error: ce } = await admin
  .from("exercises")
  .select("id, name")
  .limit(500);
if (ce) throw ce;

const neverLogged = (candidates ?? []).filter((e) => !loggedSet.has(e.id));
if (neverLogged.length === 0) {
  console.error("No never-logged exercise found for Popescu");
  process.exit(1);
}
const exercise = neverLogged[0];
const exerciseId = exercise.id;

console.log("=== Setup ===");
console.log("Client:", clientEmail, clientId);
console.log("Exercise (never logged):", exercise.name, exerciseId);

// --- workout_assignment + set_entry ---
const { data: wa, error: wae } = await admin
  .from("workout_assignments")
  .select("id, workout_template_id, client_id")
  .eq("client_id", clientId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (wae) throw wae;
if (!wa?.id || !wa.workout_template_id) {
  console.error("No workout_assignment with template for Popescu");
  process.exit(1);
}

const { data: setEntry, error: see } = await admin
  .from("workout_set_entries")
  .select("id")
  .eq("template_id", wa.workout_template_id)
  .limit(1)
  .maybeSingle();
if (see) throw see;
if (!setEntry?.id) {
  console.error("No workout_set_entries for template", wa.workout_template_id);
  process.exit(1);
}

const sessionId = randomUUID();
const setEntryId = setEntry.id;
const workoutAssignmentId = wa.id;

// workout_logs.workout_session_id FK requires a real workout_sessions row
const { error: sessionErr } = await admin.from("workout_sessions").insert({
  id: sessionId,
  assignment_id: workoutAssignmentId,
  client_id: clientId,
  status: "in_progress",
});
if (sessionErr) {
  console.error("Failed to create workout_sessions:", sessionErr.message);
  process.exit(1);
}

console.log("workout_assignment_id:", workoutAssignmentId);
console.log("set_entry_id:", setEntryId);
console.log("session_id:", sessionId);
console.log("API base:", baseUrl);

// --- Auth as client (magic-link OTP via service role; no password in .env) ---
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: clientEmail,
});
if (linkErr || !linkData?.properties?.email_otp) {
  console.error("generateLink failed:", linkErr?.message ?? "no otp");
  process.exit(1);
}
const { data: authData, error: authErr } = await anon.auth.verifyOtp({
  email: clientEmail,
  token: linkData.properties.email_otp,
  type: "email",
});
if (authErr || !authData.session) {
  console.error("verifyOtp failed:", authErr?.message ?? "no session");
  process.exit(1);
}
const cookieHeader = authCookieHeader(authData.session, authData.user);

let workoutLogId = null;
let setNum = 0;

async function runTest(label, weight, reps, opts = {}) {
  setNum += 1;
  const body = {
    workout_assignment_id: workoutAssignmentId,
    set_entry_id: setEntryId,
    set_type: "straight_set",
    exercise_id: exerciseId,
    weight,
    reps,
    set_number: setNum,
    session_id: sessionId,
    ...(workoutLogId ? { workout_log_id: workoutLogId } : {}),
    ...(opts.idempotency_key ? { idempotency_key: opts.idempotency_key } : {}),
  };

  console.log(`\n${"=".repeat(60)}\n${label}\n${"=".repeat(60)}`);
  console.log("Request body:", JSON.stringify(body, null, 2));

  const { status, json } = await logSet(cookieHeader, body);
  if (json.workout_log_id) workoutLogId = json.workout_log_id;

  console.log("HTTP status:", status);
  console.log("Response JSON:", JSON.stringify(json, null, 2));

  const prRows = await fetchPrRows(clientId, exerciseId);
  console.log("personal_records rows:", JSON.stringify(prRows, null, 2));

  return { status, json, body, prRows };
}

const results = [];

// Test 1
results.push(
  await runTest("Test 1 — First-ever set (50×8)", 50, 8),
);

// Test 2
results.push(await runTest("Test 2 — Both PRs (55×8)", 55, 8));

// Test 3
results.push(await runTest("Test 3 — Endurance only (55×12)", 55, 12));

// Test 4
results.push(await runTest("Test 4 — Neither (50×8)", 50, 8));

// Test 5 — dedupe
setNum += 1;
const test5Body = {
  workout_assignment_id: workoutAssignmentId,
  workout_log_id: workoutLogId,
  set_entry_id: setEntryId,
  set_type: "straight_set",
  exercise_id: exerciseId,
  weight: 60,
  reps: 10,
  set_number: setNum,
  session_id: sessionId,
  idempotency_key: `${sessionId}:${setEntryId}:${exerciseId}:${setNum}:${new Date().toISOString().split("T")[0]}`,
};

console.log(`\n${"=".repeat(60)}\nTest 5a — Dedupe replay (60×10) first send\n${"=".repeat(60)}`);
console.log("Request body:", JSON.stringify(test5Body, null, 2));
const t5a = await logSet(cookieHeader, test5Body);
console.log("HTTP status:", t5a.status);
console.log("Response JSON:", JSON.stringify(t5a.json, null, 2));
let prAfter5a = await fetchPrRows(clientId, exerciseId);
console.log("personal_records rows:", JSON.stringify(prAfter5a, null, 2));

console.log(`\n${"=".repeat(60)}\nTest 5b — Same idempotency_key (dedupe replay)\n${"=".repeat(60)}`);
const t5b = await logSet(cookieHeader, test5Body);
console.log("HTTP status:", t5b.status);
console.log("Response JSON:", JSON.stringify(t5b.json, null, 2));
let prAfter5b = await fetchPrRows(clientId, exerciseId);
console.log("personal_records rows:", JSON.stringify(prAfter5b, null, 2));
results.push({ test5a: t5a, test5b: t5b });

// Test 6
results.push(await runTest("Test 6 — Equal weight not PR (60×6)", 60, 6));

// Cleanup
console.log(`\n${"=".repeat(60)}\nCleanup\n${"=".repeat(60)}`);
const { error: delPr } = await admin
  .from("personal_records")
  .delete()
  .eq("client_id", clientId)
  .eq("exercise_id", exerciseId);
if (delPr) console.error("DELETE personal_records:", delPr.message);
else console.log("Deleted personal_records for exercise");

const { error: delSets } = await admin
  .from("workout_set_logs")
  .delete()
  .eq("client_id", clientId)
  .eq("exercise_id", exerciseId);
if (delSets) console.error("DELETE workout_set_logs:", delSets.message);
else console.log("Deleted workout_set_logs for exercise");

if (workoutLogId) {
  const { error: delLog } = await admin
    .from("workout_logs")
    .delete()
    .eq("id", workoutLogId);
  if (delLog) console.error("DELETE workout_logs:", delLog.message);
  else console.log("Deleted workout_log", workoutLogId);
}

const { error: delSession } = await admin
  .from("workout_sessions")
  .delete()
  .eq("id", sessionId);
if (delSession) console.error("DELETE workout_sessions:", delSession.message);
else console.log("Deleted workout_session", sessionId);

// Pass/fail summary
console.log(`\n${"=".repeat(60)}\nPASS/FAIL SUMMARY\n${"=".repeat(60)}`);
const t1 = results[0]?.json;
console.log(
  "Test 1:",
  hasBothPrs(t1?.pr_detected) ? "PASS" : "FAIL",
  prSummary(t1?.pr_detected),
);
const t2 = results[1]?.json;
console.log(
  "Test 2:",
  hasBothPrs(t2?.pr_detected) ? "PASS" : "FAIL",
  prSummary(t2?.pr_detected),
);
const t3 = results[2]?.json;
const t3ok =
  t3?.pr_detected?.strength_endurance &&
  !t3?.pr_detected?.max_strength;
console.log("Test 3:", t3ok ? "PASS" : "FAIL", prSummary(t3?.pr_detected));
const t4 = results[3]?.json;
console.log(
  "Test 4:",
  t4?.pr_detected == null ? "PASS" : "FAIL",
  prSummary(t4?.pr_detected),
);
const t5ok =
  t5a.json?.pr_detected &&
  hasBothPrs(t5a.json.pr_detected) &&
  t5b.json?.deduplicated === true &&
  t5b.json?.pr_detected &&
  hasBothPrs(t5b.json.pr_detected);
console.log(
  "Test 5:",
  t5ok ? "PASS" : "FAIL",
  `dedupe=${t5b.json?.deduplicated}`,
  `5b pr=${prSummary(t5b.json?.pr_detected)}`,
);
const t6 = results[4]?.json;
console.log(
  "Test 6:",
  t6?.pr_detected == null ? "PASS" : "FAIL",
  prSummary(t6?.pr_detected),
);
