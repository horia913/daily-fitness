const fs = require("fs");
const path = require("path");

function splitCsv(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function readCsv(filePath) {
  const txt = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitCsv(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });
}

const columns = readCsv("Supabase Snippet Public Schema Column Inventory.csv");
const fks = readCsv("Supabase Snippet Public Schema Column Inventory (1).csv").filter(
  (r) =>
    r.constraint_type === "FOREIGN KEY" &&
    r.column_name &&
    r.column_name !== "null" &&
    r.foreign_table &&
    r.foreign_table !== "null" &&
    r.foreign_column &&
    r.foreign_column !== "null",
);
const policies = readCsv("Supabase Snippet Public Schema Column Inventory (2).csv").filter(
  (r) => r.schemaname === "public",
);

const colRows = columns.filter((r) => r.table_schema === "public");
const tables = [...new Set(colRows.map((r) => r.table_name))].sort();

const colMap = new Map();
for (const r of colRows) {
  if (!colMap.has(r.table_name)) colMap.set(r.table_name, []);
  colMap.get(r.table_name).push(r);
}
for (const arr of colMap.values()) {
  arr.sort((a, b) => Number(a.ordinal_position) - Number(b.ordinal_position));
}

const fkMap = new Map();
for (const r of fks) {
  if (!fkMap.has(r.table_name)) fkMap.set(r.table_name, []);
  fkMap.get(r.table_name).push(r);
}

const policyMap = new Map();
for (const p of policies) {
  if (!policyMap.has(p.tablename)) policyMap.set(p.tablename, []);
  policyMap.get(p.tablename).push(p);
}

function summarizePolicy(policy) {
  const txt = `${policy.qual || ""} ${policy.with_check || ""}`.toLowerCase();
  const bits = [];
  if (txt.includes("client_id") && txt.includes("auth.uid()")) bits.push("client owns");
  if (txt.includes("coach_id") && txt.includes("auth.uid()")) bits.push("coach owns");
  if (txt.includes("clients") && txt.includes("coach_id")) bits.push("coach owns via clients table");
  if (txt.includes("is_admin") || txt.includes("admin")) bits.push("admin override");
  if (txt.includes("true") && bits.length === 0) bits.push("broad allow guard");
  return bits.length ? bits.join("; ") : "custom predicate";
}

function purposeFor(table) {
  if (table.includes("progression_rules")) return "Stores progression prescriptions used by program and client workout flows.";
  if (table === "profiles") return "Core user profile records linked to auth identities.";
  if (table === "clients") return "Coach-client relationship mapping and status.";
  if (table === "program_assignments") return "Assigns workout programs to clients and tracks assignment lifecycle.";
  if (table === "workout_assignments") return "Assigns workout templates to clients for execution.";
  if (table === "workout_set_entries") return "Defines block/set structure inside workout templates.";
  if (table === "workout_set_logs") return "Stores per-set execution logs captured in sessions.";
  if (table === "personal_records") return "Tracks client PR records by exercise and record type.";
  return "Schema snapshot for this table.";
}

