"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, ChevronRight } from "lucide-react";
import {
  TrainingBlock,
  TRAINING_BLOCK_GOALS,
  TrainingBlockGoal,
} from "@/types/trainingBlock";

interface TrainingBlockHeaderProps {
  trainingBlocks: TrainingBlock[];
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onAddBlock: () => void;
  onEditBlock: (block: TrainingBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<TrainingBlock>) => void;
  onMoveBlock: (blockId: string, direction: "left" | "right") => void;
}

const GOAL_COLORS: Record<TrainingBlockGoal, string> = {
  hypertrophy: "#06b6d4",
  strength: "#f97316",
  power: "#ef4444",
  peaking: "#a855f7",
  accumulation: "#3b82f6",
  conditioning: "#22c55e",
  deload: "#6b7280",
  general_fitness: "#14b8a6",
  sport_specific: "#eab308",
  custom: "#8b5cf6",
};

export function TrainingBlockHeader({
  trainingBlocks,
  activeBlockId,
  onSelectBlock,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onMoveBlock,
}: TrainingBlockHeaderProps) {
  const { isDark, getSemanticColor } = useTheme();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeBlock = trainingBlocks.find((b) => b.id === activeBlockId);

  // Compute absolute start/end weeks for every block (cumulative offset)
  const blockWeekRanges = (() => {
    let offset = 0;
    return trainingBlocks.map((block) => {
      const startWeek = offset + 1;
      const endWeek = offset + block.duration_weeks;
      offset += block.duration_weeks;
      return { startWeek, endWeek };
    });
  })();

  const activeBlockIndex = trainingBlocks.findIndex((b) => b.id === activeBlockId);
  const activeBlockRange = activeBlockIndex >= 0 ? blockWeekRanges[activeBlockIndex] : null;

  const surfaceStyle = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
  };

  const labelStyle = {
    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // Close menu on outside click
  React.useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  if (!activeBlock) return null;

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={surfaceStyle}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-bold uppercase tracking-wider"
          style={labelStyle}
        >
          Training Blocks
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddBlock}
          className="text-xs h-7 px-2 rounded-lg"
          style={{ color: getSemanticColor("trust").primary }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Training Block
        </Button>
      </div>

      {/* Block Timeline Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 items-center">
        {trainingBlocks.map((block, index) => {
          const isActive = block.id === activeBlockId;
          const goalColor = GOAL_COLORS[block.goal];
          const goalLabel = TRAINING_BLOCK_GOALS[block.goal];
          const { startWeek, endWeek } = blockWeekRanges[index];
          const isMenuOpen = openMenuId === block.id;

          return (
            <React.Fragment key={block.id}>
              {/* Block Pill */}
              <div
                className="relative flex-shrink-0"
                ref={isMenuOpen ? menuRef : undefined}
              >
                <button
                  onClick={() => onSelectBlock(block.id)}
                  className="relative flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[120px] max-w-[170px]"
                  style={{
                    background: isActive
                      ? `${goalColor}22`
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    border: `1.5px solid ${
                      isActive
                        ? goalColor
                        : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)"
                    }`,
                    boxShadow: isActive ? `0 2px 8px ${goalColor}30` : "none",
                  }}
                >
                  {/* Block name */}
                  <div className="flex items-center gap-1.5 w-full pr-4">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: goalColor }}
                    />
                    <span
                      className="text-xs font-bold truncate"
                      style={{
                        color: isActive
                          ? goalColor
                          : isDark
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(0,0,0,0.8)",
                      }}
                    >
                      {block.name}
                    </span>
                  </div>
                  {/* Goal + week range */}
                  <span
                    className="text-xs pl-3.5 truncate w-full"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(0,0,0,0.45)",
                    }}
                  >
                    {goalLabel} · Wks {startWeek}–{endWeek}
                  </span>
                </button>

                {/* "..." menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(block.id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-1 w-44 rounded-xl shadow-xl border z-50 py-1"
                    style={{
                      background: isDark ? "#1f2937" : "#ffffff",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      onClick={() => {
                        setOpenMenuId(null);
                        onEditBlock(block);
                      }}
                    >
                      Edit Block Details
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors disabled:opacity-40"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      disabled={index === 0}
                      onClick={() => {
                        setOpenMenuId(null);
                        onMoveBlock(block.id, "left");
                      }}
                    >
                      Move Left
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors disabled:opacity-40"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      disabled={index === trainingBlocks.length - 1}
                      onClick={() => {
                        setOpenMenuId(null);
                        onMoveBlock(block.id, "right");
                      }}
                    >
                      Move Right
                    </button>
                    <div
                      className="my-1 h-px"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                      }}
                    />
                    <button
                      className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-red-500/10"
                      style={{ color: "#ef4444" }}
                      onClick={() => {
                        setOpenMenuId(null);
                        onDeleteBlock(block.id);
                      }}
                    >
                      Delete Block
                    </button>
                  </div>
                )}
              </div>

              {/* Arrow connector between pills */}
              {index < trainingBlocks.length - 1 && (
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active block context label */}
      {activeBlock && activeBlockRange && (
        <p
          className="text-xs mt-2.5 font-medium"
          style={{
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
          }}
        >
          Editing:{" "}
          <span style={{ color: GOAL_COLORS[activeBlock.goal] }}>
            {activeBlock.name}
          </span>{" "}
          (Weeks {activeBlockRange.startWeek}–{activeBlockRange.endWeek})
        </p>
      )}
    </div>
  );
}
