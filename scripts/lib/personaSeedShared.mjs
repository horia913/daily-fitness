/**
 * Shared helpers for test persona athlete-score v2 seeding.
 * Personas only: alice/bob/carol/dan/eve @dailyfitness.app
 */

export const FIXTURE_NOTE = "__PERSONA_AS_V2__";

export const PERSONA_EMAILS = {
  alice: "alice.test@dailyfitness.app",
  bob: "bob.test@dailyfitness.app",
  carol: "carol.test@dailyfitness.app",
  dan: "dan.test@dailyfitness.app",
  eve: "eve.test@dailyfitness.app",
};

export function normalizeClientTimezone(raw) {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : "UTC";
}

export function zonedCalendarDateString(now, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDaysYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

export function diffCalendarDaysYmd(ymdStart, ymdEnd) {
  const [ys, ms, ds] = ymdStart.split("-").map(Number);
  const [ye, me, de] = ymdEnd.split("-").map(Number);
  return Math.floor((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000);
}

export function zonedYmdFromIsoTimestamp(iso, timeZone) {
  return zonedCalendarDateString(new Date(iso), timeZone);
}

function weekdayMon0Sun6InTimezone(instant, timeZone) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    weekday: "short",
  }).format(instant);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

export function mondayYmdOfZonedWeekContaining(now, timeZone) {
  const todayYmd = zonedCalendarDateString(now, timeZone);
  const dow = weekdayMon0Sun6InTimezone(now, timeZone);
  return addCalendarDaysYmd(todayYmd, -dow);
}

function midnightInTimezone(dateStr, ianaTimezone) {
  try {
    const d = new Date(dateStr + "T12:00:00.000Z");
    const formatter = new Intl.DateTimeFormat("en-GB", {
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
    return new Date(d.getTime() - msFromMidnight).toISOString();
  } catch {
    return new Date(dateStr + "T00:00:00.000Z").toISOString();
  }
}

function zonedDayInclusiveUtcBounds(ymd, timeZone) {
  const tz = timeZone || "UTC";
  const startIso = midnightInTimezone(ymd, tz);
  const nextYmd = addCalendarDaysYmd(ymd, 1);
  const nextStartMs = Date.parse(midnightInTimezone(nextYmd, tz));
  return { startIso, endIso: new Date(nextStartMs - 1).toISOString() };
}

export function getCurrentWeekBoundsForClient(clientTimeZone, now = new Date()) {
  const timeZone = normalizeClientTimezone(clientTimeZone);
  const mondayYmd = mondayYmdOfZonedWeekContaining(now, timeZone);
  const sundayYmd = addCalendarDaysYmd(mondayYmd, 6);
  const { startIso: weekStartUtcIso } = zonedDayInclusiveUtcBounds(mondayYmd, timeZone);
  const { endIso: weekEndUtcIso } = zonedDayInclusiveUtcBounds(sundayYmd, timeZone);
  return { weekStartUtcIso, weekEndUtcIso, mondayYmd, sundayYmd, timeZone };
}

export function utcIsoForLocalDateTime(ymd, timeZone, hour, minute) {
  const start = Date.parse(`${ymd}T00:00:00Z`) - 48 * 3600000;
  const end = Date.parse(`${ymd}T23:59:59Z`) + 48 * 3600000;
  for (let t = start; t <= end; t += 60000) {
    const d = new Date(t);
    if (zonedCalendarDateString(d, timeZone) !== ymd) continue;
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

export function* eachDayYmd(mondayYmd, sundayYmd) {
  let cur = new Date(`${mondayYmd}T12:00:00Z`);
  const end = new Date(`${sundayYmd}T12:00:00Z`);
  while (cur <= end) {
    yield cur.toISOString().slice(0, 10);
    cur = new Date(cur.getTime() + 86400000);
  }
}

function computeCurrentProgramWeek(args) {
  const startYmd = (args.assignmentStartDate || "").slice(0, 10);
  if (!startYmd) return 1;
  const pauseAccum = Math.max(0, Number(args.pauseAccumulatedDays) || 0);
  const effectiveStartYmd = addCalendarDaysYmd(startYmd, pauseAccum);
  const pausedYmd =
    args.pauseStatus === "paused" && args.pausedAt
      ? zonedYmdFromIsoTimestamp(args.pausedAt, args.clientTimezone)
      : null;
  const effectiveTargetYmd =
    pausedYmd && args.targetYmd > pausedYmd ? pausedYmd : args.targetYmd;
  return (
    Math.floor(Math.max(0, diffCalendarDaysYmd(effectiveStartYmd, effectiveTargetYmd)) / 7) + 1
  );
}

export function computeCurrentProgramWeekForAssignment(assignment, clientTimezoneFallback, targetYmdOverride) {
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
  return { week: Math.min(floored, cap), clamped: floored > cap };
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

export async function loadProgramSlots(admin, programId, assignmentId) {
  const [pdaRes, psRes] = await Promise.all([
    admin
      .from("program_day_assignments")
      .select(
        "id, program_assignment_id, day_number, program_day, workout_template_id, is_optional"
      )
      .eq("program_assignment_id", assignmentId)
      .order("day_number", { ascending: true }),
    admin
      .from("program_schedule")
      .select("id, program_id, week_number, day_number, day_of_week, template_id, is_optional")
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
    return {
      id: ps?.id ?? null,
      week_number: snap.week_number,
      day_number: snap.program_day,
      template_id: templateId || templateFromMaster || "",
      is_optional: snap.is_optional ?? false,
    };
  });
}

export function scheduledSlotsForWeek(slots, ppWeek) {
  return slots.filter(
    (s) =>
      s.week_number === ppWeek &&
      !s.is_optional &&
      s.id != null &&
      typeof s.template_id === "string" &&
      s.template_id.length > 0
  );
}

const prescriptionCache = new Map();

export async function getStraightSetPrescription(admin, templateId) {
  const cached = prescriptionCache.get(templateId);
  if (cached !== undefined) return cached;

  const { data: entry, error: ee } = await admin
    .from("workout_set_entries")
    .select("id")
    .eq("template_id", templateId)
    .eq("set_type", "straight_set")
    .limit(1)
    .maybeSingle();
  if (ee) throw ee;
  if (!entry?.id) {
    prescriptionCache.set(templateId, null);
    return null;
  }

  const { data: wseeRows, error: we } = await admin
    .from("workout_set_entry_exercises")
    .select("id, set_entry_id, exercise_id, reps, weight_kg, rir")
    .eq("set_entry_id", entry.id)
    .limit(1);
  if (we) throw we;
  const wsee = (wseeRows ?? [])[0];
  if (!wsee?.exercise_id) throw new Error(`No WSEE for template ${templateId}`);

  const result = { setEntryId: entry.id, wsee };
  prescriptionCache.set(templateId, result);
  return result;
}
