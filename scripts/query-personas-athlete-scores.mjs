/**
 * Latest athlete_scores row per test persona (current week preferred).
 * Usage: node scripts/query-personas-athlete-scores.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  PERSONA_EMAILS,
  getCurrentWeekBoundsForClient,
} from "./lib/personaSeedShared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);

const cols =
  "client_id, score, tier, training_score, training_completion_score, training_execution_score, recovery_score, nutrition_score, extras_score, window_start, window_end, calculated_at";

const rows = [];

for (const [name, email] of Object.entries(PERSONA_EMAILS)) {
  const { data: prof } = await admin.from("profiles").select("id, timezone").eq("email", email).maybeSingle();
  if (!prof?.id) {
    rows.push({ persona: name, email, error: "no profile" });
    continue;
  }
  const week = getCurrentWeekBoundsForClient(prof.timezone);
  const { data: weekRow } = await admin
    .from("athlete_scores")
    .select(cols)
    .eq("client_id", prof.id)
    .eq("window_start", week.mondayYmd)
    .eq("window_end", week.sundayYmd)
    .maybeSingle();

  const { data: latest } = weekRow
    ? { data: weekRow }
    : await admin
        .from("athlete_scores")
        .select(cols)
        .eq("client_id", prof.id)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const { data: pa } = await admin
    .from("program_assignments")
    .select("status, pause_status")
    .eq("client_id", prof.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  rows.push({
    persona: name,
    email,
    program_status: pa?.status ?? "—",
    pause_status: pa?.pause_status ?? "—",
    ...(latest ?? { score: null, note: "no row" }),
  });
}

console.log("\n| Persona | Score | Tier | Training | Completion | Execution | Recovery | Nutrition | Extras | Window | calculated_at |");
console.log("|---------|------:|------|----------:|-----------:|----------:|---------:|----------:|-------:|--------|---------------|");
for (const r of rows) {
  if (r.error) {
    console.log(`| ${r.persona} | — | ${r.error} |`);
    continue;
  }
  const fmt = (n) => (n == null ? "—" : Math.round(Number(n)));
  console.log(
    `| ${r.persona} | ${fmt(r.score)} | ${r.tier ?? "—"} | ${fmt(r.training_score)} | ${fmt(r.training_completion_score)} | ${fmt(r.training_execution_score)} | ${fmt(r.recovery_score)} | ${fmt(r.nutrition_score)} | ${fmt(r.extras_score)} | ${r.window_start ?? "—"} | ${r.calculated_at ? String(r.calculated_at).slice(0, 19) : "—"} |`
  );
}
console.log("\nProgram states:", rows.map((r) => `${r.persona}: status=${r.program_status} pause=${r.pause_status}`).join("; "));
