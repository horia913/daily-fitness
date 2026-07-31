"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HabitLibraryModal } from "@/components/client-habits";
import { ConfirmActionDialog } from "@/components/client-ui";
import { supabase } from "@/lib/supabase";
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
} from "@/lib/clientZonedCalendar";
import { Check, Circle, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import {
  addHabitFromTemplate,
  deleteHabit,
  fetchActiveTemplates,
  fetchClientHabits,
  toggleManualLogToday,
  updateHabitTarget,
  type ClientHabitWithTemplate,
  type HabitTemplateRow,
} from "@/lib/habitTemplateService";
import {
  deriveCompletion,
  STUB_SOURCE_TYPES,
  workoutLogsToCompletedYmds,
  type HabitSourceData,
} from "@/lib/habitAutoTracking";
import { HabitLucideIcon } from "@/components/client/habitLucideIcon";

const CATEGORY_ORDER = [
  "hydration",
  "nutrition",
  "movement",
  "sleep_recovery",
  "mindfulness",
  "lifestyle",
  "checkin",
] as const;

const CATEGORY_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  hydration: "Hydration",
  nutrition: "Nutrition",
  movement: "Movement",
  sleep_recovery: "Sleep & Recovery",
  mindfulness: "Mindfulness",
  lifestyle: "Lifestyle",
  checkin: "Check-in adherence",
};

/** Mobile: centered card (safe-area margins + max-h clears tab bar). md+: centered modal. */
const habitDialogSurfaceClass = cn(
  "fc-modal flex min-h-0 flex-col gap-0 overflow-hidden p-0 outline-none",
  "z-[10030] min-w-0 overflow-x-hidden box-border",
  // Mobile: center in viewport (horizontal + vertical)
  "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  "w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.5rem)] max-w-lg",
  "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5.25rem))]",
  "rounded-2xl border border-[color:var(--fc-glass-border)] shadow-2xl",
  // md+: same centering, standard desktop max height
  "md:max-h-[min(88dvh,calc(100dvh-1rem))]",
  "md:w-full md:max-w-lg md:shadow-lg md:overflow-x-visible",
);

function isManualLike(t: HabitTemplateRow): boolean {
  return t.source_type === "manual" || STUB_SOURCE_TYPES.has(t.source_type);
}

function formatWellnessValue(field: string, value: number): string {
  if (field === "sleep_hours") return `${value}h`;
  if (field === "steps") return `${Math.round(value)}`;
  return `${value}`;
}

function formatTargetLabel(field: string, target: number): string {
  if (field === "sleep_hours") return `${target}h`;
  if (field === "steps") return `${Math.round(target)}`;
  return `${target}`;
}

function formatTodayAutoLine(
  habit: ClientHabitWithTemplate,
  derived: ReturnType<typeof deriveCompletion>,
): string {
  if (!derived) return "";
  const st = habit.template.source_type;
  if (st === "wellness_check") {
    if (derived.done) return "Auto: ✓ check-in";
    return "No check-in yet";
  }
  if (st === "workout_logged") {
    if (derived.done) return "Auto: ✓ workout";
    return "No workout today";
  }
  if (st === "wellness_field") {
    const field = String(habit.template.source_config?.field ?? "");
    if (derived.missingData && derived.value == null) return "No check-in yet";
    if (derived.done && derived.value != null) {
      return `Auto: ✓ ${formatWellnessValue(field, Number(derived.value))}`;
    }
    if (
      derived.value != null &&
      derived.target != null &&
      typeof derived.target === "number"
    ) {
      return `Auto: ${formatWellnessValue(field, Number(derived.value))} (target ${formatTargetLabel(field, derived.target)})`;
    }
    return "No check-in yet";
  }
  return "";
}

function buildTargetFromForm(
  template: HabitTemplateRow,
  form: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...template.default_target };
  for (const key of template.user_configurable_keys) {
    const raw = form[key]?.trim() ?? "";
    if (!raw) continue;
    if (key === "bedtime") {
      out[key] = raw;
      continue;
    }
    const n = Number.parseFloat(raw);
    if (!Number.isNaN(n)) out[key] = n;
  }
  return out;
}

