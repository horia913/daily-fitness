"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  coachAttentionLevelLabel,
  coachAttentionReasonsForCard,
  type CoachAttentionLevel,
  type CoachAttentionReason,
} from "@/lib/coachAttention";
import { tierColorForKey, tierLabelForKey } from "@/lib/coachAthleteScoreUi";
import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";
import {
  CollectionCard,
  CollectionCardIconAction,
  CollectionCardMetaSep,
  CollectionCardMetaText,
  CollectionCardMetaValue,
  CollectionCardStack,
} from "@/components/ui/CollectionCard";
import collectionStyles from "@/components/ui/collectionCard.module.css";
import { CoachClientProgramPauseMenu } from "@/app/coach/clients/CoachClientProgramPauseMenu";
import {
  clientInitialsFromName,
  coachClientListStatusPresentation,
  type CoachClientAttentionTone,
} from "@/app/coach/clients/coachClientListCardUtils";
import type { Client } from "@/app/coach/clients/coachClientsTypes";
import listStyles from "@/app/coach/clients/coachClients.module.css";
import rowStyles from "@/components/coach/home/coachHomePage.module.css";
import styles from "./CoachAthleteCard.module.css";

export type CoachAthleteCardVariant = "row" | "list" | "grid";

/**
 * Optional density for `row` on wide briefing queues (≥1280 CSS also densifies
 * via parent `.queueList`). Prefer leaving unset — layout CSS owns desktop rhythm.
 */
export type CoachAthleteCardDensity = "default" | "compact";

export type CoachAthleteCardAttention = {
  level: CoachAttentionLevel;
  reasons: CoachAttentionReason[];
};

const STATUS_TONE_CLASS: Record<CoachClientAttentionTone, string> = {
  good: collectionStyles.statusToneGood,
  warn: collectionStyles.statusToneWarn,
  bad: collectionStyles.statusToneBad,
  muted: collectionStyles.statusToneMuted,
};

const LEVEL_TONE: Record<CoachAttentionLevel, string> = {
  needs_attention: styles.levelNeeds,
  monitor: styles.levelMonitor,
  on_track: styles.levelOnTrack,
};

function truncateStandingNote(note: string | null | undefined, max = 72): string | null {
  const t = note?.trim();
  if (!t) return null;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function clientHref(id: string) {
  return `/coach/clients/${id}`;
}

function formatNextSession(dateYmd: string | null | undefined): string | null {
  if (!dateYmd) return null;
  const raw = dateYmd.trim();
  if (!raw) return null;
  const targetMs = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(targetMs)) return raw;
  const today = new Date();
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const dayDiff = Math.floor((targetMs - todayMs) / (24 * 60 * 60 * 1000));
  const dateLabel = new Date(targetMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (dayDiff === 0) return `${dateLabel} (today)`;
  if (dayDiff === 1) return `${dateLabel} (tomorrow)`;
  if (dayDiff > 1) return `${dateLabel} (in ${dayDiff}d)`;
  return `${dateLabel} (${Math.abs(dayDiff)}d ago)`;
}

function Avatar({
  name,
  avatarUrl,
  sizeClass,
  initialsClass,
  imgClass,
}: {
  name: string;
  avatarUrl?: string | null;
  sizeClass: string;
  initialsClass: string;
  imgClass: string;
}) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" className={imgClass} width={34} height={34} />
    );
  }
  return (
    <span className={cn(sizeClass, initialsClass)} aria-hidden>
      {clientInitialsFromName(name)}
    </span>
  );
}

/** Shared attention level + classifier reasons (same copy everywhere). */
export function CoachAthleteCardReasons({
  attention,
  maxReasons = 3,
  className,
  /** When false, omit the level label (list chip is the single status source). */
  showLevel = true,
}: {
  attention: CoachAthleteCardAttention;
  maxReasons?: number;
  className?: string;
  showLevel?: boolean;
}) {
  const labels = coachAttentionReasonsForCard(attention.reasons, maxReasons);
  const levelLabel = coachAttentionLevelLabel(attention.level);

  if (!showLevel && labels.length === 0) return null;

  return (
    <div className={cn(styles.attentionBlock, className)}>
      {showLevel ? (
        <span className={cn(styles.levelPill, LEVEL_TONE[attention.level])}>
          {levelLabel}
        </span>
      ) : null}
      {labels.length > 0 ? (
        <span className={styles.reasons}>
          {labels.join(" · ")}
        </span>
      ) : null}
    </div>
  );
}

const LIST_RING_SIZE = 48;
const GRID_RING_SIZE = 54;
const RING_STROKE = 4;

