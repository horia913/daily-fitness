"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ClientPageShell } from "@/components/client-ui/ClientPageShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Target,
  BarChart3,
  Sparkles,
  Trophy,
  Medal,
  Award,
  Activity,
  History,
  LogOut,
  Lock,
  Settings,
  UserRound,
  ChevronRight,
  Bell,
} from "lucide-react";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useUnreadNotificationCount } from "@/components/notifications/NotificationFeedList";
import {
  PsHero,
  PsSectionEyebrow,
  progressSuiteV1Styles as ps,
} from "@/components/client/progress-suite";
import { cn } from "@/lib/utils";

interface NavCard {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description?: string;
  badge?: number;
  accent: string;
  soft: string;
}

interface NavGroup {
  label: string;
  items: NavCard[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Coach",
    items: [
      {
        href: "/client/coach",
        title: "My coach",
        icon: UserRound,
        description: "Who coaches you and how to reach them",
        accent: "var(--fc-accent)",
        soft: "var(--fc-accent-dim)",
      },
    ],
  },
  {
    label: "Activity",
    items: [
      {
        href: "/client/progress/workout-logs",
        title: "Workout History",
        icon: History,
        description: "Every session you've logged",
        accent: "var(--fc-domain-workouts)",
        soft: "color-mix(in srgb, var(--fc-domain-workouts) 14%, transparent)",
      },
      {
        href: "/client/progress",
        title: "Progress",
        icon: BarChart3,
        description: "Analytics and performance tracking",
        accent: "var(--fc-group-c)",
        soft: "var(--fc-group-c-soft)",
      },
      {
        href: "/client/goals",
        title: "Goals",
        icon: Target,
        description: "Track your fitness goals",
        accent: "var(--fc-accent)",
        soft: "var(--fc-accent-dim)",
      },
      {
        href: "/client/habits",
        title: "Habits",
        icon: Sparkles,
        description: "Build healthy routines",
        accent: "var(--fc-status-warning)",
        soft: "color-mix(in srgb, var(--fc-status-warning) 12%, transparent)",
      },
      {
        href: "/client/challenges",
        title: "Challenges",
        icon: Trophy,
        description: "Join fitness challenges",
        accent: "var(--fc-accent-gold, var(--fc-status-warning))",
        soft: "color-mix(in srgb, var(--fc-accent-gold, var(--fc-status-warning)) 14%, transparent)",
      },
      {
        href: "/client/activity",
        title: "Activity Log",
        icon: Activity,
        description: "Extra training and activities",
        accent: "var(--fc-domain-workouts)",
        soft: "color-mix(in srgb, var(--fc-domain-workouts) 14%, transparent)",
      },
    ],
  },
  {
    label: "Compete",
    items: [
      {
        href: "/client/progress/leaderboard",
        title: "Leaderboards",
        icon: Medal,
        description: "See how you rank",
        accent: "var(--fc-accent-gold, var(--fc-status-warning))",
        soft: "color-mix(in srgb, var(--fc-accent-gold, var(--fc-status-warning)) 14%, transparent)",
      },
      {
        href: "/client/progress/achievements",
        title: "Achievements",
        icon: Award,
        description: "Trophy room and milestones",
        accent: "var(--fc-group-c)",
        soft: "var(--fc-group-c-soft)",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/client/profile",
        title: "Profile",
        icon: User,
        description: "Personal info, body stats, training & health",
        accent: "var(--fc-accent)",
        soft: "var(--fc-accent-dim)",
      },
      {
        href: "/client/settings",
        title: "Settings",
        icon: Settings,
        description: "Performance, privacy, and device preferences",
        accent: "var(--fc-text-dim)",
        soft: "var(--fc-surface-tint)",
      },
    ],
  },
];

