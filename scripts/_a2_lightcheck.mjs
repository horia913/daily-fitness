/** READ-ONLY light adherence glance (combined, last 30d) for a few clients. Temp. */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function pageAll(table, columns, filters) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = admin.from(table).select(columns).range(from, from + 999);
    if (filters) q = filters(q);
    const { data, error } = await q; if (error) throw error;
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  return rows;
}

const end = new Date();
const start = new Date(end); start.setDate(start.getDate() - 30);
const startStr = start.toISOString().split("T")[0];
const endStr = end.toISOString().split("T")[0];

const wa = await pageAll("workout_assignments", "client_id, program_assignment_id, scheduled_date, assigned_date");
const logs = await pageAll("workout_logs", "client_id, completed_at",
  (q) => q.not("completed_at", "is", null).gte("completed_at", start.toISOString()));

const byClientAssigned = new Map();
for (const r of wa) {
  const d = (r.scheduled_date || r.assigned_date) ?? "";
  if (d >= startStr && d <= endStr) byClientAssigned.set(r.client_id, (byClientAssigned.get(r.client_id) || 0) + 1);
}
const byClientCompleted = new Map();
for (const l of logs) byClientCompleted.set(l.client_id, (byClientCompleted.get(l.client_id) || 0) + 1);

console.log("=== Combined adherence (last 30d), completed-in-window / assigned-in-window ===");
const candidates = [...byClientAssigned.entries()].filter(([, a]) => a > 0).slice(0, 6);
for (const [cid, assigned] of candidates) {
  const completed = byClientCompleted.get(cid) || 0;
  const pct = Math.round(100 * completed / assigned);
  console.log(`client ${cid.slice(0, 8)}  assigned=${assigned}  completed=${completed}  adherence=${pct}%`);
}
