"use client";

import React from "react";
import { cn } from "@/lib/utils";

const skeletonBase = "animate-pulse bg-[color:var(--fc-glass-highlight)]";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
}

function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
  const variantClasses = {
    text: "rounded-full h-4",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-xl",
    card: "rounded-2xl p-4",
  };
  const v = variant ?? "rectangular";

  return (
    <div
      className={cn(skeletonBase, variantClasses[v], className)}
      aria-hidden
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border border-[color:var(--fc-glass-border)]",
        className
      )}
    >
      <div className={cn(skeletonBase, "h-4 rounded-full w-3/4 mb-3")} />
      <div className={cn(skeletonBase, "h-3 rounded-full w-full mb-2")} />
      <div className={cn(skeletonBase, "h-3 rounded-full w-1/2 mb-2")} />
      <div className={cn(skeletonBase, "h-3 rounded-full w-2/3")} />
    </div>
  );
}

export { Skeleton, SkeletonCard };
