/**
 * Read-only: latest athlete_scores row for client@test.com (service role).
 * Usage: node scripts/query-popescu-latest-athlete-score.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

const { data: prof, error: pe } = await admin
  .from("profiles")
  .select("id")
  .eq("email", "client@test.com")
  .maybeSingle();
if (pe) throw pe;
if (!prof?.id) {
  console.log("No profile client@test.com");
  process.exit(0);
}

const { data: row, error: ae } = await admin
  .from("athlete_scores")
  .select(
    "score, tier, training_score, training_completion_score, recovery_score, recovery_sleep_score, recovery_steps_score, nutrition_score, extras_score, window_start, window_end, calculated_at"
  )
  .eq("client_id", prof.id)
  .order("calculated_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (ae) throw ae;
console.log(JSON.stringify(row, null, 2));
