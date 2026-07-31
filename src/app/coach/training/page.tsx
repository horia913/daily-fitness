"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchApi } from "@/lib/apiClient";
import type { TrainingHubStats } from "@/lib/coachTrainingHubStats";
import {
  BookOpen,
  Layers,
  Library,
  Activity,
  ClipboardList,
  ChevronRight,
  Tag,
  FolderTree,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  GYM_CONSOLE_BOARD_MAX,
  GYM_CONSOLE_BOARD_STORAGE_KEY,
} from "@/components/coach/gym-console-v2/boardStorage";
import styles from "@/components/coach/coachTrainingHub.module.css";

const GYM_STORAGE_KEY = GYM_CONSOLE_BOARD_STORAGE_KEY;

/** Shipped destination hues — keep exactly as today. */
const HUE = {
  programs: "var(--fc-group-c)",
  templates: "#8B5CF6", // violet-500
  exercises: "#10B981", // emerald-500
  challenges: "#F43F5E", // rose-500
  gym: "#F59E0B", // amber-500
  testing: "#0EA5E9", // sky-500
} as const;

type PrimaryKey =
  | "programs"
  | "templates"
  | "exercises"
  | "challenges"
  | "gym"
  | "testing";

type PrimaryDef = {
  key: PrimaryKey;
  href: string;
  title: string;
  description: string;
  descriptionMobile: string;
  icon: LucideIcon;
  hue: string;
};

const PRIMARY: PrimaryDef[] = [
  {
    key: "programs",
    href: "/coach/programs",
    title: "Programs",
    description: "Multi-week programs and weekly schedules",
    descriptionMobile: "Multi-week programs and schedules",
    icon: BookOpen,
    hue: HUE.programs,
  },
  {
    key: "templates",
    href: "/coach/workouts/templates",
    title: "Workout templates",
    description: "Single-session workouts for programs and assignments",
    descriptionMobile: "Single-session workouts",
    icon: Layers,
    hue: HUE.templates,
  },
  {
    key: "exercises",
    href: "/coach/exercises",
    title: "Exercise library",
    description: "Browse and manage exercises",
    descriptionMobile: "Browse and manage exercises",
    icon: Library,
    hue: HUE.exercises,
  },
  {
    key: "challenges",
    href: "/coach/challenges",
    title: "Challenges",
    description: "Create and manage client challenges",
    descriptionMobile: "Create and manage challenges",
    icon: Trophy,
    hue: HUE.challenges,
  },
  {
    key: "gym",
    href: "/coach/gym-console",
    title: "Gym console",
    description: "Clipboard of programmed workouts for the floor",
    descriptionMobile: "Clipboard for the floor",
    icon: Activity,
    hue: HUE.gym,
  },
  {
    key: "testing",
    href: "/coach/testing",
    title: "Testing",
    description: "Mobility, performance and body assessments",
    descriptionMobile: "Mobility and assessments",
    icon: ClipboardList,
    hue: HUE.testing,
  },
];

const SECONDARY = [
  {
    href: "/coach/categories?tab=workouts",
    title: "Workout categories",
    icon: FolderTree,
    key: "workoutCategories" as const,
  },
  {
    href: "/coach/categories?tab=exercises",
    title: "Exercise categories",
    icon: Tag,
    key: "exerciseCategories" as const,
  },
];

function relativeShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}

function readGymBoardCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(GYM_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? Math.min(parsed.length, GYM_CONSOLE_BOARD_MAX) : 0;
  } catch {
    return 0;
  }
}

type TileStats = {
  primary: number | null;
  primaryLabel: string;
  secondary?: ReactNode;
};

function tileStats(
  key: PrimaryKey,
  stats: TrainingHubStats | null,
  gymBoard: number,
): TileStats {
  if (!stats) {
    return { primary: null, primaryLabel: "" };
  }
  switch (key) {
    case "programs":
      return {
        primary: stats.programs.count,
        primaryLabel: "programs",
        secondary: (
          <>
            <b>{stats.programs.assigned}</b> assigned
          </>
        ),
      };
    case "templates": {
      const rel = relativeShort(stats.templates.lastEditedAt);
      return {
        primary: stats.templates.count,
        primaryLabel: "templates",
        secondary: rel ? (
          <>
            last edited <b>{rel}</b>
          </>
        ) : (
          "—"
        ),
      };
    }
    case "exercises":
      return {
        primary: stats.exercises.count,
        primaryLabel: "exercises",
        secondary: (
          <>
            <b>{stats.exercises.untagged}</b> untagged
          </>
        ),
      };
    case "challenges":
      return {
        primary: stats.challenges.running,
        primaryLabel: "running",
        secondary: (
          <>
            <b>{stats.challenges.participants}</b> participants
          </>
        ),
      };
    case "gym":
      return {
        primary: gymBoard,
        primaryLabel: "on the board",
        secondary: "today",
      };
    case "testing": {
      const rel = relativeShort(stats.testing.lastAt);
      return {
        primary: stats.testing.thisMonth,
        primaryLabel: "this month",
        secondary: rel ? (
          <>
            last <b>{rel} ago</b>
          </>
        ) : (
          "—"
        ),
      };
    }
  }
}

