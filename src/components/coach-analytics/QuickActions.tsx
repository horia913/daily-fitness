"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Sparkles, Target, FileText, Zap } from "lucide-react";
import hub from "./coachAnalyticsHub.module.css";

const ACTIONS = [
  {
    key: "msg",
    title: "Message all",
    sub: "Send group msg",
    icon: MessageSquare,
    bg: "var(--fc-accent-dim)",
    fg: "var(--fc-accent)",
    href: "/coach/clients",
  },
  {
    key: "cel",
    title: "Celebrate",
    sub: "Acknowledge wins",
    icon: Sparkles,
    bg: "var(--fc-accent-dim)",
    fg: "var(--fc-accent)",
    href: "/coach",
  },
  {
    key: "goals",
    title: "Set goals",
    sub: "Update targets",
    icon: Target,
    bg: "var(--warning-soft)",
    fg: "var(--warning)",
    href: "/coach/goals",
  },
  {
    key: "rep",
    title: "Generate report",
    sub: "Export data",
    icon: FileText,
    bg: "var(--purple-soft)",
    fg: "var(--purple)",
    href: "/coach/reports",
  },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <div className={hub.sectionCard}>
      <div className={hub.sectionHead}>
        <div className={hub.sectionHeadLeft}>
          <Zap
            className="size-3 shrink-0"
            style={{ color: "var(--fc-accent)" }}
            aria-hidden
          />
          <span className={hub.sectionTitle}>Quick actions</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => router.push(a.href)}
            className="flex cursor-pointer flex-col items-start gap-1.5 rounded-[11px] border p-2.5 text-left transition-colors hover:bg-white/[0.04]"
            style={{
              background: "var(--card-2)",
              borderColor: "var(--line-2)",
            }}
          >
            <div
              className="flex size-6 items-center justify-center rounded-md"
              style={{ background: a.bg, color: a.fg }}
            >
              <a.icon className="size-3.5" strokeWidth={2} aria-hidden />
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--t1)" }}
            >
              {a.title}
            </span>
            <span
              className="text-[9.5px] leading-snug"
              style={{
                fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                color: "var(--t3)",
              }}
            >
              {a.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