function ringGeometry(size: number) {
  const center = size / 2;
  const radius = Math.max(2, (size - RING_STROKE * 2) / 2);
  const circumference = 2 * Math.PI * radius;
  return { center, radius, circumference };
}

function ScoreRing({
  score,
  tier,
  size,
  wrapClass,
  svgClass,
  valueClass,
}: {
  score: number;
  tier: string;
  size: number;
  wrapClass: string;
  svgClass: string;
  valueClass: string;
}) {
  const pct = Math.min(100, Math.max(0, Number(score)));
  const tierColor = tierColorForKey(tier);
  const { center, radius, circumference } = ringGeometry(size);
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className={wrapClass} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={svgClass}
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={tierColor}
          strokeWidth={RING_STROKE}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className={valueClass} style={{ color: tierColor }}>
        {Math.round(pct)}
      </span>
    </div>
  );
}

function ListMeta({
  client,
  activityText,
  activityColor,
  checkinText,
  checkinColor,
  nextSessionText,
}: {
  client: Client;
  activityText: string;
  activityColor: string;
  checkinText: string;
  checkinColor: string;
  nextSessionText: string | null;
}) {
  const programName = client.metrics.activeProgramName?.trim() ?? "";
  const hasProgram = client.hasActiveProgram && programName.length > 0;
  const week =
    client.metrics.programCurrentWeek != null &&
    client.metrics.programDurationWeeks != null;

  return (
    <>
      {hasProgram ? (
        <>
          <CollectionCardMetaText>
            <CollectionCardMetaValue>{programName}</CollectionCardMetaValue>
          </CollectionCardMetaText>
          <CollectionCardMetaSep />
          {week ? (
            <>
              <CollectionCardMetaText>
                Week{" "}
                <CollectionCardMetaValue>
                  {client.metrics.programCurrentWeek}
                </CollectionCardMetaValue>{" "}
                of{" "}
                <CollectionCardMetaValue>
                  {client.metrics.programDurationWeeks}
                </CollectionCardMetaValue>
              </CollectionCardMetaText>
              <CollectionCardMetaSep />
            </>
          ) : null}
          <CollectionCardMetaText>
            Next{" "}
            <CollectionCardMetaValue>{nextSessionText ?? "Not scheduled"}</CollectionCardMetaValue>
          </CollectionCardMetaText>
          <CollectionCardMetaSep />
          <CollectionCardMetaText>
            Trained{" "}
            <CollectionCardMetaValue>
              <span style={{ color: activityColor }}>{activityText}</span>
            </CollectionCardMetaValue>
          </CollectionCardMetaText>
          <CollectionCardMetaSep />
          <CollectionCardMetaText>
            Check-in{" "}
            <CollectionCardMetaValue>
              <span style={{ color: checkinColor }}>{checkinText}</span>
            </CollectionCardMetaValue>
          </CollectionCardMetaText>
        </>
      ) : (
        <CollectionCardMetaText>
          Not assigned <CollectionCardMetaValue>· assign →</CollectionCardMetaValue>
        </CollectionCardMetaText>
      )}
    </>
  );
}

function gridStatValueClass(
  label: string,
  semanticColor: string,
  kind: "activity" | "checkin" | "workouts",
): string {
  if (label === "Never" || (kind === "workouts" && label === "0")) {
    return listStyles.gridStatValDim;
  }
  if (
    kind === "checkin" &&
    (semanticColor.includes("warning") || semanticColor.includes("error"))
  ) {
    return listStyles.gridStatValWarn;
  }
  return listStyles.gridStatVal;
}

export type CoachAthleteCardProps = {
  variant: CoachAthleteCardVariant;
  /** Row density hint (briefing wide queues). Default inherits CSS. */
  density?: CoachAthleteCardDensity;
  clientId: string;
  name: string;
  attention: CoachAthleteCardAttention;
  avatarUrl?: string | null;
  email?: string | null;
  href?: string;
  maxReasons?: number;
  /** Truncated standing note (list/grid). Falls back to client.standingNote. */
  standingNote?: string | null;
  /** Clients list / grid: full client for pause + meta */
  client?: Client;
  onPatch?: (patch: Partial<Client>) => void;
  activityText?: string;
  activityColor?: string;
  checkinText?: string;
  checkinColor?: string;
  lastActivityLabel?: string;
  lastActivityColor?: string;
  lastCheckinLabel?: string;
  lastCheckinColor?: string;
};