function NavRow({
  card,
  onClick,
}: {
  card: Omit<NavCard, "href"> & { href?: string };
  onClick?: () => void;
}) {
  const Icon = card.icon;
  const content = (
    <>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
        style={{ background: card.soft, color: card.accent }}
        aria-hidden
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className="block text-[14px] font-bold leading-tight fc-text-primary"
          style={{ fontFamily: "var(--f-display)" }}
        >
          {card.title}
        </span>
        {card.description ? (
          <span className="mt-0.5 block line-clamp-1 text-[11px] fc-text-dim">
            {card.description}
          </span>
        ) : null}
      </span>
      {card.badge != null && card.badge > 0 ? (
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-md bg-[color:var(--fc-accent)] px-1.5 font-mono text-[10px] font-semibold text-[color:var(--fc-ink)]">
          {card.badge > 99 ? "99+" : card.badge}
        </span>
      ) : (
        <ChevronRight
          className="h-4 w-4 shrink-0 fc-text-subtle"
          aria-hidden
        />
      )}
    </>
  );

  const className =
    "flex w-full items-center gap-3 rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent px-3 py-3 transition-colors hover:bg-[color:var(--fc-surface-tint)]";

  if (card.href) {
    return (
      <Link href={card.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function MePage() {
  const { user, profile, signOut } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { count: unreadNotifications } = useUnreadNotificationCount(20_000);
  const userName = profile?.first_name || user?.email?.split("@")[0] || "there";
  const avatarUrl = profile?.avatar_url;

  const navGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => {
      if (group.label !== "Account") return group;
      const items: NavCard[] = [
        {
          href: "/client/notifications",
          title: "Notifications",
          icon: Bell,
          description: "Updates from your coach and training",
          badge: unreadNotifications,
          accent: "var(--fc-accent)",
          soft: "var(--fc-accent-dim)",
        },
        ...group.items,
      ];
      return { ...group, items };
    });
  }, [unreadNotifications]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const initials = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={cn(ps.psV1, "space-y-4")}>
          <PsHero
            glow="action"
            eyebrow="Account hub"
            eyebrowColor="var(--fc-accent)"
            title="Me"
            subtitle="Profile, progress, and settings"
          />

          <Link
            href="/client/profile"
            className="flex items-center gap-3.5 rounded-[16px] border border-[color:var(--fc-hairline)] bg-transparent p-3.5 transition-colors hover:bg-[color:var(--fc-surface-tint)]"
            aria-label="Edit profile"
          >
            <div className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[color:var(--fc-accent-glow)] bg-[color:var(--fc-accent-dim)]">
              {!hasMounted ? (
                <span
                  className="text-xl font-bold text-[color:var(--fc-accent)]"
                  style={{ fontFamily: "var(--f-display)" }}
                >
                  ·
                </span>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="text-xl font-bold text-[color:var(--fc-accent)]"
                  style={{ fontFamily: "var(--f-display)" }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[17px] font-bold leading-tight fc-text-primary"
                style={{ fontFamily: "var(--f-display)" }}
              >
                {userName}
              </p>
              {profile?.email ? (
                <p
                  className="mt-1 truncate text-xs fc-text-dim"
                  style={{ fontFamily: "var(--f-mono)" }}
                >
                  {profile.email}
                </p>
              ) : null}
              <p
                className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-accent)]"
              >
                View profile
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 fc-text-subtle"
              aria-hidden
            />
          </Link>

          <div className="flex flex-col gap-5">
            {navGroups.map((group) => (
              <section key={group.label} className="space-y-2">
                <PsSectionEyebrow accent="muted">{group.label}</PsSectionEyebrow>
                <nav className="flex flex-col gap-1.5" aria-label={group.label}>
                  {group.items.map((card) => (
                    <NavRow key={`${card.href}-${card.title}`} card={card} />
                  ))}
                  {group.label === "Account" ? (
                    <>
                      <NavRow
                        card={{
                          title: "Change password",
                          icon: Lock,
                          description: "Update your sign-in password",
                          accent: "var(--fc-text-dim)",
                          soft: "var(--fc-surface-tint)",
                        }}
                        onClick={() => setShowPasswordModal(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignOutConfirm(true)}
                        className="flex w-full items-center gap-3 rounded-[13px] border border-[color:color-mix(in_srgb,var(--fc-status-error)_22%,transparent)] bg-transparent px-3 py-3 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--fc-status-error)_8%,transparent)]"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
                          style={{
                            background:
                              "color-mix(in srgb, var(--fc-status-error) 12%, transparent)",
                            color: "var(--fc-status-error)",
                          }}
                          aria-hidden
                        >
                          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-[14px] font-bold leading-tight"
                            style={{
                              fontFamily: "var(--f-display)",
                              color: "var(--fc-status-error)",
                            }}
                          >
                            Sign out
                          </span>
                          <span className="mt-0.5 block line-clamp-1 text-[11px] fc-text-dim">
                            End your session on this device
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[color:var(--fc-status-error)] opacity-70"
                          aria-hidden
                        />
                      </button>
                    </>
                  ) : null}
                </nav>
              </section>
            ))}
          </div>
        </div>
      </ClientPageShell>

      <ChangePasswordDialog
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />

      <Dialog
        open={showSignOutConfirm}
        onOpenChange={(open) => {
          if (!open) setShowSignOutConfirm(false);
        }}
      >
        <DialogContent className="max-w-md border border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)]">
          <DialogHeader>
            <DialogTitle
              className="fc-text-primary"
              style={{ fontFamily: "var(--f-display)" }}
            >
              Sign out?
            </DialogTitle>
            <DialogDescription className="fc-text-dim">
              You will be signed out on this device. Your data stays safe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-[12px] border-[color:var(--fc-hairline)] bg-transparent"
              disabled={signingOut}
              onClick={() => setShowSignOutConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="fc-btn fc-btn-primary h-11 flex-1 rounded-[12px]"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
