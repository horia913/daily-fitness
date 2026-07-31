/**
 * In-app notification service — create (service-role) + read/prefs (RLS recipient).
 * Notification failures never throw into the caller's happy path.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type NotificationAudience = "client" | "coach";
export type NotificationCategory =
  | "training"
  | "nutrition"
  | "progress"
  | "social"
  | "account";

export type NotificationTypeRow = {
  key: string;
  audience: NotificationAudience;
  display_name: string;
  description: string | null;
  category: NotificationCategory;
  default_enabled: boolean;
  sort_order: number;
  is_active: boolean;
};

export type InAppNotification = {
  id: string;
  recipient_id: string;
  type_key: string;
  actor_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreference = {
  user_id: string;
  type_key: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
};

export type CreateNotificationInput = {
  recipientId: string;
  typeKey: string;
  actorId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Record<string, unknown> | null;
  /** Stable id for de-dupe (e.g. workout_log_id). Stored in data.dedupe_key. */
  dedupeKey?: string | null;
  /** De-dupe window in hours (default 24). */
  dedupeWindowHours?: number;
};

const DEDUPE_DEFAULT_HOURS = 24;

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[inAppNotifications] Missing Supabase admin env");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/**
 * Create a notification (service-role only).
 * Skips if type inactive, preference disabled, or duplicate within window.
 * Never throws — returns null on skip/failure.
 */
export async function createNotification(
  input: CreateNotificationInput,
  adminClient?: SupabaseClient
): Promise<{ id: string } | null> {
  try {
    const admin = adminClient ?? getAdminClient();
    if (!admin) return null;

    const { data: typeRow, error: typeErr } = await admin
      .from("notification_types")
      .select("key, default_enabled, is_active")
      .eq("key", input.typeKey)
      .maybeSingle();

    if (typeErr || !typeRow || typeRow.is_active === false) {
      return null;
    }

    const { data: pref } = await admin
      .from("notification_preferences")
      .select("in_app_enabled")
      .eq("user_id", input.recipientId)
      .eq("type_key", input.typeKey)
      .maybeSingle();

    const enabled =
      pref != null
        ? pref.in_app_enabled === true
        : typeRow.default_enabled !== false;
    if (!enabled) return null;

    const dedupeKey = input.dedupeKey?.trim() || null;
    const windowHours = input.dedupeWindowHours ?? DEDUPE_DEFAULT_HOURS;
    if (dedupeKey) {
      const since = hoursAgoIso(windowHours);
      const { data: existing } = await admin
        .from("notifications")
        .select("id, data")
        .eq("recipient_id", input.recipientId)
        .eq("type_key", input.typeKey)
        .gte("created_at", since)
        .limit(40);
      const dup = (existing ?? []).find(
        (row) =>
          row.data &&
          typeof row.data === "object" &&
          (row.data as { dedupe_key?: string }).dedupe_key === dedupeKey
      );
      if (dup) return null;
    }

    const dataPayload: Record<string, unknown> = {
      ...(input.data ?? {}),
    };
    if (dedupeKey) dataPayload.dedupe_key = dedupeKey;

    const { data: inserted, error: insertErr } = await admin
      .from("notifications")
      .insert({
        recipient_id: input.recipientId,
        type_key: input.typeKey,
        actor_id: input.actorId ?? null,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        data: dataPayload,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[inAppNotifications] insert failed:", insertErr);
      return null;
    }
    return { id: inserted.id as string };
  } catch (e) {
    console.error("[inAppNotifications] createNotification swallowed:", e);
    return null;
  }
}

/** Fire-and-forget wrapper — never rejects. */
export function createNotificationSafe(
  input: CreateNotificationInput,
  adminClient?: SupabaseClient
): void {
  void createNotification(input, adminClient).catch((e) => {
    console.error("[inAppNotifications] createNotificationSafe:", e);
  });
}

// ── Recipient reads (RLS) ───────────────────────────────────────────────

export async function listNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<InAppNotification[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  let q = supabase
    .from("notifications")
    .select(
      "id, recipient_id, type_key, actor_id, title, body, link, data, read_at, created_at"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (options?.unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) {
    console.error("[inAppNotifications] listNotifications:", error);
    return [];
  }
  return (data ?? []) as InAppNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[inAppNotifications] getUnreadNotificationCount:", error);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) {
    console.error("[inAppNotifications] markNotificationRead:", error);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) {
    console.error("[inAppNotifications] markAllNotificationsRead:", error);
    return false;
  }
  return true;
}

export async function deleteNotification(
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);
  if (error) {
    console.error("[inAppNotifications] deleteNotification:", error);
    return false;
  }
  return true;
}

export async function listActiveNotificationTypes(
  audience: NotificationAudience
): Promise<NotificationTypeRow[]> {
  const { data, error } = await supabase
    .from("notification_types")
    .select(
      "key, audience, display_name, description, category, default_enabled, sort_order, is_active"
    )
    .eq("audience", audience)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[inAppNotifications] listActiveNotificationTypes:", error);
    return [];
  }
  return (data ?? []) as NotificationTypeRow[];
}

export async function listNotificationPreferences(
  userId: string
): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("user_id, type_key, in_app_enabled, push_enabled")
    .eq("user_id", userId);
  if (error) {
    console.error("[inAppNotifications] listNotificationPreferences:", error);
    return [];
  }
  return (data ?? []) as NotificationPreference[];
}

export async function setNotificationPreference(input: {
  userId: string;
  typeKey: string;
  inAppEnabled: boolean;
}): Promise<boolean> {
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: input.userId,
      type_key: input.typeKey,
      in_app_enabled: input.inAppEnabled,
      push_enabled: false,
    },
    { onConflict: "user_id,type_key" }
  );
  if (error) {
    console.error("[inAppNotifications] setNotificationPreference:", error);
    return false;
  }
  return true;
}

/** Resolve coach_id for a client (admin or user client). */
export async function resolveCoachIdForClient(
  clientId: string,
  db?: SupabaseClient
): Promise<string | null> {
  const client = db ?? supabase;
  const { data } = await client
    .from("clients")
    .select("coach_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.coach_id as string | undefined) ?? null;
}
