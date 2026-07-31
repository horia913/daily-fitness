/**
 * Typed in-app notification payloads (titles/bodies/links).
 * Call createNotificationSafe from server paths, or POST /api/notifications/emit from the browser.
 */

import {
  createNotificationSafe,
  resolveCoachIdForClient,
  type CreateNotificationInput,
} from "@/lib/inAppNotificationService";
import type { SupabaseClient } from "@supabase/supabase-js";

function actorName(profile?: { first_name?: string | null } | null): string {
  const n = profile?.first_name?.trim();
  return n || "Your coach";
}

function clientDisplayName(profile?: { first_name?: string | null } | null): string {
  const n = profile?.first_name?.trim();
  return n || "Client";
}

/** Browser → emit API. Never throws. */
export async function emitInAppNotification(
  body: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/notifications/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[inAppNotifications] emit failed:", e);
  }
}

export function notifyClientProgramAssigned(input: {
  clientId: string;
  actorId: string;
  programName: string;
  assignmentId: string;
  admin?: SupabaseClient;
}): void {
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_program_assigned",
      actorId: input.actorId,
      title: "Program assigned",
      body: input.programName,
      link: "/client/train",
      data: { assignment_id: input.assignmentId, program_name: input.programName },
      dedupeKey: `program:${input.assignmentId}`,
    },
    input.admin
  );
}

export function notifyClientWorkoutAssigned(input: {
  clientId: string;
  actorId: string;
  workoutName: string;
  assignmentId: string;
  admin?: SupabaseClient;
}): void {
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_workout_assigned",
      actorId: input.actorId,
      title: "Workout assigned",
      body: input.workoutName,
      link: `/client/workouts/${input.assignmentId}/start`,
      data: { assignment_id: input.assignmentId, workout_name: input.workoutName },
      dedupeKey: `workout:${input.assignmentId}`,
    },
    input.admin
  );
}

export function notifyClientCoachNote(input: {
  clientId: string;
  actorId: string;
  weekNumber: number;
  notePreview?: string | null;
  programAssignmentId: string;
  admin?: SupabaseClient;
}): void {
  const preview = input.notePreview?.trim();
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_coach_note",
      actorId: input.actorId,
      title: "Coach note",
      body: preview
        ? `Week ${input.weekNumber}: ${preview.slice(0, 120)}${preview.length > 120 ? "…" : ""}`
        : `Week ${input.weekNumber}`,
      link: "/client/train",
      data: {
        program_assignment_id: input.programAssignmentId,
        week_number: input.weekNumber,
      },
      dedupeKey: `weeknote:${input.programAssignmentId}:${input.weekNumber}:${Date.now()}`,
      dedupeWindowHours: 1,
    },
    input.admin
  );
}

export function notifyClientTestRecorded(input: {
  clientId: string;
  actorId: string;
  testKind: "mobility" | "performance" | "strength";
  testId: string;
  admin?: SupabaseClient;
}): void {
  const label =
    input.testKind === "mobility"
      ? "Mobility assessment"
      : input.testKind === "performance"
        ? "Performance test"
        : "Strength test";
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_test_recorded",
      actorId: input.actorId,
      title: "Test recorded",
      body: label,
      link: "/client/progress",
      data: { test_kind: input.testKind, test_id: input.testId },
      dedupeKey: `test:${input.testKind}:${input.testId}`,
    },
    input.admin
  );
}

export function notifyClientMeasurementRecorded(input: {
  clientId: string;
  actorId: string;
  measurementId: string;
  admin?: SupabaseClient;
}): void {
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_measurement_recorded",
      actorId: input.actorId,
      title: "Measurement recorded",
      body: "Your coach logged body measurements",
      link: "/client/check-ins",
      data: { measurement_id: input.measurementId },
      dedupeKey: `measurement:${input.measurementId}`,
    },
    input.admin
  );
}

export function notifyClientPr(input: {
  clientId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  prIds: string[];
  admin?: SupabaseClient;
}): void {
  const dedupe = input.prIds.sort().join(",") || `pr:${input.exerciseName}:${input.weight}x${input.reps}`;
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_pr",
      title: "Personal record",
      body: `${input.exerciseName} · ${input.weight} × ${input.reps}`,
      link: "/client/progress/personal-records",
      data: { exercise_name: input.exerciseName, pr_ids: input.prIds },
      dedupeKey: `client_pr:${dedupe}`,
    },
    input.admin
  );
}

