import type { User } from "@supabase/supabase-js";

/**
 * Role used by PrefetchProvider / prefetch hooks.
 * Must match `profiles.role` (source of truth), not only auth metadata (often unset for coaches).
 */
export type PrefetchRole = "client" | "coach";

/**
 * Resolve which prefetch bucket to use. Path prefix wins so coach/admin routes never run
 * client-side workout block prefetch before `profiles` has loaded.
 */
export function resolvePrefetchUserRole(
  pathname: string,
  profile: { role: string } | null,
  user: User
): PrefetchRole {
  const p = pathname || "";
  if (p.startsWith("/coach") || p.startsWith("/admin")) {
    return "coach";
  }
  if (p.startsWith("/client")) {
    return "client";
  }
  const raw = (
    profile?.role ??
    (user.user_metadata as { role?: string } | undefined)?.role ??
    "client"
  )
    .toString()
    .toLowerCase();
  return raw === "client" ? "client" : "coach";
}