function buildTargetFromEditForm(
  habit: ClientHabitWithTemplate,
  form: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...habit.target };
  for (const key of habit.template.user_configurable_keys) {
    const raw = form[key]?.trim() ?? "";
    if (!raw) continue;
    if (key === "bedtime") {
      out[key] = raw;
      continue;
    }
    const n = Number.parseFloat(raw);
    if (!Number.isNaN(n)) out[key] = n;
  }
  return out;
}

function initialConfigureForm(
  template: HabitTemplateRow,
): Record<string, string> {
  const d = template.default_target ?? {};
  const o: Record<string, string> = {};
  for (const key of template.user_configurable_keys) {
    const v = d[key];
    if (v == null) o[key] = "";
    else o[key] = typeof v === "number" ? String(v) : String(v);
  }
  return o;
}

function initialEditForm(
  habit: ClientHabitWithTemplate,
): Record<string, string> {
  const t = habit.target ?? {};
  const o: Record<string, string> = {};
  for (const key of habit.template.user_configurable_keys) {
    const v = t[key];
    if (v == null) o[key] = "";
    else o[key] = typeof v === "number" ? String(v) : String(v);
  }
  return o;
}

function inputModeForKey(key: string): "text" | "number" {
  if (key === "bedtime") return "text";
  return "number";
}

interface HabitTrackerProps {
  userId: string;
}

