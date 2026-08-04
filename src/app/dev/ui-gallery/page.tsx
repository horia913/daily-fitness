"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Dumbbell,
  Flame,
  Info,
  Ruler,
  Moon,
  Repeat,
  Plus,
  Search,
  Target,
  Timer,
  Weight,
  User,
  Eye,
  UserPlus,
  Edit,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { AtmosphericBackdrop } from "@/components/ui/AtmosphericBackdrop";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { AppCard } from "@/components/ui/AppCard";
import { Banner } from "@/components/ui/Banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FloatingInput } from "@/components/ui/floating-input";
import { GlassCard } from "@/components/ui/GlassCard";
import { HeroActionCard } from "@/components/ui/HeroActionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadPercentageWeightToggle } from "@/components/ui/LoadPercentageWeightToggle";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Progress } from "@/components/ui/progress";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { SetTypeBadge } from "@/components/client/workout-execution/ui/SetTypeBadge";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { TargetProgressBar } from "@/components/ui/TargetProgressBar";
import { Textarea } from "@/components/ui/textarea";
import { TierBadge } from "@/components/ui/TierBadge";
import { Toast } from "@/components/ui/toast";
import { WizardStepIndicator } from "@/components/ui/progress-indicator";
import { WeekMiniGrid } from "@/components/ui/WeekMiniGrid";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ToastProvider } from "@/components/ui/toast-provider";
import AchievementCard from "@/components/ui/AchievementCard";
import MealPlanCard from "@/components/features/nutrition/MealPlanCard";
import ProgramCard from "@/components/features/programs/ProgramCard";
import WorkoutTemplateCard from "@/components/features/workouts/WorkoutTemplateCard";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import ExerciseCard from "@/components/coach/ExerciseCard";
import { ClientGlassCard, SectionHeader } from "@/components/client-ui";
import { AthleteScoreRing } from "@/components/client-ui/AthleteScoreRing";
import { ScoreBreakdown } from "@/components/client-ui/ScoreBreakdown";
import { GoalCard } from "@/components/goals/GoalCard";
import { CompactGoalCard } from "@/components/goals/CompactGoalCard";
import { ChallengeCard } from "@/components/client/ChallengeCard";
import { ActiveProgramCard } from "@/components/client/train/ActiveProgramCard";
import { ProgramCompletedCard } from "@/components/client/train/ProgramCompletedCard";
import { WorkoutDayPreview } from "@/components/client/train/WorkoutDayPreview";
import { WellnessTrendsCard } from "@/components/client/WellnessTrendsCard";
import { WeeklyCheckInCard } from "@/components/client/WeeklyCheckInCard";
import { ProgressMomentCard } from "@/components/client/weekly-checkin/ProgressMomentCard";
import { BiggestWinCard } from "@/components/client/BiggestWinCard";
import { WorkoutLogCard } from "@/components/client/WorkoutLogCard";
import MealCardWithOptions from "@/components/client/MealCardWithOptions";
import { LogSetButton } from "@/components/client/workout-execution/ui/LogSetButton";
import { HabitLucideIcon } from "@/components/client/habitLucideIcon";
import { AchievementIconDisplay } from "@/components/ui/achievementIconDisplay";
import { LargeInput } from "@/components/client/workout-execution/ui/LargeInput";
import { WeekStrip } from "@/components/client/train/WeekStrip";
import { WeeklyStrip } from "@/components/client/check-ins/WeeklyStrip";
import { NavigationControls } from "@/components/client/workout-execution/ui/NavigationControls";
import { WizardNotice } from "@/components/goals/wizard/WizardNotice";
import { HeroWorkoutCard } from "@/components/client/HeroWorkoutCard";
import { SetProgressIndicator } from "@/components/client/workout-execution/ui/ProgressIndicator";
import { PrescriptionCard } from "@/components/client/workout-execution/ui/PrescriptionCard";
import { InstructionsBox } from "@/components/client/workout-execution/ui/InstructionsBox";
import {
  LiveCard,
  LiveCardExerciseName,
  LiveCardPrimary,
  LiveCardStats,
  LiveCardTechnique,
  LiveCardLog,
  LiveCardLogField,
  LiveCardLogButton,
  LiveCardGroupedExercise,
  LiveCardGlue,
  formatDropTechniqueBody,
  effortFromPrescribedRpe,
} from "@/components/client/workout-execution/live-card";
import { ExerciseDisplay, ExerciseGroupDisplay } from "@/components/exercise-display";
import {
  CollectionCard,
  CollectionCardAssignedStat,
  CollectionCardIconAction,
  CollectionCardMetaChip,
  CollectionCardMetaSep,
  CollectionCardMetaText,
  CollectionCardMetaValue,
  CollectionCardStack,
  COLLECTION_HUES,
} from "@/components/ui/CollectionCard";
import {
  compactSupersetExercise,
  emomGroup,
  giantSetGroup,
  isometricGroup,
  straightSetGroup,
  supersetGroup,
  tabataGroup,
} from "@/components/exercise-display/gallerySamples";

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6 py-10">
      <div className="space-y-3">
        <h2
          className="fc-text-primary"
          style={{
            fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
            fontSize: "clamp(28px, 3.2vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
        <hr className="border-[color:var(--fc-glass-border)]" />
      </div>
      {children}
    </section>
  );
}