export function CoachAthleteCard(props: CoachAthleteCardProps) {
  const router = useRouter();
  const {
    variant,
    clientId,
    name,
    attention,
    avatarUrl,
    email,
    href = clientHref(clientId),
    maxReasons,
  } = props;

  if (variant === "row") {
    const reasonMax = maxReasons ?? 2;
    const density = props.density ?? "default";
    return (
      <Link
        href={href}
        className={cn(
          rowStyles.qrow,
          styles.rowCard,
          density === "compact" && styles.rowCardCompact,
        )}
      >
        <span className={rowStyles.qav} aria-hidden>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={styles.rowAvatarImg}
              width={28}
              height={28}
            />
          ) : (
            clientInitialsFromName(name)
          )}
        </span>
        <div className={rowStyles.qbody}>
          <div className={rowStyles.qname}>{name}</div>
          <CoachAthleteCardReasons
            attention={attention}
            maxReasons={reasonMax}
            className={styles.rowReasons}
          />
        </div>
        <span className={rowStyles.qchev} aria-hidden>
          ›
        </span>
      </Link>
    );
  }

  if (!props.client || !props.onPatch) {
    return null;
  }

  const client = props.client;
  const onPatch = props.onPatch;
  const { cardStatus, statusLabel, statusTone, hue } =
    coachClientListStatusPresentation(client);
  const reasonMax = maxReasons ?? 3;
  const attentionBlock = (
    <CoachAthleteCardReasons attention={attention} maxReasons={reasonMax} />
  );
  const noteLine = truncateStandingNote(
    props.standingNote ?? client.standingNote,
  );

  if (variant === "list") {
    const activityText = props.activityText ?? "—";
    const activityColor = props.activityColor ?? "var(--fc-text-subtle)";
    const checkinText = props.checkinText ?? "—";
    const checkinColor = props.checkinColor ?? "var(--fc-text-subtle)";
    const athleteScore = client.athleteScore;
    const showRing = athleteScore != null && client.hasActiveProgram && !client.scoreIsStale;
    const nextSessionText = formatNextSession(client.nextSessionDate);
    const paused = client.pauseStatus === "paused";

    return (
      <div className={listStyles.listRowWrap}>
        {paused ? (
          <div className={listStyles.listPausedStrip} role="status">
            <Pause className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            Paused
          </div>
        ) : null}
        <CollectionCard
          hue={hue}
          className={styles.listCard}
          avatar={
            <Avatar
              name={name}
              avatarUrl={avatarUrl ?? client.avatar}
              sizeClass={listStyles.listCardAvatarInitials}
              initialsClass={listStyles.listCardAvatarInitials}
              imgClass={listStyles.listCardAvatarImg}
            />
          }
          name={name}
          status={cardStatus}
          statusLabel={statusLabel}
          statusTone={statusTone}
          rosterVariant="client"
          meta={
            <span className={styles.listMetaRow}>
              <CoachAthleteCardReasons
                attention={attention}
                maxReasons={reasonMax}
                className={styles.listReasons}
                showLevel={false}
              />
              {noteLine ? (
                <span
                  className={cn(styles.standingNote, styles.listStandingNote)}
                  title={client.standingNote ?? undefined}
                >
                  {noteLine}
                </span>
              ) : null}
              <span className={styles.listMetaSecondary}>
                <ListMeta
                  client={client}
                  activityText={activityText}
                  activityColor={activityColor}
                  checkinText={checkinText}
                  checkinColor={checkinColor}
                  nextSessionText={nextSessionText}
                />
              </span>
            </span>
          }
          rightStat={
            showRing ? (
              <ScoreRing
                score={athleteScore.score}
                tier={athleteScore.tier}
                size={LIST_RING_SIZE}
                wrapClass={listStyles.listCardScoreRing}
                svgClass={listStyles.listCardScoreRingSvg}
                valueClass={listStyles.listCardScoreRingValue}
              />
            ) : (
              <div className={listStyles.listCardNoStat}>
                <span className={listStyles.listCardNoStatDash}>—</span>
                <span className={listStyles.listCardNoStatSub}>No score yet</span>
              </div>
            )
          }
          actions={
            <>
              <CoachClientProgramPauseMenu
                client={client}
                onPatch={onPatch}
                buttonClassName={listStyles.listCardActionBtn}
              />
              <CollectionCardIconAction
                icon={<ChevronRight className="h-[15px] w-[15px]" />}
                label={`View ${name}`}
                onClick={() => router.push(href)}
              />
            </>
          }
        />
      </div>
    );
  }

  // grid
  const paused = client.pauseStatus === "paused";
  const isInactive = cardStatus === "inactive";
  const programName = client.metrics.activeProgramName?.trim() || null;
  const hasProgram = Boolean(programName);
  const weekLabel =
    client.metrics.programCurrentWeek != null &&
    client.metrics.programDurationWeeks != null
      ? `Week ${client.metrics.programCurrentWeek} of ${client.metrics.programDurationWeeks}`
      : null;
  const statusClass = isInactive
    ? collectionStyles.statusInactive
    : statusTone !== "muted"
      ? STATUS_TONE_CLASS[statusTone]
      : collectionStyles.statusToneMuted;
  const cardStyle = {
    "--grid-hue": isInactive ? "var(--fc-text-subtle)" : hue,
  } as CSSProperties;
  const lastActivityLabel = props.lastActivityLabel ?? "—";
  const lastActivityColor = props.lastActivityColor ?? "";
  const lastCheckinLabel = props.lastCheckinLabel ?? "—";
  const lastCheckinColor = props.lastCheckinColor ?? "";
  const athleteScore = client.athleteScore;
  const showRing = athleteScore != null && !client.scoreIsStale;

  return (
    <div
      className={cn(
        listStyles.gridCard,
        isInactive && listStyles.gridCardInactive,
      )}
      style={cardStyle}
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {paused ? (
        <div className={listStyles.gridPausedStrip} role="status">
          <Pause className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          Paused
        </div>
      ) : null}

      <div className={listStyles.gridHead}>
        <div className={listStyles.gridWho}>
          <Avatar
            name={name}
            avatarUrl={avatarUrl ?? client.avatar}
            sizeClass={listStyles.gridAvatarInitials}
            initialsClass={listStyles.gridAvatarInitials}
            imgClass={listStyles.gridAvatarImg}
          />
          <div className={listStyles.gridNameBlock}>
            <div className={listStyles.gridName}>{name}</div>
            <div className={listStyles.gridEmail}>{email ?? client.email}</div>
          </div>
        </div>
        <div
          className={listStyles.gridHeadAside}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className={cn(collectionStyles.status, statusClass)}>
            <span className={collectionStyles.statusDot} />
            {statusLabel}
          </span>
          <CoachClientProgramPauseMenu
            client={client}
            onPatch={onPatch}
            buttonClassName={listStyles.gridCardActionBtn}
          />
        </div>
      </div>

      <div className={styles.gridAttention}>{attentionBlock}</div>
      {noteLine ? (
        <p
          className={cn(styles.standingNote, styles.gridStandingNote)}
          title={client.standingNote ?? undefined}
        >
          {noteLine}
        </p>
      ) : null}

      <div className={listStyles.gridBody}>
        <div className={listStyles.gridStats}>
          <div className={listStyles.gridStatRow}>
            <span className={listStyles.gridStatLabel}>Last activity</span>
            <span
              className={gridStatValueClass(
                lastActivityLabel,
                lastActivityColor,
                "activity",
              )}
            >
              {lastActivityLabel}
            </span>
          </div>
          <div className={listStyles.gridStatRow}>
            <span className={listStyles.gridStatLabel}>Last check-in</span>
            <span
              className={gridStatValueClass(
                lastCheckinLabel,
                lastCheckinColor,
                "checkin",
              )}
            >
              {lastCheckinLabel}
            </span>
          </div>
          <div className={listStyles.gridStatRow}>
            <span className={listStyles.gridStatLabel}>Workouts / wk</span>
            <span
              className={gridStatValueClass(
                String(client.metrics.workoutsThisWeek),
                "",
                "workouts",
              )}
            >
              {client.metrics.workoutsThisWeek}
            </span>
          </div>
        </div>
        {showRing ? (
          <div className={listStyles.gridRingWrap}>
            <ScoreRing
              score={athleteScore.score}
              tier={athleteScore.tier}
              size={GRID_RING_SIZE}
              wrapClass={listStyles.gridScoreRing}
              svgClass={listStyles.gridScoreRingSvg}
              valueClass={listStyles.gridScoreRingValue}
            />
            <div className={listStyles.gridTierLabel}>
              {athleteScore.paused
                ? "Paused"
                : tierLabelForKey(athleteScore.tier)}
            </div>
          </div>
        ) : (
          <div className={listStyles.gridRingWrap}>
            <div className={listStyles.gridNoScore}>—</div>
            <div className={listStyles.gridNoScoreLabel}>no score</div>
          </div>
        )}
      </div>

      <div
        className={cn(
          listStyles.gridFoot,
          !hasProgram && listStyles.gridFootNone,
        )}
      >
        <span className={listStyles.gridFootIcon} aria-hidden>
          ▦
        </span>
        {hasProgram ? (
          <>
            <span className={listStyles.gridFootProgram}>{programName}</span>
            {weekLabel ? (
              <span className={listStyles.gridFootWeek}> · {weekLabel}</span>
            ) : null}
          </>
        ) : (
          <span>No program</span>
        )}
      </div>
    </div>
  );
}

export function CoachAthleteCardStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <CollectionCardStack className={cn(listStyles.listCardStack, className)}>
      {children}
    </CollectionCardStack>
  );
}
