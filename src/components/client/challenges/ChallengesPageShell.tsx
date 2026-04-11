"use client";

import React from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChallengesListTab = "all" | "my" | "invited" | "history";

export interface ChallengesPageShellProps {
  activeChallengesCount: number;
  invitedCount: number;
  showInvitedTab: boolean;
  activeTab: ChallengesListTab;
  setActiveTab: (t: ChallengesListTab) => void;
  /** Breadcrumb + title area: default Me / Challenges */
  breadcrumbCurrentLabel?: string;
  meHref?: string;
  children: React.ReactNode;
}

export function ChallengesPageShell({
  activeChallengesCount,
  invitedCount,
  showInvitedTab,
  activeTab,
  setActiveTab,
  breadcrumbCurrentLabel = "Challenges",
  meHref = "/client/me",
  children,
}: ChallengesPageShellProps) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-32 pt-6 fc-page space-y-4 overflow-x-hidden">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav className="flex items-center gap-2 text-xs fc-text-subtle mb-1 font-mono">
            <Link href={meHref} className="hover:fc-text-primary">
              Me
            </Link>
            <span>/</span>
            <span className="fc-text-primary">{breadcrumbCurrentLabel}</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight fc-text-primary">
            Challenges
          </h1>
          <p className="text-xs fc-text-dim mt-1">
            Join challenges and compete with others.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="fc-glass-soft px-3 py-1.5 rounded-lg border border-[color:var(--fc-glass-border)] flex items-center gap-1.5">
            <Trophy className="w-4 h-4 fc-text-warning" />
            <span className="font-mono text-xs font-bold fc-text-primary">
              {activeChallengesCount} active
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[color:var(--fc-glass-border)] pb-2">
        <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 w-full min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
              activeTab === "all"
                ? "fc-text-primary border-[color:var(--fc-status-error)]"
                : "fc-text-subtle border-transparent hover:fc-text-primary"
            )}
          >
            Browse all
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={cn(
              "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
              activeTab === "my"
                ? "fc-text-primary border-[color:var(--fc-status-error)]"
                : "fc-text-subtle border-transparent hover:fc-text-primary"
            )}
          >
            My challenges
          </button>
          {showInvitedTab && (
            <button
              type="button"
              onClick={() => setActiveTab("invited")}
              className={cn(
                "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors flex items-center gap-2",
                activeTab === "invited"
                  ? "fc-text-primary border-[color:var(--fc-status-error)]"
                  : "fc-text-subtle border-transparent hover:fc-text-primary"
              )}
            >
              Invited
              <span className="w-5 h-5 rounded-full bg-[var(--fc-accent-cyan)] text-white text-[10px] flex items-center justify-center font-bold">
                {invitedCount}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-1.5 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
              activeTab === "history"
                ? "fc-text-primary border-[color:var(--fc-status-error)]"
                : "fc-text-subtle border-transparent hover:fc-text-primary"
            )}
          >
            History
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
