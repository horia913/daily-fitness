"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** DB sometimes stores Lucide-style keys ("star", "weight") instead of emoji. */
function isAsciiIconKey(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && t.length < 48 && /^[a-z][a-z0-9_-]*$/i.test(t);
}

function toPascalCaseKey(raw: string): string {
  return raw
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

function resolveLucideIcon(raw: string): LucideIcon | null {
  const key = toPascalCaseKey(raw);
  const icons = LucideIcons as Record<string, unknown>;
  const Icon = icons[key];
  if (typeof Icon === "function") return Icon as LucideIcon;
  return null;
}

export function AchievementIconDisplay({
  icon,
  className,
  style,
}: {
  icon: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}) {
  const raw = (icon ?? "").trim();
  if (!raw) {
    const Fallback = LucideIcons.Trophy;
    return <Fallback className={className} style={style} />;
  }

  if (isAsciiIconKey(raw)) {
    const Resolved = resolveLucideIcon(raw);
    if (Resolved) {
      return <Resolved className={className} style={style} />;
    }
    const Fallback = LucideIcons.Trophy;
    return <Fallback className={className} style={style} />;
  }

  return (
    <span className={className} style={style}>
      {raw}
    </span>
  );
}
