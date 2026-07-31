"use client";

import { cn } from "@/lib/utils";
import styles from "./progressSuiteV1.module.css";

type Tile = "cyan" | "purple" | "warning" | "good" | "action" | "pink" | "orange";

const tileMap: Record<Tile, string> = {
  cyan: styles.psIconTileCyan,
  purple: styles.psIconTilePurple,
  warning: styles.psIconTileWarning,
  good: styles.psIconTileGood,
  action: styles.psIconTileAction,
  pink: styles.psIconTilePink,
  orange: styles.psIconTileOrange,
};

export function PsChartCard({
  iconTile = "cyan",
  iconTileSize,
  icon,
  title,
  subtitle,
  headRight,
  children,
  className,
}: {
  iconTile?: Tile;
  iconTileSize?: "sm";
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  headRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const sm = iconTileSize === "sm";
  return (
    <section className={cn(styles.psChartCard, className)}>
      <div className={styles.psChartHead}>
        <div
          className={cn(
            styles.psIconTile,
            sm && styles.psIconTileSm,
            tileMap[iconTile],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={cn(styles.psChartTitle, styles.psFontHeadline)}>
            {title}
          </h2>
          {subtitle ? (
            <p className={cn(styles.psChartSub, styles.psFontBody)}>{subtitle}</p>
          ) : null}
        </div>
        {headRight ? (
          <div className={styles.psChartHeadValue}>{headRight}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