const groups = [
  ["Auth & Profiles", ["profiles", "clients", "coaches_public", "invite_codes"]],
  ["Workouts (Templates)", ["workout_templates", "workout_set_entries", "workout_set_entry_exercises", "workout_drop_sets", "workout_cluster_sets", "workout_rest_pause_sets", "workout_speed_sets", "workout_endurance_sets", "workout_time_protocols"]],
  ["Workouts (Execution & Logs)", ["workout_logs", "workout_set_logs", "workout_exercise_logs", "workout_giant_set_exercise_logs", "workout_set_details", "workout_set_entry_completions", "workout_sessions", "workout_assignments", "workout_block_assignments", "workout_exercise_assignments", "client_workout_blocks", "client_workout_block_exercises"]],
  ["Programs", ["workout_programs", "program_schedule", "program_days", "program_day_assignments", "program_day_completions", "program_assignments", "program_assignment_progress", "program_progress", "program_workout_completions", "program_progression_rules", "client_program_progression_rules", "training_blocks", "program_week_time_override", "daily_workout_cache"]],
  ["Exercises", ["exercises", "exercise_categories", "exercise_alternatives", "exercise_equipment", "exercise_instructions", "exercise_muscle_groups", "exercise_tips", "muscle_groups"]],
  ["Nutrition", ["meal_plans", "meal_plan_items", "meal_plan_assignments", "meals", "meal_options", "meal_food_items", "meal_items", "meal_completions", "meal_photo_logs", "meal_template_slots", "meal_templates", "foods", "food_log_entries", "food_slot_types", "food_tags", "nutrition_logs", "client_meal_overrides", "client_daily_plan_selection", "restriction_presets", "water_logs", "supplement_logs"]],
  ["Wellness & Body", ["daily_wellness_logs", "sleep_logs", "step_logs", "body_metrics", "progress_photos", "fms_assessments", "mobility_metrics", "performance_tests", "check_in_configs"]],
  ["Goals & Habits", ["goals", "goal_source_links", "goal_templates", "habits", "habit_logs", "habit_templates", "habit_categories"]],
  ["Reference / Static Data", ["rp_volume_landmarks", "volume_guidelines", "progression_guidelines", "tracking_sources"]],
  ["Engagement (Achievements / Leaderboard / Challenges)", ["achievements", "achievement_templates", "user_achievements", "athlete_scores", "leaderboard_entries", "leaderboard_rankings", "leaderboard_titles", "challenges", "challenge_participants", "challenge_scoring_categories", "challenge_video_submissions", "client_activities"]],
  ["Sessions & Booking", ["sessions", "booked_sessions", "coach_availability", "coach_time_slots", "clipcards", "clipcard_types", "clip_cards", "assigned_meal_plans", "assigned_workouts"]],
  ["Coach Workflow", ["coach_week_reviews", "workout_categories"]],
];

const rlsTables = [...new Set(policies.map((p) => p.tablename))];
let md = "";
md += "# DailyFitness DB Schema Snapshot (2026-04-27)\n\n";
md += "Generated from live schema query exports on 2026-04-27.\n\n";
md += "## Summary\n\n";
md += `- Tables: ${tables.length}\n`;
md += `- Tables with RLS: ${rlsTables.length}\n`;
md += `- Total columns: ${colRows.length}\n\n`;

md += "## Known Schema Drift\n\n";
md += "- `program_progression_rules` uses `set_entry_id` / `set_type` / `set_order` / `set_name`, while `client_program_progression_rules` still uses `block_id` / `block_type` / `block_order` / `block_name`; copy code translates.\n";
md += "- `program_progress` and `program_progress_v1` both exist (legacy `v1` still present).\n";
md += "- `program_day_completions` and `program_day_completions_v1` both exist.\n\n";

for (const [groupName, tableList] of groups) {
  md += `## ${groupName}\n\n`;
  for (const table of tableList) {
    md += `### \`${table}\`\n\n`;
    const cols = colMap.get(table) || [];
    if (cols.length === 0) {
      md += "_Table not found in provided export._\n\n";
      continue;
    }
    md += `${purposeFor(table)}\n\n`;
    md += "| column | type | nullable | default | fk |\n";
    md += "|---|---|---|---|---|\n";
    const fksFor = fkMap.get(table) || [];
    for (const c of cols) {
      const fk = fksFor
        .filter((f) => f.column_name === c.column_name)
        .map((f) => `\`${f.foreign_table}.${f.foreign_column}\``)
        .join(", ");
      const def = c.column_default ? `\`${String(c.column_default).replace(/\|/g, "\\|")}\`` : "null";
      md += `| \`${c.column_name}\` | \`${c.data_type}\` | ${c.is_nullable} | ${def} | ${fk || "—"} |\n`;
    }
    md += "\n";
    md += "**RLS Policies**\n\n";
    const tablePolicies = policyMap.get(table) || [];
    if (tablePolicies.length === 0) {
      md += "- None in export.\n\n";
    } else {
      for (const p of tablePolicies) {
        md += `- \`${p.policyname}\` — ${p.cmd} — ${summarizePolicy(p)}\n`;
      }
      md += "\n";
    }
  }
}

md += "---\n\n";
md += "This snapshot was generated on 2026-04-27. Run `supabase/scripts/snapshot-schema.sql` to refresh.\n";

fs.writeFileSync(path.join("docs", "schema-snapshot-2026-04-27.md"), md, "utf8");
console.log("Wrote docs/schema-snapshot-2026-04-27.md");
