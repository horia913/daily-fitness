"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import v6 from "./progressAnalyticsV6.module.css";
import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn(v6.sectionCard, className)} id={id}>
      {children}
    </div>
  );
}

export function SectionHead({
  icon: Icon,
  iconClassName,
  title,
  description,
  meta,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className={v6.sectionHead}>
      <div className={v6.sectionHeadLeft}>
        <div className={cn(v6.sectionIcon, iconClassName)}>
          <Icon className="h-[13px] w-[13px]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className={v6.sectionTitle}>{title}</h2>
          {description ? <p className={v6.sectionDesc}>{description}</p> : null}
        </div>
      </div>
      {meta != null ? (
        <div className="shrink-0 text-right">
          <div className={v6.sectionMeta}>{meta}</div>
        </div>
      ) : null}
    </div>
  );
}
