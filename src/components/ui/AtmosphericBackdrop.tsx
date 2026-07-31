"use client";

/**
 * AtmosphericBackdrop — v4 Atmospheric backdrop atomic (Option 2: layered)
 *
 * Spec refs: design-system-v4 §3 (Atmospheric backdrops — five role-based
 *             variants), §15.2 (component conventions). Class set:
 *             .fc-backdrop-{action-top,action-bottom,info,warning,achievement}
 *             — ui-system.css 1.B.3.
 *
 * Phase 0a / 0b note (per user decision):
 *   - AnimatedBackground is NOT modified. AtmosphericBackdrop renders on TOP
 *     of AnimatedBackground inside the page shells. Cyan stays as the system /
 *     ambient color in the background; action appears only via the role-based
 *     overlay on action-dominant screens. This preserves action's meaning as the
 *     action color.
 *   - In Phase 0a this component is built and showcased in /dev/v4-lab. It is
 *     NOT yet wired into ClientPageShell / CoachPageShell — that wiring is a
 *     Phase 0b decision (Task 10) because it changes a shared component used
 *     by all screens.
 *
 * Phase 0a: additive only.
 * Phase 0b: prop renamed `fixed` → `absolute` (Task 2). The implementation
 *           applies position: absolute, not position: fixed; the previous
 *           name was misleading. Done before any caller integration.
 * Phase 1 Screen 1: `"error"` variant added (V1 decision) so tier-driven
 *           backdrops on /client home can map "benched" → red halo.
 *           Backed by the new `.fc-backdrop-error` rule in ui-system.css.
 */

import React from "react";

export type AtmosphericVariant =
  | "action-top"
  | "action-bottom"
  | "info"
  | "warning"
  | "achievement"
  | "error";

export interface AtmosphericBackdropProps {
  variant: AtmosphericVariant;
  /**
   * If true (default), the backdrop is positioned `absolute inset-0` and
   * ignores pointer events. Set to false if the consumer wants to control
   * position (e.g. to render the backdrop inside a relative wrapper of a
   * specific size, or to apply custom positioning via `className`).
   */
  absolute?: boolean;
  className?: string;
}

export function AtmosphericBackdrop(_props: AtmosphericBackdropProps) {
  // Retired per design-system effect budget — page-level atmospheric layers are outside the sanctioned effects.
  return null;
}

export default AtmosphericBackdrop;
