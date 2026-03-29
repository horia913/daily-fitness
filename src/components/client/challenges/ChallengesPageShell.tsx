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
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 fc-page space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm fc-text-subtle mb-2 font-mono">
            <Link href={meHref} className="hover:fc-text-primary">
              Me
            </Link>
            <span>/</span>
            <span className="fc-text-primary">{breadcrumbCurrentLabel}</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight fc-text-primary">
            Challenges
          </h1>
          <p className="fc-text-dim mt-2">
            Join challenges and compete with others.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="fc-glass-soft px-4 py-2 rounded-xl border border-[color:var(--fc-glass-border)] flex items-center gap-2">
            <Trophy className="w-5 h-5 fc-text-warning" />
            <span className="font-mono text-sm font-bold fc-text-primary">
              {activeChallengesCount} active
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[color:var(--fc-glass-border)] pb-4">
        <div className="flex gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-2 text-sm font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
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
              "pb-2 text-sm font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
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
                "pb-2 text-sm font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors flex items-center gap-2",
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
              "pb-2 text-sm font-bold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors",
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
