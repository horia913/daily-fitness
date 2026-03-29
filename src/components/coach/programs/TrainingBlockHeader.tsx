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
  onUpdateBlock: _onUpdateBlock,
  onMoveBlock,
}: TrainingBlockHeaderProps) {
  const { isDark, getSemanticColor } = useTheme();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeBlock = trainingBlocks.find((b) => b.id === activeBlockId);

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

  const labelStyle = {
    color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

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
    <div className="space-y-2">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={labelStyle}
        >
          Training blocks
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddBlock}
          className="h-8 px-2.5 text-xs font-medium rounded-lg"
          style={{ color: getSemanticColor("trust").primary }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add block
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 items-center">
        {trainingBlocks.map((block, index) => {
          const isActive = block.id === activeBlockId;
          const goalColor = GOAL_COLORS[block.goal];
          const goalLabel = TRAINING_BLOCK_GOALS[block.goal];
          const { startWeek, endWeek } = blockWeekRanges[index];
          const isMenuOpen = openMenuId === block.id;

          return (
            <React.Fragment key={block.id}>
              <div
                className="relative flex-shrink-0"
                ref={isMenuOpen ? menuRef : undefined}
              >
                <button
                  onClick={() => onSelectBlock(block.id)}
                  className="relative flex flex-col items-start gap-0 px-2.5 py-1.5 rounded-lg transition-all min-w-[108px] max-w-[160px] text-left"
                  style={{
                    background: isActive
                      ? `${goalColor}18`
                      : isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    border: `1px solid ${
                      isActive
                        ? goalColor
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)"
                    }`,
                  }}
                >
                  <div className="flex items-center gap-1 w-full pr-4">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: goalColor }}
                    />
                    <span
                      className="text-xs font-semibold truncate leading-tight"
                      style={{
                        color: isActive
                          ? goalColor
                          : isDark
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(0,0,0,0.85)",
                      }}
                    >
                      {block.name}
                    </span>
                  </div>
                  <span
                    className="text-[11px] pl-2.5 truncate w-full leading-tight"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.45)",
                    }}
                  >
                    {goalLabel} · Wks {startWeek}–{endWeek}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(block.id);
                  }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-1 w-44 rounded-lg shadow-xl border z-50 py-1"
                    style={{
                      background: isDark ? "#1f2937" : "#ffffff",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      onClick={() => {
                        setOpenMenuId(null);
                        onEditBlock(block);
                      }}
                    >
                      Edit block
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors disabled:opacity-40"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      disabled={index === 0}
                      onClick={() => {
                        setOpenMenuId(null);
                        onMoveBlock(block.id, "left");
                      }}
                    >
                      Move left
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--fc-glass-highlight)] transition-colors disabled:opacity-40"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      disabled={index === trainingBlocks.length - 1}
                      onClick={() => {
                        setOpenMenuId(null);
                        onMoveBlock(block.id, "right");
                      }}
                    >
                      Move right
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
                      className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-red-500/10"
                      style={{ color: "#ef4444" }}
                      onClick={() => {
                        setOpenMenuId(null);
                        onDeleteBlock(block.id);
                      }}
                    >
                      Delete block
                    </button>
                  </div>
                )}
              </div>

              {index < trainingBlocks.length - 1 && (
                <ChevronRight
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {activeBlock && activeBlockRange && (
        <p
          className="text-[11px] leading-snug border-t border-black/5 dark:border-white/5 pt-2 mt-1 fc-text-subtle"
        >
          <span className="text-[color:var(--fc-text-dim)]">Editing </span>
          <span style={{ color: GOAL_COLORS[activeBlock.goal] }} className="font-medium">
            {activeBlock.name}
          </span>
          <span className="text-[color:var(--fc-text-dim)]">
            {" "}
            · Weeks {activeBlockRange.startWeek}–{activeBlockRange.endWeek}
          </span>
        </p>
      )}
    </div>
  );
}
