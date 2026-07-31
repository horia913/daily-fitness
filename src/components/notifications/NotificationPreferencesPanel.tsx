"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  listActiveNotificationTypes,
  listNotificationPreferences,
  setNotificationPreference,
  type NotificationAudience,
  type NotificationCategory,
  type NotificationTypeRow,
} from "@/lib/inAppNotificationService";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  training: "Training",
  nutrition: "Nutrition",
  progress: "Progress",
  social: "Social",
  account: "Account",
};

const CATEGORY_ORDER: NotificationCategory[] = [
  "training",
  "nutrition",
  "progress",
  "social",
  "account",
];

type Props = {
  audience: NotificationAudience;
  className?: string;
  /** When embedded in Settings, nest under the parent section card. */
  variant?: "standalone" | "embedded";
};

export function NotificationPreferencesPanel({
  audience,
  className,
  variant = "standalone",
}: Props) {
  const { user } = useAuth();
  const [types, setTypes] = useState<NotificationTypeRow[]>([]);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [catalog, prefs] = await Promise.all([
        listActiveNotificationTypes(audience),
        listNotificationPreferences(user.id),
      ]);
      // client_checkin_due stays phase-2+/hidden until that job exists
      const visible = catalog.filter((t) => t.key !== "client_checkin_due");
      setTypes(visible);
      const map: Record<string, boolean> = {};
      for (const t of visible) {
        const pref = prefs.find((p) => p.type_key === t.key);
        map[t.key] =
          pref != null ? pref.in_app_enabled === true : t.default_enabled !== false;
      }
      setEnabledMap(map);
    } finally {
      setLoading(false);
    }
  }, [audience, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const byCat = new Map<NotificationCategory, NotificationTypeRow[]>();
    for (const t of types) {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      category: c,
      label: CATEGORY_LABEL[c],
      items: byCat.get(c)!,
    }));
  }, [types]);

  const onToggle = async (typeKey: string, checked: boolean) => {
    if (!user?.id) return;
    setSavingKey(typeKey);
    setEnabledMap((m) => ({ ...m, [typeKey]: checked }));
    const ok = await setNotificationPreference({
      userId: user.id,
      typeKey,
      inAppEnabled: checked,
    });
    if (!ok) {
      setEnabledMap((m) => ({ ...m, [typeKey]: !checked }));
    }
    setSavingKey(null);
  };

  if (loading) {
    return (
      <div className={className}>
        <p
          className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-3.5 py-3 text-xs fc-text-dim"
          style={{ fontFamily: "var(--f-mono)" }}
        >
          Loading notification settings…
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={cn(variant === "embedded" ? "space-y-3" : "space-y-6", className)}>
      {groups.map((g) => (
        <div key={g.category}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
            >
              {g.label}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] fc-text-subtle">
              In-app
            </p>
          </div>
          <div className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-3">
            {g.items.map((t, i) => (
              <div
                key={t.key}
                className={cn(
                  "flex min-h-[52px] items-center justify-between gap-3 py-3",
                  i < g.items.length - 1 &&
                    "border-b border-[color:var(--fc-hairline)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-bold leading-tight fc-text-primary"
                    style={{ fontFamily: "var(--f-display)" }}
                  >
                    {t.display_name}
                  </p>
                  {t.description ? (
                    <p className="mt-0.5 text-[11px] leading-snug fc-text-dim">
                      {t.description}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={enabledMap[t.key] ?? true}
                  disabled={savingKey === t.key}
                  onCheckedChange={(v) => void onToggle(t.key, v)}
                  aria-label={t.display_name}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