export default function CoachTrainingHubPage() {
  const { performanceSettings } = useTheme();
  const [stats, setStats] = useState<TrainingHubStats | null>(null);
  const [gymBoard, setGymBoard] = useState(0);

  useEffect(() => {
    setGymBoard(readGymBoardCount());
    let cancelled = false;
    void fetchApi("/api/coach/training/hub-stats")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as TrainingHubStats;
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        console.error("[training hub] stats:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="data-7xl" className={styles.page}>
          <header className={styles.header}>
            <h1 className={styles.title}>Training</h1>
            <p className={styles.sub}>
              Programs, workout templates, and your exercise library.
            </p>
          </header>

          {/* Mobile rows */}
          <nav className={styles.rows} aria-label="Training">
            {PRIMARY.map((item) => {
              const Icon = item.icon;
              const s = tileStats(item.key, stats, gymBoard);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.row}
                  style={{ ["--h" as string]: item.hue }}
                >
                  <span className={styles.ic}>
                    <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className={styles.rt}>
                    <div className={styles.rtName}>{item.title}</div>
                    <div className={styles.rtDesc}>{item.descriptionMobile}</div>
                  </span>
                  {s.primary != null ? (
                    <span className={styles.cnt}>{s.primary}</span>
                  ) : null}
                  <ChevronRight className={`size-3.5 ${styles.chev}`} aria-hidden />
                </Link>
              );
            })}
          </nav>

          {/* Desktop grid */}
          <nav className={styles.grid} aria-label="Training">
            {PRIMARY.map((item) => {
              const Icon = item.icon;
              const s = tileStats(item.key, stats, gymBoard);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.tile}
                  style={{ ["--h" as string]: item.hue }}
                >
                  <div className={styles.th}>
                    <span className={styles.ic}>
                      <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className={styles.tt}>
                      <div className={styles.ttName}>{item.title}</div>
                      <div className={styles.ttDesc}>{item.description}</div>
                    </span>
                    <span className={styles.chev}>
                      <ChevronRight className="size-[15px]" aria-hidden />
                    </span>
                  </div>
                  {s.primary != null ? (
                    <div className={styles.stat}>
                      <span className={styles.statN}>{s.primary}</span>
                      <span className={styles.statL}>{s.primaryLabel}</span>
                      {s.secondary ? (
                        <span className={styles.statX}>{s.secondary}</span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className={styles.org}>
            <div className={styles.orgL}>Organisation</div>
            <div className={styles.orgStack}>
              {SECONDARY.map((item) => {
                const Icon = item.icon;
                const count =
                  item.key === "workoutCategories"
                    ? stats?.workoutCategories.count
                    : stats?.exerciseCategories.count;
                return (
                  <Link key={item.href} href={item.href} className={styles.orgi}>
                    <Icon className={`size-[15px] ${styles.orgIcon}`} aria-hidden />
                    {item.title}
                    <span className={styles.orgSp} />
                    {count != null ? <span className={styles.orgC}>{count}</span> : null}
                    <ChevronRight className="size-3.5 opacity-50" aria-hidden />
                  </Link>
                );
              })}
            </div>
            <div className={styles.orgRow}>
              {SECONDARY.map((item) => {
                const Icon = item.icon;
                const count =
                  item.key === "workoutCategories"
                    ? stats?.workoutCategories.count
                    : stats?.exerciseCategories.count;
                return (
                  <Link key={item.href} href={item.href} className={styles.orgi}>
                    <Icon className={`size-[15px] ${styles.orgIcon}`} aria-hidden />
                    {item.title}
                    <span className={styles.orgSp} />
                    {count != null ? <span className={styles.orgC}>{count}</span> : null}
                    <ChevronRight className="size-3.5 opacity-50" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </div>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
