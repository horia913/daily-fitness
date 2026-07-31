"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  TrainingBlock,
} from "@/types/trainingBlock";
import {
  formatPhaseDisplayName,
  phaseTypeDisplayLabel,
} from "@/lib/programs/periodizationStyles";
import css from "./programEditV1.module.css";

export interface TrainingBlockHeaderProps {
  trainingBlocks: TrainingBlock[];
  activeBlockId: string | null;
  periodizationStyle?: string | null;
  onSelectBlock: (id: string) => void;
  onAddBlock: () => void;
  /** Opens block modal (rename + full block details). */
  onEditBlock: (block: TrainingBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<TrainingBlock>) => void;
  onMoveBlock: (blockId: string, direction: "left" | "right") => void;
  /** Creates a sibling block from an existing one (same metadata, new name). */
  onDuplicateBlock?: (block: TrainingBlock) => void | Promise<void>;
}

const CYAN = "var(--fc-group-c)";
const CYAN_DIM = "rgba(34, 211, 238, 0.18)";
const CYAN_SOFT = "rgba(34, 211, 238, 0.12)";
const CYAN_GLOW = "rgba(34, 211, 238, 0.04)";

export function TrainingBlockHeader({
  trainingBlocks,
  activeBlockId,
  periodizationStyle,
  onSelectBlock,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onUpdateBlock: _onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
}: TrainingBlockHeaderProps) {
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const closeMenu = useCallback(() => {
    setMenuBlockId(null);
    setMenuPos(null);
  }, []);

  const openMenuForBlock = useCallback((blockId: string) => {
    const el = triggerRefs.current[blockId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = 168;
    let left = r.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    let top = r.bottom + 6;
    const maxTop = window.innerHeight - 280;
    if (top > maxTop) top = Math.max(8, r.top - 6 - 260);
    setMenuPos({ top, left });
    setMenuBlockId(blockId);
  }, []);

  useEffect(() => {
    if (!menuBlockId) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const menuEl = document.getElementById("training-block-context-menu");
      if (menuEl?.contains(t)) return;
      const trig = triggerRefs.current[menuBlockId];
      if (trig?.contains(t)) return;
      closeMenu();
    };
    const onScroll = () => closeMenu();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuBlockId, closeMenu]);

  useLayoutEffect(() => {
    if (!menuBlockId || !menuPos) return;
    const el = triggerRefs.current[menuBlockId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = 168;
    let left = r.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    let top = r.bottom + 6;
    const maxTop = window.innerHeight - 280;
    if (top > maxTop) top = Math.max(8, r.top - 6 - 260);
    setMenuPos({ top, left });
  }, [menuBlockId, trainingBlocks.length]);

  if (!activeBlock) return null;

  const menuBlock = menuBlockId ? trainingBlocks.find((b) => b.id === menuBlockId) : null;
  const menuIndex = menuBlock ? trainingBlocks.findIndex((b) => b.id === menuBlock.id) : -1;

  return (
    <div className={`space-y-2 ${css.wrap}`}>
      <div className="flex min-h-9 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--pe-t2)]"
            style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
          >
            Training phases
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] text-[var(--pe-t2)]"
            style={{
              fontFamily: "var(--f-mono, Geist Mono, monospace)",
              background: "var(--pe-card-2)",
            }}
          >
            {trainingBlocks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddBlock}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium text-[var(--fc-accent)] bg-transparent hover:bg-[var(--fc-accent-dim)] border border-transparent hover:border-[var(--fc-accent-glow)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add phase
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 items-stretch">
        {trainingBlocks.map((block, index) => {
          const isActive = block.id === activeBlockId;
          const phaseSubtitle = phaseTypeDisplayLabel(block, { periodizationStyle });
          const displayName = formatPhaseDisplayName(block.name, block.phase_label, {
            periodizationStyle,
            blockOrder: block.block_order,
          });
          const { startWeek, endWeek } = blockWeekRanges[index];

          return (
            <div key={block.id} className="relative flex-shrink-0 w-[min(100%,160px)] min-w-[160px]">
              <button
                type="button"
                onClick={() => onSelectBlock(block.id)}
                className="relative w-full flex flex-col items-start gap-1 rounded-[13px] px-2.5 py-2.5 text-left transition-all min-h-[72px]"
                style={{
                  background: isActive ? CYAN_GLOW : "var(--pe-card-2)",
                  border: `1px solid ${isActive ? CYAN : "var(--pe-line)"}`,
                  boxShadow: isActive ? `0 0 0 1px ${CYAN_DIM}, 0 4px 20px ${CYAN_DIM}` : undefined,
                  opacity: isActive ? 1 : 0.92,
                }}
              >
                <div className="flex items-start justify-between gap-1 w-full pr-5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                      style={{
                        background: isActive ? CYAN : "rgba(255,255,255,0.25)",
                        boxShadow: isActive ? `0 0 8px ${CYAN}` : undefined,
                      }}
                    />
                    <span
                      className="text-[12.5px] font-semibold truncate leading-tight text-[var(--pe-t1)]"
                      style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
                    >
                      {displayName}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[9.5px] truncate w-full leading-tight text-[var(--pe-t3)] pl-3"
                  style={{
                    fontFamily: "var(--f-mono, Geist Mono, monospace)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {phaseSubtitle ? `${phaseSubtitle} · ` : ''}Wks {startWeek}–{endWeek}
                </span>
              </button>

              <button
                ref={(el) => {
                  triggerRefs.current[block.id] = el;
                }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuBlockId === block.id) closeMenu();
                  else openMenuForBlock(block.id);
                }}
                className="absolute top-2 right-2 w-[18px] h-[18px] rounded flex items-center justify-center text-[var(--pe-t3)] hover:text-[var(--pe-t1)] transition-colors"
                aria-label="Phase menu"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {activeBlock && activeBlockRange && (
        <p
          className="text-[11px] leading-snug pt-1"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          <span className="text-[var(--pe-t3)]">Editing </span>
          <span className="font-semibold text-[var(--fc-accent)]">
            {formatPhaseDisplayName(activeBlock.name, activeBlock.phase_label, {
              periodizationStyle,
              blockOrder: activeBlock.block_order,
            })}
          </span>
          <span className="text-[var(--pe-t3)]">
            {" "}
            · Weeks {activeBlockRange.startWeek}–{activeBlockRange.endWeek}
          </span>
        </p>
      )}

      {menuBlock &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="training-block-context-menu"
            role="menu"
            className="fixed z-[10050] min-w-[160px] rounded-[11px] p-1 shadow-2xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              background: "var(--pe-card, #0E1F2E)",
              border: "1px solid var(--pe-line, rgba(255,255,255,0.08))",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuRow
              icon={<Pencil className="w-3 h-3" />}
              label="Rename phase"
              onClick={() => {
                closeMenu();
                onEditBlock(menuBlock);
              }}
            />
            {onDuplicateBlock ? (
              <MenuRow
                icon={<Copy className="w-3 h-3" />}
                label="Duplicate phase"
                onClick={() => {
                  closeMenu();
                  void onDuplicateBlock(menuBlock);
                }}
              />
            ) : null}
            <div className="h-px my-1 bg-[rgba(255,255,255,0.08)]" />
            <MenuRow
              icon={<ChevronLeft className="w-3 h-3" />}
              label="Move left"
              disabled={menuIndex <= 0}
              onClick={() => {
                if (menuIndex <= 0) return;
                closeMenu();
                onMoveBlock(menuBlock.id, "left");
              }}
            />
            <MenuRow
              icon={<ChevronRight className="w-3 h-3" />}
              label="Move right"
              disabled={menuIndex >= trainingBlocks.length - 1}
              onClick={() => {
                if (menuIndex >= trainingBlocks.length - 1) return;
                closeMenu();
                onMoveBlock(menuBlock.id, "right");
              }}
            />
            <div className="h-px my-1 bg-[rgba(255,255,255,0.08)]" />
            <MenuRow
              icon={<Trash2 className="w-3 h-3 text-[#FF5A5F]" />}
              label="Delete phase"
              danger
              onClick={() => {
                closeMenu();
                onDeleteBlock(menuBlock.id);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors"
      style={danger ? { color: "#FF5A5F" } : undefined}
      onMouseEnter={(e) => {
        if (danger && !disabled) {
          e.currentTarget.style.background = "rgba(255,90,95,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
      }}
    >
      <span className="text-[rgba(255,255,255,0.42)] w-3 h-3 flex items-center justify-center shrink-0 [&_svg]:text-current">
        {icon}
      </span>
      {label}
    </button>
  );
}