export async function notifyCoachClientPr(input: {
  clientId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  prIds: string[];
  clientName?: string;
  admin?: SupabaseClient;
}): Promise<void> {
  try {
    const coachId = await resolveCoachIdForClient(
      input.clientId,
      input.admin as SupabaseClient | undefined
    );
    if (!coachId) return;
    const dedupe = input.prIds.sort().join(",") || `pr:${input.exerciseName}`;
    const name = input.clientName || "Client";
    createNotificationSafe(
      {
        recipientId: coachId,
        typeKey: "coach_client_pr",
        actorId: input.clientId,
        title: "Client PR",
        body: `${name} · ${input.exerciseName} · ${input.weight} × ${input.reps}`,
        link: `/coach/clients/${input.clientId}`,
        data: {
          client_id: input.clientId,
          exercise_name: input.exerciseName,
          pr_ids: input.prIds,
        },
        dedupeKey: `coach_pr:${dedupe}`,
      },
      input.admin
    );
  } catch (e) {
    console.error("[inAppNotifications] notifyCoachClientPr:", e);
  }
}

export function notifyClientAchievement(input: {
  clientId: string;
  achievementName: string;
  templateId: string;
  tier?: string | null;
  admin?: SupabaseClient;
}): void {
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_achievement",
      title: "Achievement unlocked",
      body: input.tier
        ? `${input.achievementName} · ${input.tier}`
        : input.achievementName,
      link: "/client/progress/achievements",
      data: {
        template_id: input.templateId,
        tier: input.tier ?? null,
      },
      dedupeKey: `ach:${input.templateId}:${input.tier ?? "base"}`,
    },
    input.admin
  );
}

export function notifyClientChallengeInvite(input: {
  clientId: string;
  actorId: string;
  challengeId: string;
  challengeName: string;
  admin?: SupabaseClient;
}): void {
  createNotificationSafe(
    {
      recipientId: input.clientId,
      typeKey: "client_challenge_invite",
      actorId: input.actorId,
      title: "Challenge invite",
      body: input.challengeName,
      link: `/client/challenges/${input.challengeId}`,
      data: { challenge_id: input.challengeId },
      dedupeKey: `invite:${input.challengeId}:${input.clientId}`,
    },
    input.admin
  );
}

export async function notifyCoachWorkoutCompleted(input: {
  clientId: string;
  workoutLogId: string;
  workoutName?: string | null;
  clientName?: string;
  admin?: SupabaseClient;
}): Promise<void> {
  try {
    const coachId = await resolveCoachIdForClient(
      input.clientId,
      input.admin as SupabaseClient | undefined
    );
    if (!coachId) return;
    const name = input.clientName || "Client";
    const body = input.workoutName
      ? `${name} · ${input.workoutName}`
      : `${name} completed a workout`;
    createNotificationSafe(
      {
        recipientId: coachId,
        typeKey: "coach_workout_completed",
        actorId: input.clientId,
        title: "Workout completed",
        body,
        link: `/coach/clients/${input.clientId}/workout-logs/${input.workoutLogId}`,
        data: {
          client_id: input.clientId,
          workout_log_id: input.workoutLogId,
        },
        dedupeKey: `wl:${input.workoutLogId}`,
      },
      input.admin
    );
  } catch (e) {
    console.error("[inAppNotifications] notifyCoachWorkoutCompleted:", e);
  }
}

export async function notifyCoachCheckinLogged(input: {
  clientId: string;
  logDate: string;
  clientName?: string;
  admin?: SupabaseClient;
}): Promise<void> {
  try {
    const coachId = await resolveCoachIdForClient(
      input.clientId,
      input.admin as SupabaseClient | undefined
    );
    if (!coachId) return;
    const name = input.clientName || "Client";
    createNotificationSafe(
      {
        recipientId: coachId,
        typeKey: "coach_checkin_logged",
        actorId: input.clientId,
        title: "Daily check-in",
        body: `${name} · ${input.logDate}`,
        link: `/coach/clients/${input.clientId}/check-ins`,
        data: { client_id: input.clientId, log_date: input.logDate },
        dedupeKey: `checkin:${input.clientId}:${input.logDate}`,
      },
      input.admin
    );
  } catch (e) {
    console.error("[inAppNotifications] notifyCoachCheckinLogged:", e);
  }
}

export async function notifyCoachPeriodicalCheckin(input: {
  clientId: string;
  periodKey?: string | null;
  clientName?: string;
  admin?: SupabaseClient;
}): Promise<void> {
  try {
    const coachId = await resolveCoachIdForClient(
      input.clientId,
      input.admin as SupabaseClient | undefined
    );
    if (!coachId) return;
    const name = input.clientName || "Client";
    const key = input.periodKey || new Date().toISOString().slice(0, 10);
    createNotificationSafe(
      {
        recipientId: coachId,
        typeKey: "coach_periodical_checkin",
        actorId: input.clientId,
        title: "Periodical check-in",
        body: name,
        link: `/coach/clients/${input.clientId}/check-ins`,
        data: { client_id: input.clientId, period_key: key },
        dedupeKey: `periodical:${input.clientId}:${key}`,
      },
      input.admin
    );
  } catch (e) {
    console.error("[inAppNotifications] notifyCoachPeriodicalCheckin:", e);
  }
}