export default function HabitTracker({ userId }: HabitTrackerProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [habits, setHabits] = useState<ClientHabitWithTemplate[]>([]);
  const [logsByHabit, setLogsByHabit] = useState<Record<string, Set<string>>>(
    {},
  );
  const [sourceBundle, setSourceBundle] = useState<HabitSourceData | null>(
    null,
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerView, setPickerView] = useState<"library" | "configure">(
    "library",
  );
  const [configureTemplate, setConfigureTemplate] =
    useState<HabitTemplateRow | null>(null);
  const [configureForm, setConfigureForm] = useState<Record<string, string>>(
    {},
  );

  const [editHabit, setEditHabit] = useState<ClientHabitWithTemplate | null>(
    null,
  );
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [pendingDeleteHabit, setPendingDeleteHabit] =
    useState<ClientHabitWithTemplate | null>(null);
  const [deletingHabit, setDeletingHabit] = useState(false);

  const [savingHabit, setSavingHabit] = useState(false);
  const [togglingHabitId, setTogglingHabitId] = useState<string | null>(null);

  const todayYmd = useMemo(
    () => zonedCalendarDateString(new Date(), timezone),
    [timezone],
  );
  const weekStart = useMemo(
    () => mondayYmdOfZonedWeekContaining(new Date(), timezone),
    [timezone],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDaysYmd(weekStart, i)),
    [weekStart],
  );

  const ownedTemplateIds = useMemo(
    () => new Set(habits.map((h) => h.template_id)),
    [habits],
  );

  const loadPageData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .maybeSingle();

      const userTz = normalizeClientTimezone(profileData?.timezone);
      setTimezone(userTz);

      const weekStartLocal = mondayYmdOfZonedWeekContaining(new Date(), userTz);
      const weekEndLocal = addCalendarDaysYmd(weekStartLocal, 6);
      const { startIso, endIso } = (() => {
        const a = zonedDayInclusiveUtcBounds(weekStartLocal, userTz).startIso;
        const b = zonedDayInclusiveUtcBounds(weekEndLocal, userTz).endIso;
        return { startIso: a, endIso: b };
      })();

      const habitRows = await fetchClientHabits(userId);
      setHabits(habitRows);

      const manualIds = habitRows
        .filter((h) => isManualLike(h.template))
        .map((h) => h.id);

      const [wellnessRes, workoutRes] = await Promise.all([
        supabase
          .from("daily_wellness_logs")
          .select("log_date, sleep_hours, sleep_quality, stress_level, steps")
          .eq("client_id", userId)
          .gte("log_date", weekStartLocal)
          .lte("log_date", weekEndLocal),
        supabase
          .from("workout_logs")
          .select("completed_at")
          .eq("client_id", userId)
          .not("completed_at", "is", null)
          .gte("completed_at", startIso)
          .lte("completed_at", endIso),
      ]);

      if (wellnessRes.error) throw wellnessRes.error;
      if (workoutRes.error) throw workoutRes.error;

      let logRows: { habit_id: string; log_date: string }[] = [];
      if (manualIds.length > 0) {
        const { data, error } = await supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("client_id", userId)
          .in("habit_id", manualIds)
          .gte("log_date", weekStartLocal)
          .lte("log_date", weekEndLocal);
        if (error) throw error;
        logRows = data ?? [];
      }

      const wellnessByYmd = new Map<string, (typeof wellnessRes.data)[0]>();
      for (const row of wellnessRes.data ?? []) {
        if (row?.log_date) wellnessByYmd.set(row.log_date, row);
      }

      const workoutYmds = workoutLogsToCompletedYmds(
        workoutRes.data ?? [],
        userTz,
      );

      setSourceBundle({
        clientTimezone: userTz,
        wellnessByYmd,
        workoutCompletedYmds: workoutYmds,
      });

      const grouped: Record<string, Set<string>> = {};
      for (const row of logRows) {
        if (!grouped[row.habit_id]) grouped[row.habit_id] = new Set();
        grouped[row.habit_id].add(row.log_date);
      }
      setLogsByHabit(grouped);
    } catch (error) {
      console.error("Error loading habits:", error);
      addToast({ title: "Failed to load habits", variant: "destructive" });
      setHabits([]);
      setLogsByHabit({});
      setSourceBundle(null);
    } finally {
      setLoading(false);
    }
  }, [addToast, userId]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const [allTemplates, setAllTemplates] = useState<HabitTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const openPicker = async () => {
    setPickerView("library");
    setConfigureTemplate(null);
    setPickerOpen(true);
    setTemplatesLoading(true);
    try {
      const t = await fetchActiveTemplates();
      setAllTemplates(t);
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not load library", variant: "destructive" });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const pickableTemplates = useMemo(
    () => allTemplates.filter((t) => !ownedTemplateIds.has(t.id)),
    [allTemplates, ownedTemplateIds],
  );

  const onPickConfigurable = (template: HabitTemplateRow) => {
    setConfigureTemplate(template);
    setConfigureForm(initialConfigureForm(template));
    setPickerView("configure");
  };

  const handleCommitSession = async (templateIds: string[]) => {
    if (templateIds.length === 0) return;
    setSavingHabit(true);
    try {
      for (const id of templateIds) {
        const t = allTemplates.find((x) => x.id === id);
        if (!t || t.user_configurable_keys.length > 0) continue;
        const { error } = await addHabitFromTemplate(userId, t.id, {
          ...t.default_target,
        });
        if (error) throw error;
      }
      addToast({
        title: templateIds.length === 1 ? "Habit added" : "Habits added",
        variant: "success",
      });
      setPickerOpen(false);
      setPickerView("library");
      setConfigureTemplate(null);
      await loadPageData();
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not add habit", variant: "destructive" });
    } finally {
      setSavingHabit(false);
    }
  };

  const saveConfigure = async () => {
    if (!configureTemplate) return;
    for (const key of configureTemplate.user_configurable_keys) {
      if (!configureForm[key]?.trim()) {
        addToast({
          title: `Please set ${key.replace(/_/g, " ")}`,
          variant: "default",
        });
        return;
      }
    }
    setSavingHabit(true);
    try {
      const target = buildTargetFromForm(configureTemplate, configureForm);
      const { error } = await addHabitFromTemplate(
        userId,
        configureTemplate.id,
        target,
      );
      if (error) throw error;
      addToast({ title: "Habit added", variant: "success" });
      setPickerOpen(false);
      setPickerView("library");
      setConfigureTemplate(null);
      await loadPageData();
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not add habit", variant: "destructive" });
    } finally {
      setSavingHabit(false);
    }
  };

  const openEdit = (habit: ClientHabitWithTemplate) => {
    setEditHabit(habit);
    setEditForm(initialEditForm(habit));
  };

  const saveEdit = async () => {
    if (!editHabit) return;
    if (editHabit.template.user_configurable_keys.length === 0) {
      setEditHabit(null);
      return;
    }
    for (const key of editHabit.template.user_configurable_keys) {
      if (!editForm[key]?.trim()) {
        addToast({
          title: `Please set ${key.replace(/_/g, " ")}`,
          variant: "default",
        });
        return;
      }
    }
    setEditSaving(true);
    try {
      const target = buildTargetFromEditForm(editHabit, editForm);
      const { error } = await updateHabitTarget(editHabit.id, target);
      if (error) throw error;
      addToast({ title: "Habit updated", variant: "success" });
      setEditHabit(null);
      await loadPageData();
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not save", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const removeHabit = async (habit: ClientHabitWithTemplate) => {
    try {
      const { error } = await deleteHabit(habit.id);
      if (error) throw error;
      addToast({ title: "Habit deleted", variant: "success" });
      setEditHabit(null);
      setPendingDeleteHabit(null);
      await loadPageData();
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not delete", variant: "destructive" });
    } finally {
      setDeletingHabit(false);
    }
  };

  const onToggleManual = async (habit: ClientHabitWithTemplate) => {
    if (!isManualLike(habit.template)) return;
    setTogglingHabitId(habit.id);
    try {
      const { result, error } = await toggleManualLogToday(
        habit.id,
        userId,
        todayYmd,
      );
      if (error) throw error;
      if (result === "error") throw new Error("toggle failed");
      await loadPageData();
      if (result === "inserted") {
        addToast({ title: "Habit logged", variant: "success" });
      } else if (result === "deleted") {
        addToast({ title: "Log cleared", variant: "success" });
      }
    } catch (e) {
      console.error(e);
      addToast({ title: "Could not update log", variant: "destructive" });
    } finally {
      setTogglingHabitId(null);
    }
  };

  const dayDone = (
    habit: ClientHabitWithTemplate,
    dayYmd: string,
    bundle: HabitSourceData | null,
  ): boolean => {
    if (isManualLike(habit.template)) {
      return logsByHabit[habit.id]?.has(dayYmd) ?? false;
    }
    if (!bundle) return false;
    const d = deriveCompletion(habit, dayYmd, bundle);
    return Boolean(d?.done);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-4 text-sm fc-text-dim">
        Loading habits…
      </div>
    );
  }

  const bundle = sourceBundle;

  return (
    <div className="relative space-y-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 shrink text-lg font-semibold fc-text-primary">
          My Habits
        </h2>
        <Button
          type="button"
          className="fc-btn fc-btn-primary h-10 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm sm:px-4"
          onClick={() => void openPicker()}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Add habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-8 text-center">
          <p className="text-sm fc-text-dim">
            No habits yet. Tap + to pick from the library.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const manual = isManualLike(habit.template);
            const stub = STUB_SOURCE_TYPES.has(habit.template.source_type);
            const logSet = logsByHabit[habit.id] ?? new Set<string>();
            const doneToday = manual
              ? logSet.has(todayYmd)
              : bundle
                ? Boolean(deriveCompletion(habit, todayYmd, bundle)?.done)
                : false;
            const derivedToday =
              !manual && bundle
                ? deriveCompletion(habit, todayYmd, bundle)
                : null;
            const todayLine = manual
              ? null
              : formatTodayAutoLine(habit, derivedToday);

            return (
              <article
                key={habit.id}
                className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-base)]">
                      <HabitLucideIcon
                        name={habit.template.icon}
                        className="h-5 w-5 fc-text-primary"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold fc-text-primary">
                        {habit.template.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {stub ? (
                          <Badge variant="secondary" className="text-xs">
                            Auto-tracking activates soon
                          </Badge>
                        ) : null}
                      </div>
                      {habit.template.description ? (
                        <p className="mt-2 text-sm fc-text-dim">
                          {habit.template.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="fc-btn fc-btn-secondary h-8 w-8 p-0"
                      onClick={() => openEdit(habit)}
                      aria-label={`Edit ${habit.template.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="fc-btn fc-btn-secondary h-8 w-8 p-0"
                      onClick={() => setPendingDeleteHabit(habit)}
                      aria-label={`Delete ${habit.template.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    {weekDays.map((day) => {
                      const isToday = day === todayYmd;
                      const done = isManualLike(habit.template)
                        ? logSet.has(day)
                        : bundle
                          ? dayDone(habit, day, bundle)
                          : false;
                      const inPast = day < todayYmd;
                      const inFuture = day > todayYmd;
                      return (
                        <div
                          key={`${habit.id}-${day}`}
                          className={cn(
                            "relative flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                            done
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-[color:var(--fc-glass-border)] fc-text-dim",
                            isToday &&
                              "ring-2 ring-[color:var(--fc-accent)]",
                          )}
                          title={day}
                        >
                          {done ? (
                            <Check className="h-4 w-4" />
                          ) : inPast ? (
                            <X className="h-3 w-3 opacity-40" />
                          ) : inFuture ? (
                            <Circle className="h-3 w-3 opacity-40" />
                          ) : (
                            <Circle className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {manual ? (
                  <Button
                    type="button"
                    className={cn(
                      "mt-4 h-11 w-full",
                      doneToday
                        ? "fc-btn fc-btn-secondary"
                        : "fc-btn fc-btn-primary",
                    )}
                    onClick={() => void onToggleManual(habit)}
                    disabled={togglingHabitId === habit.id}
                  >
                    {doneToday ? "Logged ✓" : `Log ${habit.template.name}`}
                  </Button>
                ) : todayLine ? (
                  <p className="mt-4 text-sm fc-text-dim">{todayLine}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <HabitLibraryModal
        open={pickerOpen}
        view={pickerView}
        onClose={() => {
          setPickerOpen(false);
          setPickerView("library");
          setConfigureTemplate(null);
        }}
        templatesLoading={templatesLoading}
        pickableTemplates={pickableTemplates}
        categoryOrder={CATEGORY_ORDER}
        categoryLabel={CATEGORY_LABEL as Record<string, string>}
        isManualLike={isManualLike}
        isAutoTracked={(t) => !isManualLike(t)}
        savingHabit={savingHabit}
        onCommitSession={handleCommitSession}
        onPickConfigurable={onPickConfigurable}
        configureTemplate={configureTemplate}
        configureForm={configureForm}
        setConfigureForm={setConfigureForm}
        onSaveConfigure={() => saveConfigure()}
        onBackConfigure={() => {
          setPickerView("library");
          setConfigureTemplate(null);
        }}
        inputModeForKey={inputModeForKey}
      />

      <Dialog
        open={Boolean(editHabit)}
        onOpenChange={(o) => !o && setEditHabit(null)}
      >
        <DialogContent layout="unstyled" className={habitDialogSurfaceClass}>
          <DialogHeader className="shrink-0 space-y-1 border-b border-[color:var(--fc-glass-border)] px-4 pb-3 pt-4 pr-12 text-left sm:px-6 sm:pr-14 sm:pt-6">
            <DialogTitle>Edit habit</DialogTitle>
            <DialogDescription>
              <span className="font-medium fc-text-primary">
                {editHabit?.template.name}
              </span>
              <span className="fc-text-dim">
                {" "}
                — template cannot be changed.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-6">
            {editHabit &&
            editHabit.template.user_configurable_keys.length === 0 ? (
              <p className="text-sm fc-text-dim">
                This habit has no numeric settings to edit.
              </p>
            ) : (
              <div className="space-y-3">
                {editHabit?.template.user_configurable_keys.map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm capitalize fc-text-primary">
                      {key.replace(/_/g, " ")}
                    </label>
                    <Input
                      type={inputModeForKey(key)}
                      inputMode={key === "bedtime" ? "text" : "decimal"}
                      value={editForm[key] ?? ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 space-y-2 border-t border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-base)] px-4 py-3 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                className="fc-btn fc-btn-primary flex-1"
                disabled={
                  editSaving ||
                  !editHabit ||
                  editHabit.template.user_configurable_keys.length === 0
                }
                onClick={() => void saveEdit()}
              >
                {editSaving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                className="fc-btn fc-btn-secondary"
                onClick={() => setEditHabit(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={pendingDeleteHabit != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteHabit(null);
        }}
        title={`Delete “${pendingDeleteHabit?.template.name ?? "habit"}”?`}
        description="Your logged history for this habit will be removed."
        confirmLabel="Delete habit"
        confirming={deletingHabit}
        variant="destructive"
        onConfirm={() => {
          if (!pendingDeleteHabit) return;
          setDeletingHabit(true);
          void removeHabit(pendingDeleteHabit);
        }}
      />
    </div>
  );
}
