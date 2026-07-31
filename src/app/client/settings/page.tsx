"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Bell, Shield, Clock } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ClientPageShell } from "@/components/client-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { ClientPrivacyPanel } from "@/components/client/privacy/ClientPrivacyPanel";
import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferencesPanel";
import {
  PsHero,
  PsSectionEyebrow,
  progressSuiteV1Styles as ps,
} from "@/components/client/progress-suite";
import { cn } from "@/lib/utils";

type PerfKey =
  | "floatingParticles"
  | "smoothAnimations"
  | "animatedBackground"
  | "batterySaver";

const PERF_ROWS: {
  key: PerfKey;
  label: string;
  description: string;
}[] = [
  {
    key: "floatingParticles",
    label: "Floating particles",
    description: "Decorative particles on some screens",
  },
  {
    key: "smoothAnimations",
    label: "Smooth animations",
    description: "Animated numbers, gauges, and transitions",
  },
  {
    key: "animatedBackground",
    label: "Animated background",
    description: "Reserved for ambient background motion (device only)",
  },
  {
    key: "batterySaver",
    label: "Battery saver",
    description: "Turns off particles and smooth animations when enabled",
  },
];

function SettingsSection({
  eyebrow,
  title,
  description,
  icon,
  accent,
  soft,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: ReactNode;
  accent: string;
  soft: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[color:var(--fc-hairline)] bg-transparent p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: soft, color: accent }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <PsSectionEyebrow accent="muted" className="mb-0.5">
            {eyebrow}
          </PsSectionEyebrow>
          <h2
            className="text-[15px] font-bold leading-tight fc-text-primary"
            style={{ fontFamily: "var(--f-display)" }}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-snug fc-text-dim">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingsToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[52px] items-center justify-between gap-3 py-3",
        !last && "border-b border-[color:var(--fc-hairline)]",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-bold leading-tight fc-text-primary"
          style={{ fontFamily: "var(--f-display)" }}
        >
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-snug fc-text-dim">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const { profile } = useAuth();
  const { performanceSettings, updatePerformanceSettings } = useTheme();

  const onToggle = (key: PerfKey, checked: boolean) => {
    if (key === "batterySaver") {
      if (checked) {
        updatePerformanceSettings({
          batterySaver: true,
          floatingParticles: false,
          smoothAnimations: false,
        });
      } else {
        updatePerformanceSettings({ batterySaver: false });
      }
      return;
    }
    updatePerformanceSettings({ [key]: checked });
  };

  const timezone =
    typeof profile?.timezone === "string" && profile.timezone.trim()
      ? profile.timezone.trim()
      : null;

  return (
    <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
      <div className={cn(ps.psV1, "space-y-4")}>
        <PsHero
          glow="action"
          onBack={() => router.push("/client/me")}
          backAriaLabel="Back to Me"
          eyebrow="Me · settings"
          eyebrowColor="var(--fc-accent)"
          title="Settings"
          subtitle="Performance, notifications, privacy, and device preferences"
        />

        <SettingsSection
          eyebrow="Device"
          title="Performance"
          description="Saved on this device only (not synced to your account)."
          icon={<Gauge className="h-4 w-4" strokeWidth={2} />}
          accent="var(--fc-accent)"
          soft="var(--fc-accent-dim)"
        >
          <div className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-3">
            {PERF_ROWS.map((row, i) => {
              const checked = performanceSettings[row.key];
              const disabledByBattery =
                performanceSettings.batterySaver &&
                (row.key === "floatingParticles" ||
                  row.key === "smoothAnimations");
              return (
                <SettingsToggleRow
                  key={row.key}
                  label={row.label}
                  description={
                    disabledByBattery
                      ? `${row.description} · Off while battery saver is on`
                      : row.description
                  }
                  checked={checked}
                  disabled={disabledByBattery}
                  onCheckedChange={(v) => onToggle(row.key, v)}
                  last={i === PERF_ROWS.length - 1}
                />
              );
            })}
          </div>
        </SettingsSection>

        {timezone ? (
          <SettingsSection
            eyebrow="Training week"
            title="Timezone"
            description="Detected automatically for your training week."
            icon={<Clock className="h-4 w-4" strokeWidth={2} />}
            accent="var(--fc-group-c)"
            soft="var(--fc-group-c-soft)"
          >
            <div className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-3.5 py-3">
              <p
                className="text-sm font-bold tabular-nums fc-text-primary"
                style={{ fontFamily: "var(--f-mono)" }}
              >
                {timezone}
              </p>
            </div>
          </SettingsSection>
        ) : null}

        <SettingsSection
          eyebrow="Alerts"
          title="Notifications"
          description="Choose which in-app alerts you want to receive."
          icon={<Bell className="h-4 w-4" strokeWidth={2} />}
          accent="var(--fc-status-warning)"
          soft="color-mix(in srgb, var(--fc-status-warning) 12%, transparent)"
        >
          <NotificationPreferencesPanel audience="client" variant="embedded" />
        </SettingsSection>

        <SettingsSection
          eyebrow="Privacy"
          title="Sharing & visibility"
          description="Who can see your data and how you appear on leaderboards."
          icon={<Shield className="h-4 w-4" strokeWidth={2} />}
          accent="var(--fc-domain-meals)"
          soft="color-mix(in srgb, var(--fc-domain-meals) 14%, transparent)"
        >
          <ClientPrivacyPanel variant="embedded" />
        </SettingsSection>
      </div>
    </ClientPageShell>
  );
}

export default function ClientSettingsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <SettingsPageContent />
    </ProtectedRoute>
  );
}