export function notifyCoachChallengeActivity(input: {
  coachId: string;
  clientId: string;
  challengeId: string;
  challengeName: string;
  activity: "joined" | "completed";
  clientName?: string;
  admin?: SupabaseClient;
}): void {
  const name = input.clientName || "Client";
  createNotificationSafe(
    {
      recipientId: input.coachId,
      typeKey: "coach_challenge_activity",
      actorId: input.clientId,
      title:
        input.activity === "joined" ? "Challenge joined" : "Challenge completed",
      body: `${name} · ${input.challengeName}`,
      link: `/coach/challenges/${input.challengeId}`,
      data: {
        client_id: input.clientId,
        challenge_id: input.challengeId,
        activity: input.activity,
      },
      dedupeKey: `chal:${input.activity}:${input.challengeId}:${input.clientId}`,
    },
    input.admin
  );
}

export function notifyCoachNewClient(input: {
  coachId: string;
  clientId: string;
  clientName?: string;
  admin?: SupabaseClient;
}): void {
  const name = input.clientName || "New client";
  createNotificationSafe(
    {
      recipientId: input.coachId,
      typeKey: "coach_new_client",
      actorId: input.clientId,
      title: "New client",
      body: name,
      link: `/coach/clients/${input.clientId}`,
      data: { client_id: input.clientId },
      dedupeKey: `newclient:${input.clientId}`,
    },
    input.admin
  );
}

export async function notifyClientWorkoutDue(input: {
  clientId: string;
  dateYmd: string;
  admin?: SupabaseClient;
}): Promise<{ id: string } | null> {
  const { createNotification } = await import("@/lib/inAppNotificationService");
  return createNotification(
    {
      recipientId: input.clientId,
      typeKey: "client_workout_due",
      title: "Workout due today",
      body: "You have a scheduled session",
      link: "/client/train",
      data: { date: input.dateYmd },
      dedupeKey: `due:${input.clientId}:${input.dateYmd}`,
    },
    input.admin
  );
}

export async function notifyClientWorkoutMissed(input: {
  clientId: string;
  dateYmd: string;
  admin?: SupabaseClient;
}): Promise<{ id: string } | null> {
  const { createNotification } = await import("@/lib/inAppNotificationService");
  return createNotification(
    {
      recipientId: input.clientId,
      typeKey: "client_workout_missed",
      title: "Missed workout",
      body: input.dateYmd,
      link: "/client/train",
      data: { date: input.dateYmd },
      dedupeKey: `missed:${input.clientId}:${input.dateYmd}`,
    },
    input.admin
  );
}

export async function notifyCoachWorkoutMissedThreshold(input: {
  coachId: string;
  clientId: string;
  clientName?: string;
  missedCount: number;
  weekEndYmd: string;
  admin?: SupabaseClient;
}): Promise<{ id: string } | null> {
  const { createNotification } = await import("@/lib/inAppNotificationService");
  const name = input.clientName || "Client";
  return createNotification(
    {
      recipientId: input.coachId,
      typeKey: "coach_workout_missed",
      actorId: input.clientId,
      title: "Missed sessions",
      body: `${name} · ${input.missedCount} in the last 7 days`,
      link: `/coach/clients/${input.clientId}`,
      data: {
        client_id: input.clientId,
        missed_count: input.missedCount,
        week_end: input.weekEndYmd,
      },
      dedupeKey: `coach_missed:${input.clientId}:${input.weekEndYmd}`,
    },
    input.admin
  );
}

export async function notifyCoachClientInactive(input: {
  coachId: string;
  clientId: string;
  clientName?: string;
  inactiveDays: number;
  lastTrainYmd: string | null;
  admin?: SupabaseClient;
}): Promise<{ id: string } | null> {
  const { createNotification } = await import("@/lib/inAppNotificationService");
  const name = input.clientName || "Client";
  const spellKey = input.lastTrainYmd ?? "never";
  return createNotification(
    {
      recipientId: input.coachId,
      typeKey: "coach_client_inactive",
      actorId: input.clientId,
      title: "Client inactive",
      body: `${name} · no training in ${input.inactiveDays}+ days`,
      link: `/coach/clients/${input.clientId}`,
      data: {
        client_id: input.clientId,
        inactive_days: input.inactiveDays,
        last_train: input.lastTrainYmd,
      },
      dedupeKey: `inactive:${input.clientId}:${spellKey}`,
    },
    input.admin
  );
}

/** Re-export for callers that need the raw create shape. */
export type { CreateNotificationInput };
export { actorName, clientDisplayName };