function PreviewCard({
  name,
  path,
  children,
  note,
}: {
  name: string;
  path: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="fc-card-shell rounded-xl p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] fc-text-subtle">{name}</p>
        <p className="text-[11px] font-mono fc-text-dim">{path}</p>
      </div>
      {note ? <p className="text-xs text-amber-300">{note}</p> : null}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PlaceholderRender({
  name,
  path,
  reason,
}: {
  name: string;
  path: string;
  reason: string;
}) {
  return (
    <PreviewCard name={name} path={path}>
      <div className="rounded-lg border border-dashed border-[color:var(--fc-glass-border)] p-3 text-xs fc-text-dim">
        Component requires complex data flow - render in production context only.
        <br />
        Reason: {reason}
      </div>
    </PreviewCard>
  );
}

const SAMPLE_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='200'><rect width='100%' height='100%' fill='%23111'/><text x='50%' y='50%' fill='%23bbb' font-size='18' text-anchor='middle' dominant-baseline='middle'>Sample Image</text></svg>";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SampleFormField() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: "sample@dailyfitness.app" },
  });

  return (
    <Form {...form}>
      <form className="space-y-2">
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "Please enter a valid sample email." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage>Please enter a valid sample email.</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export default function UiGalleryPage() {
  const [selectOpen, setSelectOpen] = useState(false);
  const [searchableValue, setSearchableValue] = useState("sample-2");
  const [loadMode, setLoadMode] = useState<"load" | "weight">("load");
  const [stepperValue, setStepperValue] = useState(8);
  const [showProgressMoment, setShowProgressMoment] = useState(false);

  const sampleToday = "2026-04-27";
  const weekStart = "2026-04-21";
  const weekDays = useMemo(() => ["2026-04-21", "2026-04-22", "2026-04-23", "2026-04-24", "2026-04-25", "2026-04-26", "2026-04-27"], []);
  const lastWeekDays = useMemo(() => ["2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17", "2026-04-18", "2026-04-19", "2026-04-20"], []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--fc-bg-base)]">
      <div className="fixed right-3 top-3 z-[9999] rounded-md border border-emerald-400/60 bg-emerald-500/20 px-2 py-1 text-[11px] font-mono text-emerald-200">
        ui-gallery-static-2026-04-30-b
      </div>
      <AtmosphericBackdrop variant="action-top" className="opacity-80" />
      <AtmosphericBackdrop variant="info" className="opacity-40" />

      <div className="relative z-10 mx-auto w-full max-w-[1300px] px-4 pb-20 pt-10 md:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)]/80 p-6 backdrop-blur-[var(--fc-blur-card)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--fc-accent)]">Developer route</p>
          <h1
            className="mt-2 fc-text-primary"
            style={{
              fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
              fontSize: "clamp(34px, 4vw, 54px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            UI Component Gallery
          </h1>
          <p className="mt-3 text-sm fc-text-dim">
            Visual review surface for Phase 2. Includes direct renders where safe and explicit placeholders for production-bound flows.
          </p>
          <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            STATIC MOCK MODE ACTIVE - build marker: <span className="font-mono">ui-gallery-static-2026-04-30-b</span>
          </div>
        </header>

        <GallerySection title="1. SURFACES / ATMOSPHERE">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="AtmosphericBackdrop" path="components/ui/AtmosphericBackdrop.tsx">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["action-top", "action-bottom", "info", "warning", "achievement", "error"] as const).map((variant) => (
                  <div key={variant} className="relative h-24 overflow-hidden rounded-lg border border-[color:var(--fc-glass-border)] bg-[var(--fc-bg-deep)]">
                    <AtmosphericBackdrop variant={variant} />
                    <span className="absolute bottom-2 left-2 text-xs fc-text-primary">{variant}</span>
                  </div>
                ))}
              </div>
            </PreviewCard>
            <PreviewCard
              name="AnimatedBackground"
              path="components/ui/AnimatedBackground.tsx"
              note="Not mounted as page shell here (Cluster 7 policy). Rendered only in bounded preview."
            >
              <div className="h-40 overflow-hidden rounded-lg border border-[color:var(--fc-glass-border)]">
                <AnimatedBackground>
                  <div className="grid h-full place-items-center text-sm fc-text-primary">AnimatedBackground sample surface</div>
                </AnimatedBackground>
              </div>
            </PreviewCard>
            <PreviewCard name="AnimatedEntry" path="components/ui/AnimatedEntry.tsx">
              <AnimatedEntry>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] bg-[var(--fc-surface-card)] px-4 py-3 text-sm fc-text-primary">
                  Animated entry content sample
                </div>
              </AnimatedEntry>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="2. CARDS">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Card (shadcn)" path="components/ui/card.tsx">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle>Default</CardTitle></CardHeader>
                  <CardContent className="text-sm">Base card</CardContent>
                </Card>
                <Card className="fc-card">
                  <CardHeader><CardTitle>fc</CardTitle></CardHeader>
                  <CardContent className="text-sm">Tokenized card</CardContent>
                </Card>
                <Card className="fc-card-shell">
                  <CardHeader><CardTitle>shell</CardTitle></CardHeader>
                  <CardContent className="text-sm">Shell treatment</CardContent>
                </Card>
              </div>
            </PreviewCard>
            <PreviewCard name="AppCard" path="components/ui/AppCard.tsx">
              <div className="grid gap-3">
                {(["neutral", "success", "error", "warning", "info"] as const).map((tone) => (
                  <AppCard
                    key={tone}
                    title={`AppCard ${tone}`}
                    subtitle="Sample subtitle"
                    shellTone={tone}
                    eyebrow="CATEGORY"
                    actions={<Button size="sm" variant="fc-secondary">Action</Button>}
                  />
                ))}
              </div>
            </PreviewCard>
            <PreviewCard name="GlassCard" path="components/ui/GlassCard.tsx">
              <div className="grid gap-2">
                <GlassCard>Default GlassCard</GlassCard>
                <GlassCard pressable onPress={() => undefined}>With onPress + pressable</GlassCard>
                <GlassCard elevation={4} intensity={24}>
                  Elevated (elevation 4) + stronger blur (24px)
                </GlassCard>
                <GlassCard tone="warning">Warning tone</GlassCard>
                <GlassCard borderColor="var(--fc-accent)">Custom border color</GlassCard>
              </div>
            </PreviewCard>
            <PreviewCard name="ClientGlassCard" path="components/client-ui/GlassCard.tsx">
              <div className="grid gap-2">
                <ClientGlassCard>Default client shell</ClientGlassCard>
                <ClientGlassCard className="bg-[color:color-mix(in_srgb,var(--fc-accent)_10%,transparent)]">bg-* custom class</ClientGlassCard>
                {(["neutral", "success", "error", "warning", "info"] as const).map((tone) => (
                  <ClientGlassCard key={tone} tone={tone}>{tone} tone</ClientGlassCard>
                ))}
              </div>
            </PreviewCard>
            <PreviewCard name="HeroActionCard" path="components/ui/HeroActionCard.tsx">
              <HeroActionCard
                eyebrow="TODAY"
                pill={<Badge variant="fc-filled">Ready</Badge>}
                title="Sample Workout"
                meta="4 exercises · 45 min"
                infoSlot={<p className="text-xs fc-text-dim">Coach note: Keep rest strict.</p>}
                cta={<Button variant="fc-primary">Start now</Button>}
              />
            </PreviewCard>
            <PreviewCard name="HeroWorkoutCard" path="components/client/HeroWorkoutCard.tsx">
              <div className="space-y-4">
                <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-2">
                  <p className="mb-2 text-xs fc-text-subtle">Active workout state</p>
                  <HeroWorkoutCard todaysWorkout={{ hasWorkout: true, name: "Sample workout", totalSets: 5, estimatedDuration: 42, type: "program", weekNumber: 2, dayNumber: 3, templateId: "demo-template" } as any} />
                </div>
                <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-2">
                  <p className="mb-2 text-xs fc-text-subtle">Rest day state</p>
                  <HeroWorkoutCard todaysWorkout={{ hasWorkout: false } as any} />
                </div>
              </div>
            </PreviewCard>
            <PreviewCard name="AchievementCard (locked/unlocked + rarity)" path="components/ui/AchievementCard.tsx">
              <div className="space-y-2">
                {(["common", "uncommon", "rare", "epic", "legendary"] as const).map((rarity) => (
                  <div key={rarity} className="grid gap-2 md:grid-cols-2">
                    <AchievementCard
                      achievement={{
                        id: `${rarity}-locked`,
                        name: `${rarity} milestone`,
                        description: "Complete 5 sample sessions.",
                        icon: "trophy",
                        tier: rarity === "legendary" ? "platinum" : rarity === "epic" ? "gold" : rarity === "rare" ? "silver" : rarity === "uncommon" ? "bronze" : null,
                        rarity,
                        unlocked: false,
                        progress: 42,
                        requirement: "5 sessions",
                      }}
                    />
                    <AchievementCard
                      achievement={{
                        id: `${rarity}-unlocked`,
                        name: `${rarity} unlocked`,
                        description: "You hit your sample target.",
                        icon: "medal",
                        tier: rarity === "legendary" ? "platinum" : rarity === "epic" ? "gold" : rarity === "rare" ? "silver" : rarity === "uncommon" ? "bronze" : null,
                        rarity,
                        unlocked: true,
                        unlockedAt: new Date("2026-04-25"),
                      }}
                    />
                  </div>
                ))}
              </div>
            </PreviewCard>
            <PreviewCard name="MealPlanCard / ProgramCard / WorkoutTemplateCard" path="components/features/*">
              <div className="space-y-3">
                <MealPlanCard mealPlan={{ id: "mp-1", name: "Sample Lean Bulk Plan", meal_count: 4, usage_count: 12, target_calories: 2450, target_protein: 180, target_carbs: 250, target_fat: 75, generated_config: { mode: "sample" } } as any} onEdit={() => undefined} onDelete={() => undefined} onAssign={() => undefined} />
                <ProgramCard program={{ id: "p-1", name: "12-Week Strength Base", description: "Progressive overload with deload weeks.", coach_id: "coach-1", difficulty_level: "intermediate", totalWeeks: 12, target_audience: "General", is_active: true, created_at: "2026-04-01", updated_at: "2026-04-27" }} onEdit={() => undefined} onOpenDetails={() => undefined} onAssign={() => undefined} onDelete={() => undefined} assignmentCount={8} />
                <WorkoutTemplateCard template={{ id: "wt-1", name: "Upper Power A", category: "workouts", exercises: [{ exercise: { name: "Bench Press", category: "Chest" } }, { exercise: { name: "Row", category: "Back" } }], exercise_count: 6, estimated_duration: 55 } as any} onEdit={() => undefined} onOpenDetails={() => undefined} onDelete={() => undefined} onDuplicate={() => undefined} onAssign={() => undefined} />
              </div>
            </PreviewCard>
            <PreviewCard name="ExerciseBlockCard / ExerciseCard" path="components/features/workouts/ExerciseBlockCard.tsx + components/coach/ExerciseCard.tsx">
              <div className="space-y-3">
                <ExerciseBlockCard
                  exercise={{
                    id: "block-1",
                    exercise_type: "straight_set",
                    exercise: { id: "ex-1", name: "Back Squat" },
                    sets: 4,
                    reps: "6-8",
                    rest_seconds: 120,
                    load_percentage: 75,
                  }}
                  index={0}
                  renderMode="view"
                />
                <ExerciseCard
                  exercise={{
                    id: "ex-1",
                    name: "Back Squat",
                    description: "Sample lower body compound movement.",
                    category: "Strength",
                    muscle_groups: ["Quads", "Glutes"],
                    equipment: ["Barbell", "Rack"],
                    difficulty: "intermediate",
                    instructions: ["Brace core", "Drive through mid-foot"],
                    tips: ["Keep chest up"],
                    is_public: true,
                    created_at: "2026-04-01",
                    updated_at: "2026-04-20",
                    usage_count: 52,
                    rating: 4.7,
                  }}
                  viewMode="list"
                  isSelected={false}
                  onSelect={() => undefined}
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  onToggleVisibility={() => undefined}
                />
              </div>
            </PreviewCard>
            <PreviewCard name="GoalCard / CompactGoalCard / ChallengeCard" path="components/goals/* + components/client/ChallengeCard.tsx">
              <div className="space-y-3">
                {(["training", "nutrition", "checkins", "lifestyle", "general"] as const).map((pillar) => (
                  <GoalCard
                    key={pillar}
                    goal={{
                      id: `goal-${pillar}`,
                      client_id: "client-1",
                      title: `Sample ${pillar} goal`,
                      category: "performance",
                      start_date: "2026-04-01",
                      status: "active",
                      priority: "medium",
                      created_at: "2026-04-01",
                      updated_at: "2026-04-27",
                      progress_percentage: 58,
                      pillar,
                      current_value: 58,
                      target_value: 100,
                      target_unit: "%",
                    } as any}
                    isAutoTracked={false}
                    onUpdate={() => Promise.resolve()}
                    onEdit={() => undefined}
                    onDelete={() => undefined}
                  />
                ))}
                <CompactGoalCard goal={{ id: "compact-goal", title: "Walk 10,000 steps", status: "active", progress_percentage: 63, current_value: 6300, target_value: 10000, target_unit: "steps" }} />
                <ChallengeCard
                  challenge={{
                    id: "ch-1",
                    name: "30-Day Push-Up Challenge",
                    description: "Complete your push-up sets daily.",
                    challenge_type: "coach_challenge",
                    reward_description: "Exclusive badge + shoutout",
                    start_date: "2026-04-01",
                    end_date: "2026-04-30",
                    status: "active",
                  } as any}
                  onJoin={() => undefined}
                  onView={() => undefined}
                />
              </div>
            </PreviewCard>
            <PreviewCard name="ActiveProgramCard / ProgramCompletedCard / WorkoutDayPreview" path="components/client/train/*">
              <div className="space-y-3">
                <ActiveProgramCard
                  programWeek={{
                    programId: "program-1",
                    programName: "Sample Program",
                    currentUnlockedWeek: 4,
                    currentWeekNumber: 4,
                    totalWeeks: 12,
                    pauseStatus: "paused",
                    pauseReason: "Recovery week",
                    days: [],
                    todaySlot: null,
                    isRestDay: false,
                  } as any}
                  weeklyProgress={{ current: 2, goal: 4 }}
                  onStartWorkout={() => undefined}
                  isStarting={false}
                  startingScheduleId={null}
                />
                <ProgramCompletedCard
                  programWeek={{ programName: "12-Week Strength Base" } as any}
                />
                <WorkoutDayPreview
                  day={{ scheduleId: "sched-1", dayOfWeek: 0, workoutName: "Upper Power", isCompleted: false, templateId: "wt-1" } as any}
                  status="today"
                  templateId="wt-1"
                  workoutName="Upper Power"
                  dayLabel="Monday"
                  estimatedDuration={55}
                  scheduleId="sched-1"
                  onStartWorkout={() => undefined}
                  isStarting={false}
                  startingScheduleId={null}
                  clientId={undefined}
                  blocks={[{ id: "b1", set_type: "straight_set", exercises: [{ id: "e1", name: "Bench Press", sets: 4, reps: "6-8" }] }] as any}
                />
              </div>
            </PreviewCard>
            <PreviewCard name="WellnessTrendsCard / WeeklyCheckInCard / ProgressMomentCard" path="components/client/*check-in*">
              <div className="space-y-3">
                <WellnessTrendsCard
                  logRange={[
                    { log_date: "2026-04-22", sleep_hours: 7.2, stress_level: 6, soreness_level: 5, sleep_quality: 4 } as any,
                    { log_date: "2026-04-23", sleep_hours: 7.8, stress_level: 5, soreness_level: 4, sleep_quality: 4 } as any,
                    { log_date: "2026-04-24", sleep_hours: 8.1, stress_level: 4, soreness_level: 3, sleep_quality: 5 } as any,
                    { log_date: "2026-04-16", sleep_hours: 6.9, stress_level: 7, soreness_level: 6, sleep_quality: 3 } as any,
                  ]}
                  weekStart={weekStart}
                  weekDays={weekDays}
                  lastWeekStart="2026-04-14"
                  lastWeekDays={lastWeekDays}
                />
                <WeeklyCheckInCard
                  daysSinceLast={2}
                  lastMeasuredDate="2026-04-25"
                  frequencyDays={7}
                  recentMeasurements={[
                    { measured_date: "2026-04-25", weight_kg: 78.4, body_fat_percentage: 17.8, waist_circumference: 82, muscle_mass_kg: 33.2 } as any,
                    { measured_date: "2026-04-18", weight_kg: 79.1, body_fat_percentage: 18.3, waist_circumference: 83, muscle_mass_kg: 32.8 } as any,
                  ]}
                  activeCheckInGoals={[
                    { id: "g-weight", title: "Weight trend", pillar: "checkins", metric_type: "weight", target_value: 76 },
                  ]}
                />
                {!showProgressMoment ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowProgressMoment(true)}
                  >
                    Open ProgressMomentCard
                  </Button>
                ) : null}
                {showProgressMoment ? (
                  <ProgressMomentCard
                    clientId="demo-client"
                    isFirstCheckIn
                    headline="Nice consistency this week."
                    firstDate={null}
                    onContinue={() => setShowProgressMoment(false)}
                  />
                ) : null}
              </div>
            </PreviewCard>
            <PreviewCard name="BiggestWinCard / WorkoutLogCard / MealCardWithOptions" path="components/client/*">
              <div className="space-y-3">
                <p className="text-xs fc-text-subtle">BiggestWinCard variants: skeleton / empty / earned</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <BiggestWinCard mockLoading />
                  <BiggestWinCard mockWin={null} />
                  <BiggestWinCard mockWin={{ hasImprovement: true, exerciseName: "Back Squat", improvementValue: "+10 kg", improvementPercent: 7.2, previousBest: "140 kg x 4", currentBest: "150 kg x 4" } as any} />
                </div>
                <WorkoutLogCard
                  log={{
                    id: "wl-1",
                    workoutName: "Upper Strength",
                    totalSets: 18,
                    totalWeight: 7240,
                    total_duration_minutes: 58,
                    started_at: "2026-04-27T07:10:00.000Z",
                    completed_at: "2026-04-27T08:08:00.000Z",
                    overall_difficulty_rating: 4,
                    workout_set_logs: [{ exercises: { id: "1", name: "Bench Press" } }, { exercises: { id: "2", name: "Row" } }],
                  }}
                />
                <ToastProvider>
                  <MealCardWithOptions
                    clientId="client-1"
                    meal={{
                      id: "meal-1",
                      name: "Sample High-Protein Lunch",
                      meal_type: "lunch",
                      emoji: "🍽️",
                      logged: false,
                      options: [
                        {
                          id: "opt-1",
                          name: "Option A",
                          order_index: 0,
                          items: [{ food: { id: "f1", name: "Chicken Breast", serving_size: 150, serving_unit: "g" }, quantity: 1, calories: 250, protein: 46, carbs: 0, fat: 5 }],
                          totals: { calories: 250, protein: 46, carbs: 0, fat: 5 },
                        },
                      ],
                    } as any}
                    onMealLogged={() => undefined}
                  />
                </ToastProvider>
              </div>
            </PreviewCard>
            <PreviewCard name="PrescriptionCard / InstructionsBox" path="components/client/workout-execution/ui/*">
              <div className="space-y-3">
                <PrescriptionCard
                  exerciseTitle="Back Squat"
                  setType="straight_set"
                  prescriptionItems={[
                    { label: "Sets", value: 4, icon: Repeat },
                    { label: "Reps", value: "6-8", icon: Target },
                    { label: "Load", value: 75, unit: "%", icon: Weight },
                    { label: "Rest", value: 120, unit: "sec", icon: Timer },
                  ]}
                  coachNotes="Stay braced and control the eccentric."
                  formCues="Knees out, chest up."
                />
                <InstructionsBox instructions="Complete warm-up sets before your first working set. Focus on controlled tempo." />
              </div>
            </PreviewCard>
            <PreviewCard
              name="LiveCard v6 — Straight / Drop / Superset"
              path="components/client/workout-execution/live-card/*"
              note="Canonical mockup: design/mockups/execution-screen-v6-CANONICAL.html"
            >
              <div className="space-y-4 max-w-[390px]">
                <LiveCard hue="a" heading="Set 1 of 3" status="logging">
                  <LiveCardExerciseName name="Leg Press Wide Stance" />
                  <LiveCardPrimary
                    target={{ kind: "reps_only", reps: 6, unit: "reps" }}
                    effort={effortFromPrescribedRpe(10)}
                  />
                  <LiveCardStats rest="2:00" tempo="3010" last="6 × 7.5" />
                  <LiveCardLog
                    fields={
                      <>
                        <LiveCardLogField label="Weight" value="7.5" />
                        <LiveCardLogField label="Reps" value="6" />
                      </>
                    }
                  />
                </LiveCard>
                <LiveCard hue="a" heading="Set 2 of 4" status="logging">
                  <LiveCardExerciseName name="Barbell Back Squat" />
                  <LiveCardPrimary
                    target={{ kind: "reps_weight", reps: 4, weight: 105 }}
                    effort={effortFromPrescribedRpe(8)}
                  />
                  <LiveCardStats rest="3:00" tempo="20X0" last="4 × 102.5" />
                  <LiveCardTechnique title="Drop set">
                    {formatDropTechniqueBody(20)}
                  </LiveCardTechnique>
                  <LiveCardLog
                    fields={
                      <>
                        <LiveCardLogField label="Weight" value="105" />
                        <LiveCardLogField label="Reps" value="4" />
                      </>
                    }
                  />
                </LiveCard>
                <LiveCard hue="b" heading="Set 2 of 4" status="logging">
                  <LiveCardGroupedExercise
                    badge="A1"
                    name="Back Squat"
                    target={{ kind: "reps_weight", reps: 4, weight: 105 }}
                    effort={effortFromPrescribedRpe(8)}
                    logSlot={
                      <>
                        <LiveCardLogField label="Weight" value="105" />
                        <LiveCardLogField label="Reps" value="4" />
                        <LiveCardLogButton />
                      </>
                    }
                  />
                  <LiveCardGroupedExercise
                    badge="A2"
                    name="Romanian Deadlift"
                    target={{ kind: "reps_weight", reps: 8, weight: 68 }}
                    effort={effortFromPrescribedRpe(7)}
                    logged
                    loggedValue="8 × 68 kg"
                  />
                  <LiveCardGlue>↓ &nbsp;back to back · rest 2:00 after A2</LiveCardGlue>
                </LiveCard>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="3. BUTTONS">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Button" path="components/ui/button.tsx">
              <div className="space-y-3">
                {(["default", "destructive", "outline", "secondary", "ghost", "link", "fc-primary", "fc-secondary", "fc-ghost", "fc-destructive", "energy", "trust", "success", "warning"] as const).map((variant) => (
                  <div key={variant} className="space-y-2">
                    <p className="text-xs fc-text-subtle">variant: {variant}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["default", "sm", "lg", "xl", "icon"] as const).map((size) => (
                        <Button key={`${variant}-${size}`} variant={variant as any} size={size as any}>
                          {size === "icon" ? <Plus className="h-4 w-4" /> : `${size}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PreviewCard>
            <PreviewCard
              name="Legacy PrimaryButton / SecondaryButton"
              path="components/client-ui/PrimaryButton.tsx + SecondaryButton.tsx"
              note="@deprecated thin re-exports of Button — prefer variant btn-action / fc-secondary"
            >
              <div className="flex max-w-md flex-col flex-wrap gap-3 sm:flex-row">
                <Button type="button" variant="btn-action" className="h-10 w-full sm:w-auto">
                  btn-action (replaces PrimaryButton)
                </Button>
                <Button type="button" variant="fc-secondary" className="h-10 w-full sm:w-auto">
                  fc-secondary (replaces SecondaryButton)
                </Button>
              </div>
            </PreviewCard>
            <PreviewCard name="NotificationBell / LogSetButton" path="components/NotificationBell.tsx + workout-execution/ui/LogSetButton.tsx">
              <div className="flex flex-wrap items-center gap-3">
                <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--fc-glass-border)]">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--fc-accent)]" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--fc-glass-border)]">
                  <Bell className="h-4 w-4 fc-text-dim" />
                </button>
                <LogSetButton ready onClick={() => undefined} />
                <LogSetButton ready={false} onClick={() => undefined} label="Log set (disabled visual)" />
              </div>
            </PreviewCard>
            <PreviewCard name="Topbar icon-btn pattern + notification dot + FAB pattern" path="inline pattern (/client topbar)">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[color:var(--fc-glass-border)] p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--fc-surface-sunken)] text-sm font-semibold fc-text-primary">CN</div>
                  <div className="flex items-center gap-2">
                    <button className="relative grid h-10 w-10 place-items-center rounded-full border border-[color:var(--fc-glass-border)]">
                      <CircleCheck className="h-4 w-4" />
                    </button>
                    <button className="relative grid h-10 w-10 place-items-center rounded-full border border-[color:var(--fc-glass-border)]">
                      <Bell className="h-4 w-4" />
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--fc-accent)]" />
                    </button>
                  </div>
                </div>
                <button className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--fc-accent)] text-black shadow-[0_12px_30px_-10px_var(--fc-accent-glow)]">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="4. INDICATORS / BADGES">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="TierBadge" path="components/ui/TierBadge.tsx">
              <div className="flex flex-wrap gap-2">{(["bronze", "silver", "gold", "platinum", "diamond"] as const).map((tier) => <TierBadge key={tier} tier={tier} />)}</div>
            </PreviewCard>
            <PreviewCard name="Badge" path="components/ui/badge.tsx">
              <div className="flex flex-wrap gap-2">{(["default", "secondary", "destructive", "outline", "fc-glass", "fc-outline", "fc-filled"] as const).map((variant) => <Badge key={variant} variant={variant as any}>{variant}</Badge>)}</div>
            </PreviewCard>
            <PreviewCard name="AthleteScoreRing" path="components/client-ui/AthleteScoreRing.tsx">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2">
                  <p className="mb-2 text-xs fc-text-subtle">placeholder</p>
                  <AthleteScoreRing placeholder score={null} tier={null} animated={false} size={140} />
                </div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2">
                  <p className="mb-2 text-xs fc-text-subtle">paused (dimmed)</p>
                  <AthleteScoreRing score={72} tier="locked_in" paused size={140} />
                </div>
                {(["beast_mode", "locked_in", "showing_up", "slipping", "benched"] as const).map((tier) => (
                  <div key={tier} className="rounded-lg border border-[color:var(--fc-glass-border)] p-2">
                    <p className="mb-2 text-xs fc-text-subtle">{tier}</p>
                    <div className="flex items-center gap-3">
                      <AthleteScoreRing score={78} tier={tier} size={140} />
                      <AthleteScoreRing score={78} tier={tier} size={200} />
                    </div>
                  </div>
                ))}
              </div>
            </PreviewCard>
            <PreviewCard name="ScoreBreakdown" path="components/client-ui/ScoreBreakdown.tsx">
              <div className="space-y-2">
                <ScoreBreakdown
                  alwaysVisible
                  components={[
                    {
                      label: "Adherence",
                      value: 75,
                      delta: 3,
                      hint: "Program workouts completed this week",
                    },
                    {
                      label: "Execution",
                      value: 82,
                      delta: 5,
                      hint: "Scales adherence (30–100% factor)",
                    },
                    {
                      label: "Training",
                      value: 78,
                      delta: -2,
                      hint: "Combined training score from completion and execution",
                    },
                  ]}
                />
                <ScoreBreakdown
                  alwaysVisible
                  components={[
                    { label: "Adherence", value: 0, delta: -25 },
                    { label: "Execution", value: null, hint: "Shows after logged sets" },
                    {
                      label: "Training",
                      value: 21,
                      hint: "Combined training score from completion and execution",
                    },
                  ]}
                />
              </div>
            </PreviewCard>
            <PreviewCard name="ProgressCircles / StreakCounters" path="components/client/ProgressCircles.tsx + components/client/StreakCounters.tsx">
              <div className="space-y-3">
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] fc-text-subtle">ProgressCircles (mock)</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[72, 58, 83].map((v, i) => (
                      <div key={`pc-${i}`} className="rounded-lg bg-[color:var(--fc-surface-sunken)] p-2 text-center">
                        <p className="text-lg font-semibold fc-text-primary">{v}%</p>
                        <p className="text-[10px] fc-text-dim">{["Train", "Fuel", "Check-in"][i]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] fc-text-subtle">StreakCounters (mock)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "Workout", value: 7 },
                      { label: "Hydration", value: 12 },
                      { label: "Habits", value: 5 },
                    ].map((item) => (
                      <div key={item.label} className="rounded-full border border-[color:var(--fc-glass-border)] px-3 py-1 text-xs">
                        {item.label}: <span className="font-semibold">{item.value}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PreviewCard>
            <PreviewCard name="Progress / SetTypeBadge" path="components/ui/progress.tsx + components/ui/SetTypeBadge.tsx">
              <div className="space-y-3">
                <Progress value={62} />
                <p className="text-sm fc-text-primary">AnimatedNumber visual placeholder: <span className="font-mono text-lg">78</span></p>
                <div className="flex flex-wrap gap-2">{(["straight_set", "drop_set", "superset", "amrap"] as const).map((type) => <SetTypeBadge key={type} setType={type} />)}</div>
              </div>
            </PreviewCard>
            <PreviewCard name="HabitLucideIcon / AchievementIconDisplay / WorkoutProgressBar / RestTimerBar" path="components/client/habitLucideIcon.tsx + components/ui/achievementIconDisplay.tsx + workout-execution/*">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {(["dumbbell", "droplet", "moon", "clipboard-check"] as const).map((icon) => (
                    <span key={icon} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--fc-glass-border)] px-2 py-1 text-xs">
                      <HabitLucideIcon name={icon} className="h-4 w-4" />
                      {icon}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {["trophy", "star", "flame", "target"].map((icon) => (
                    <span key={icon} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--fc-glass-border)] px-2 py-1 text-xs">
                      <AchievementIconDisplay icon={icon} className="h-4 w-4" />
                      {icon}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs fc-text-subtle">WorkoutProgressBar samples</p>
                  <div className="h-1.5 rounded bg-[color:var(--fc-surface-sunken)]"><div className="h-full w-0 rounded bg-[var(--fc-accent)]" /></div>
                  <div className="h-1.5 rounded bg-[color:var(--fc-surface-sunken)]"><div className="h-full w-1/2 rounded bg-[var(--fc-accent)]" /></div>
                  <div className="h-1.5 rounded bg-[color:var(--fc-surface-sunken)]"><div className="h-full w-full rounded bg-[var(--fc-accent)]" /></div>
                </div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2">
                  <p className="text-xs fc-text-subtle">RestTimerBar (mock)</p>
                  <div className="mt-2 h-2 rounded bg-[color:var(--fc-surface-sunken)]">
                    <div className="h-full w-2/3 rounded bg-[var(--fc-accent)]" />
                  </div>
                  <p className="mt-1 text-xs fc-text-dim">Rest: 1:30 · Last set 100kg x 8</p>
                </div>
              </div>
            </PreviewCard>
            <PreviewCard name="WizardStepIndicator" path="components/ui/progress-indicator.tsx">
              <WizardStepIndicator
                steps={[
                  { id: "profile", title: "Profile" },
                  { id: "plan", title: "Plan" },
                  { id: "review", title: "Review" },
                ]}
                currentStep={2}
              />
            </PreviewCard>
            <PreviewCard name="SetProgressIndicator" path="components/client/workout-execution/ui/ProgressIndicator.tsx">
              <SetProgressIndicator current={3} total={5} label="Set" segmented />
            </PreviewCard>
            <PreviewCard name="Stepper" path="components/ui/stepper.tsx">
              <Stepper value={stepperValue} onChange={setStepperValue} min={0} max={12} step={1} label="Reps" showQuickIncrements quickIncrements={[1, 2, 5]} />
            </PreviewCard>
            <PreviewCard name="WeekStrip / WeeklyStrip" path="components/client/train/WeekStrip.tsx + components/client/check-ins/WeeklyStrip.tsx">
              <div className="space-y-3">
                <WeekStrip
                  days={[
                    { scheduleId: "s1", dayOfWeek: 0, isCompleted: true, isOptional: false, workoutName: "Push Day", templateId: "t1" },
                    { scheduleId: "s2", dayOfWeek: 1, isCompleted: false, isOptional: false, workoutName: "Pull Day", templateId: "t2" },
                    { scheduleId: "s3", dayOfWeek: 3, isCompleted: false, isOptional: false, workoutName: "Leg Day", templateId: "t3" },
                    { scheduleId: "s4", dayOfWeek: 5, isCompleted: false, isOptional: true, workoutName: "Mobility", templateId: "t4" },
                  ] as any}
                  todaySlot={{ scheduleId: "s2", dayOfWeek: 1, isCompleted: false, isOptional: false, workoutName: "Pull Day", templateId: "t2" } as any}
                  todayWeekday={1}
                  selectedScheduleId="s2"
                  selectedRestWeekday={null}
                  onDayStart={() => undefined}
                  onDayPreview={() => undefined}
                />
                <WeeklyStrip
                  weekStart={weekStart}
                  todayStr={sampleToday}
                  logsThisWeek={[
                    { log_date: "2026-04-21", sleep_hours: 7.5, sleep_quality: 4, stress_level: 5, soreness_level: 4, steps: 9200 } as any,
                    { log_date: "2026-04-23", sleep_hours: 8.1, sleep_quality: 5, stress_level: 4, soreness_level: 3, steps: 11000 } as any,
                    { log_date: "2026-04-27", sleep_hours: 7.2, sleep_quality: 4, stress_level: 5, soreness_level: 4, steps: 8600 } as any,
                  ]}
                />
              </div>
            </PreviewCard>
            <PreviewCard name="Pulse dot / Notification dot" path="inline pattern">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--fc-accent)]" /> Pulse (action)</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--fc-accent)]" /> Notification dot</span>
              </div>
            </PreviewCard>
            <PreviewCard name="TargetProgressBar" path="components/ui/TargetProgressBar.tsx">
              <div className="space-y-2">
                <TargetProgressBar current={100} target={100} showTargetTick />
                <TargetProgressBar current={92} target={100} showTargetTick />
                <TargetProgressBar current={140} target={100} showTargetTick maxOvershoot={1.8} />
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="5. FORMS / INPUTS">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Input" path="components/ui/input.tsx">
              <div className="space-y-2">
                <Input placeholder="Default input" />
                <Input placeholder="Disabled input" disabled />
                <Input placeholder="Error style example" className="border-[var(--fc-status-error)]" />
              </div>
            </PreviewCard>
            <PreviewCard name="Textarea" path="components/ui/textarea.tsx">
              <Textarea placeholder="Sample multi-line note" />
            </PreviewCard>
            <PreviewCard name="Label / Checkbox / Switch" path="components/ui/label.tsx + checkbox.tsx + switch.tsx">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Checkbox id="c1" /><Label htmlFor="c1">Accept plan terms</Label></div>
                <div className="flex items-center gap-2"><Switch id="s1" /><Label htmlFor="s1">Enable notifications</Label></div>
              </div>
            </PreviewCard>
            <PreviewCard name="Select (closed + open)" path="components/ui/select.tsx">
              <div className="space-y-2">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Closed state" /></SelectTrigger>
                  <SelectContent><SelectItem value="a">Option A</SelectItem><SelectItem value="b">Option B</SelectItem></SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setSelectOpen((v) => !v)}>{selectOpen ? "Hide" : "Show"} mock open panel</Button>
                {selectOpen ? (
                  <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2 text-sm fc-text-primary">
                    Open-state visual: Option A / Option B / Option C
                  </div>
                ) : null}
              </div>
            </PreviewCard>
            <PreviewCard name="FloatingInput" path="components/ui/floating-input.tsx">
              <FloatingInput id="name" label="Client Name" value="Sample Client" onChange={() => undefined} />
            </PreviewCard>
            <PreviewCard name="SearchableSelect" path="components/ui/SearchableSelect.tsx">
              <SearchableSelect
                value={searchableValue}
                onValueChange={setSearchableValue}
                items={[
                  { id: "sample-1", name: "Workout Alpha", description: "Upper body" },
                  { id: "sample-2", name: "Workout Beta", description: "Lower body" },
                  { id: "sample-3", name: "Workout Gamma", description: "Conditioning" },
                ]}
              />
            </PreviewCard>
            <PreviewCard name="LoadPercentageWeightToggle" path="components/ui/LoadPercentageWeightToggle.tsx">
              <LoadPercentageWeightToggle value={loadMode} onValueChange={setLoadMode} />
            </PreviewCard>
            <PreviewCard name="LargeInput + form primitives" path="components/client/workout-execution/ui/LargeInput.tsx + components/ui/form.tsx">
              <div className="space-y-3">
                <LargeInput
                  label="Working weight"
                  value="85"
                  onChange={() => undefined}
                  unit="kg"
                  showStepper
                  step="2.5"
                  stepAmount={2.5}
                />
                <SampleFormField />
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="6. NAV ELEMENTS">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard
              name="BottomNav / Header / AnalyticsNav / CoachClientTabBar / NavigationControls"
              path="components/layout/* + components/coach/* + workout-execution/ui/NavigationControls.tsx"
              note="Rendered as static mocks to keep gallery deterministic."
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2 text-xs fc-text-dim">Header mock: avatar + bell row</div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2 text-xs fc-text-dim">BottomNav mock: 5 items (Home/Check-in/Train/Fuel/Me)</div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2 text-xs fc-text-dim">AnalyticsNav mock: Insights/Reports</div>
                <div className="rounded-lg border border-[color:var(--fc-glass-border)] p-2 text-xs fc-text-dim">CoachClientTabBar mock: Overview/Training/Stats/Nutrition/Check-ins/Profile</div>
                <NavigationControls currentBlock={1} totalBlocks={4} onPrevious={() => undefined} onNext={() => undefined} />
              </div>
            </PreviewCard>
            <PreviewCard name="BackBtn + ExecProgress segments pattern" path="workout-execution inline patterns">
              <div className="space-y-3">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm">
                  <span aria-hidden>←</span>
                  Back to Workout
                </button>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((segment) => (
                    <div key={segment} className={`h-1.5 rounded-full ${segment === 1 ? "bg-[var(--fc-accent)]" : "bg-[color:var(--fc-glass-border)]"}`} />
                  ))}
                </div>
              </div>
            </PreviewCard>
            <PreviewCard name="Topbar pattern" path="inline pattern (/client)">
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--fc-glass-border)] p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--fc-surface-sunken)] text-xs font-semibold">CN</div>
                <div className="flex items-center gap-2">
                  <button className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--fc-glass-border)]"><CircleCheck className="h-4 w-4" /></button>
                  <button className="relative grid h-10 w-10 place-items-center rounded-full border border-[color:var(--fc-glass-border)]"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--fc-accent)]" /></button>
                </div>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="7. SECTION ELEMENTS">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="SectionHeader" path="components/client-ui/SectionHeader.tsx">
              <SectionHeader title="Section with action" action={<Button size="sm" variant="ghost">View all</Button>} />
              <SectionHeader title="Section without action" />
            </PreviewCard>
            <PreviewCard name="WizardNotice" path="components/goals/wizard/WizardNotice.tsx">
              <WizardNotice>
                Complete each step before assigning this plan to the client.
              </WizardNotice>
            </PreviewCard>
            <PreviewCard name="Greeting block pattern" path="inline pattern">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--fc-accent)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--fc-accent)]" />
                  Ready to move
                </p>
                <h3 className="text-3xl font-semibold fc-text-primary" style={{ fontFamily: "var(--font-bricolage-grotesque, var(--font-body))" }}>
                  Hello, <span className="bg-gradient-to-r from-[color-mix(in_srgb,var(--fc-group-c)_70%,white)] to-[color:var(--mastered)] bg-clip-text text-transparent">Client Name</span>
                </h3>
                <p className="text-sm fc-text-dim">Today · Apr 27</p>
              </div>
            </PreviewCard>
            <PreviewCard name="PageTitle + divider + eyebrow variants" path="inline patterns">
              <h3 className="text-[32px] font-semibold fc-text-primary" style={{ fontFamily: "var(--font-bricolage-grotesque, var(--font-body))" }}>Page Title Example</h3>
              <hr className="border-[color:var(--fc-glass-border)]" />
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold">
                <span className="text-[var(--fc-accent)]">Eyebrow action</span>
                <span className="text-[var(--fc-accent)]">Eyebrow cyan</span>
                <span className="text-[var(--fc-status-warning)]">Eyebrow gold</span>
                <span className="fc-text-dim">Eyebrow dim</span>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="8. TYPOGRAPHY">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Headings (Bricolage Grotesque)" path="tokenized typography">
              <div className="space-y-2" style={{ fontFamily: "var(--font-bricolage-grotesque, var(--font-body))" }}>
                <h1 className="text-5xl">H1 Heading</h1>
                <h2 className="text-4xl">H2 Heading</h2>
                <h3 className="text-3xl">H3 Heading</h3>
              </div>
            </PreviewCard>
            <PreviewCard name="Display numerals (var(--f-display))" path="tokenized typography">
              <div className="space-y-1" style={{ fontFamily: "var(--font-big-shoulders-display, var(--font-body))", lineHeight: 1 }}>
                <p style={{ fontSize: 96 }}>96</p>
                <p style={{ fontSize: 48 }}>48</p>
                <p style={{ fontSize: 28 }}>28</p>
                <p style={{ fontSize: 22 }}>22</p>
                <p style={{ fontSize: 18 }}>18</p>
              </div>
            </PreviewCard>
            <PreviewCard name="Body text (Geist)" path="tokenized typography">
              <div style={{ fontFamily: "var(--font-geist, var(--font-body))" }} className="space-y-1">
                <p className="text-base fc-text-primary">Body text sample</p>
                <p className="text-sm fc-text-dim">Caption sample</p>
                <p className="text-xs fc-text-subtle">Small sample</p>
              </div>
            </PreviewCard>
            <PreviewCard name="Mono (Geist Mono) + text tokens" path="tokenized typography">
              <p className="font-mono text-sm">Tempo: 3-1-1-0</p>
              <div className="space-y-1 text-sm">
                <p className="fc-text-primary">fc-text-primary</p>
                <p className="fc-text-dim">fc-text-dim</p>
                <p className="fc-text-subtle">fc-text-subtle</p>
                <p className="fc-text-muted">fc-text-muted</p>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="9. STATUS / FEEDBACK">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Toast" path="components/ui/toast.tsx">
              <div className="space-y-2">
                <Toast variant="default" title="Info toast" description="This is an info toast" />
                <Toast variant="warning" title="Warning toast" description="Check this value" />
                <Toast variant="destructive" title="Error toast" description="Request failed" />
                <Toast variant="success" title="Success toast" description="Saved successfully" />
              </div>
            </PreviewCard>
            <PreviewCard name="Banner" path="components/ui/Banner.tsx">
              <div className="space-y-2">
                <Banner variant="info" title="Info" message="Informational banner" icon={<Info className="h-4 w-4" />} />
                <Banner variant="warning" title="Warning" message="Warning banner" icon={<AlertTriangle className="h-4 w-4" />} />
                <Banner variant="error" title="Error" message="Error banner" icon={<AlertTriangle className="h-4 w-4" />} />
                <Banner variant="success" title="Success" message="Success banner" icon={<CheckCircle2 className="h-4 w-4" />} />
              </div>
            </PreviewCard>
            <PreviewCard name="ErrorBanner" path="components/ui/ErrorBanner.tsx" note="Candidate for migration to Banner per Phase 1.5 proposal">
              <ErrorBanner title="Unable to load" message="Please retry in a moment." />
            </PreviewCard>
            <PreviewCard name="EmptyState" path="components/ui/EmptyState.tsx">
              <div className="space-y-3">
                <EmptyState icon={Search} title="No results" description="Try a different filter." action={{ label: "Reset", onClick: () => undefined }} />
                <EmptyState variant="compact" icon={Moon} title="No check-ins yet" />
              </div>
            </PreviewCard>
            <PreviewCard name="Skeleton family note" path="components/ui/Skeleton.tsx + LoadingSkeleton.tsx + PageSkeleton.tsx">
              <p className="text-sm fc-text-dim">
                Skeleton / SkeletonCard / LoadingSkeleton / PageSkeleton are loading-state primitives. They render correctly in production inside their parent containers. Visual review of these is not applicable - they appear as gray pulsing rectangles by design.
              </p>
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="Element 15 — Exercise Display">
          <p className="text-sm fc-text-dim max-w-3xl">
            Canonical exercise + prescription readout (Station canvas grammar). Mapper consumes{" "}
            <code className="font-mono text-xs">CanvasExercise</code> +{" "}
            <code className="font-mono text-xs">CanvasGroup</code> from{" "}
            <code className="font-mono text-xs">get_workout_canvas</code> /{" "}
            <code className="font-mono text-xs">get_instance_workout_canvas</code>.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="(a) Straight set — list" path="exercise-display/ExerciseDisplay">
              <ExerciseGroupDisplay {...straightSetGroup} size="list" />
            </PreviewCard>
            <PreviewCard name="(a) Straight set — executor" path="size=executor">
              <ExerciseGroupDisplay {...straightSetGroup} size="executor" />
            </PreviewCard>
            <PreviewCard name="(b) Superset" path="exercise-display/ExerciseGroupDisplay">
              <ExerciseGroupDisplay {...supersetGroup} />
            </PreviewCard>
            <PreviewCard name="(c) Giant set — BW + technique" path="3-slot group">
              <ExerciseGroupDisplay {...giantSetGroup} />
            </PreviewCard>
            <PreviewCard name="(d) Isometric per-side" path="measurement=time">
              <ExerciseGroupDisplay {...isometricGroup} />
            </PreviewCard>
            <PreviewCard name="(e) EMOM" path="rounds_driver=interval">
              <ExerciseGroupDisplay {...emomGroup} />
            </PreviewCard>
            <PreviewCard name="(e) Tabata" path="all time slots">
              <ExerciseGroupDisplay {...tabataGroup} />
            </PreviewCard>
            <PreviewCard name="(f) Compact mode in round context" path="compact prop">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fc-text-subtle)] mb-2">
                5 rounds · rest 1:30
              </p>
              <ExerciseGroupDisplay {...compactSupersetExercise} compact />
            </PreviewCard>
          </div>
        </GallerySection>

        <GallerySection title="Element 16 — Collection Card">
          <p className="text-sm fc-text-dim max-w-3xl">
            Governed roster card for Programs, Plans, and Clients collection pages. Spec:{" "}
            <code className="font-mono text-xs">design/mockups/element-16-collection-card.html</code>
          </p>
          <PreviewCard name="CollectionCard" path="components/ui/CollectionCard.tsx">
            <CollectionCardStack>
              <CollectionCard
                hue={COLLECTION_HUES.a}
                name="Hypertrophy Base"
                status="active"
                meta={
                  <>
                    <CollectionCardMetaChip>Intermediate</CollectionCardMetaChip>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>
                      <CollectionCardMetaValue>12</CollectionCardMetaValue> wks
                    </CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>Fixed</CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>4 days / wk</CollectionCardMetaText>
                  </>
                }
                structure={[
                  { label: "Foundation", duration: "4 weeks", flex: 4, phase: "light" },
                  { label: "Hypertrophy", duration: "5 weeks", flex: 5, phase: "moderate" },
                  { label: "Peak", duration: "3 weeks", flex: 3, phase: "hard" },
                  { label: "Deload", duration: "2 weeks", flex: 2, phase: "deload" },
                ]}
                rightStat={
                  <CollectionCardAssignedStat
                    count={8}
                    avatars={[
                      { initials: "AP", background: COLLECTION_HUES.a },
                      { initials: "MK", background: COLLECTION_HUES.b },
                      { initials: "RD", background: COLLECTION_HUES.c },
                    ]}
                  />
                }
                actions={
                  <>
                    <CollectionCardIconAction icon={<Eye className="h-[15px] w-[15px]" />} label="View" />
                    <CollectionCardIconAction icon={<UserPlus className="h-[15px] w-[15px]" />} label="Assign" />
                    <CollectionCardIconAction icon={<Edit className="h-[15px] w-[15px]" />} label="Edit" />
                    <CollectionCardIconAction icon={<Trash2 className="h-[15px] w-[15px]" />} label="Delete" variant="danger" />
                  </>
                }
              />
              <CollectionCard
                hue={COLLECTION_HUES.d}
                name="Peaking Block"
                status="active"
                meta={
                  <>
                    <CollectionCardMetaChip>Advanced</CollectionCardMetaChip>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>
                      <CollectionCardMetaValue>4</CollectionCardMetaValue> wks
                    </CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>Fixed</CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>4 days / wk</CollectionCardMetaText>
                  </>
                }
                rightStat={<CollectionCardAssignedStat count={0} />}
                actions={
                  <>
                    <CollectionCardIconAction icon={<Eye className="h-[15px] w-[15px]" />} label="View" />
                    <CollectionCardIconAction icon={<UserPlus className="h-[15px] w-[15px]" />} label="Assign" />
                    <CollectionCardIconAction icon={<Edit className="h-[15px] w-[15px]" />} label="Edit" />
                    <CollectionCardIconAction icon={<Trash2 className="h-[15px] w-[15px]" />} label="Delete" variant="danger" />
                  </>
                }
              />
              <CollectionCard
                hue={COLLECTION_HUES.a}
                name="Old Cut Program"
                status="inactive"
                meta={
                  <>
                    <CollectionCardMetaChip>Intermediate</CollectionCardMetaChip>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>
                      <CollectionCardMetaValue>10</CollectionCardMetaValue> wks
                    </CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>Fixed</CollectionCardMetaText>
                    <CollectionCardMetaSep />
                    <CollectionCardMetaText>5 days / wk</CollectionCardMetaText>
                  </>
                }
                rightStat={<CollectionCardAssignedStat count={0} />}
                actions={
                  <>
                    <CollectionCardIconAction icon={<Eye className="h-[15px] w-[15px]" />} label="View" />
                    <CollectionCardIconAction icon={<UserPlus className="h-[15px] w-[15px]" />} label="Assign" />
                    <CollectionCardIconAction icon={<Edit className="h-[15px] w-[15px]" />} label="Edit" />
                    <CollectionCardIconAction icon={<Trash2 className="h-[15px] w-[15px]" />} label="Delete" variant="danger" />
                  </>
                }
              />
            </CollectionCardStack>
          </PreviewCard>
        </GallerySection>

        <GallerySection title="10. MEDIA / MISC">
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewCard name="Avatar primitives" path="inline primitives">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--fc-surface-sunken)] text-sm font-semibold">CN</div>
                <div className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--fc-glass-border)]"><User className="h-5 w-5" /></div>
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full"><img src={SAMPLE_IMG} alt="avatar sample" className="h-full w-full object-cover" /></div>
              </div>
            </PreviewCard>
            <PreviewCard name="OptimizedImage / ExerciseThumbnail / AvatarImage" path="components/ui/optimized-image.tsx + media wrappers">
              <div className="space-y-3">
                <OptimizedImage src={SAMPLE_IMG} alt="Optimized sample" width={320} height={180} className="h-32 w-full rounded-lg object-cover" lazy={false} />
                <div className="rounded-lg border border-dashed border-[color:var(--fc-glass-border)] p-3 text-xs fc-text-dim">
                  ExerciseThumbnail and AvatarImage wrappers map to this same base image primitive in production contexts.
                </div>
              </div>
            </PreviewCard>
          </div>
        </GallerySection>
      </div>
    </main>
  );
}
