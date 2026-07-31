"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { computeClientTrainingStatus } from "@/lib/coachClientListTrainingStatus";
import type { Client } from "./coachClientsTypes";
import styles from "./coachClients.module.css";

type PauseSnapshot = Pick<
  Client,
  "pauseStatus" | "trainingStatus" | "athleteScore"
>;

const MENU_MIN_WIDTH = 168;
const VIEW_EDGE_PAD = 8;
const MENU_GAP = 4;

function computeMenuPosition(
  btnRect: DOMRect,
  menuHeight: number,
): Pick<CSSProperties, "top" | "left" | "width"> & { top: number; left: number; width: number } {
  let left = btnRect.right - MENU_MIN_WIDTH;
  left = Math.max(
    VIEW_EDGE_PAD,
    Math.min(left, window.innerWidth - MENU_MIN_WIDTH - VIEW_EDGE_PAD),
  );
  let top = btnRect.bottom + MENU_GAP;
  if (top + menuHeight > window.innerHeight - VIEW_EDGE_PAD) {
    top = btnRect.top - menuHeight - MENU_GAP;
  }
  top = Math.max(VIEW_EDGE_PAD, top);
  return { top, left, width: MENU_MIN_WIDTH };
}

export function CoachClientProgramPauseMenu({
  client,
  onPatch,
  buttonClassName,
}: {
  client: Client;
  onPatch: (patch: Partial<Client>) => void;
  buttonClassName?: string;
}) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  /** Training counts may disagree with roster metrics; use metrics so pause UI matches what coaches see. */
  const rosterAllowsPause =
    client.metrics.programStatus === "active" ||
    client.metrics.programStatus === "endingSoon" ||
    Boolean(client.metrics.activeProgramAssignmentId) ||
    Boolean(client.metrics.activeProgramName?.trim());

  const showKebab =
    client.pauseStatus === "paused" ||
    client.hasActiveProgram === true ||
    rosterAllowsPause;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuStyle(null);
  }, []);

  const updateMenuPlacement = useCallback(() => {
    const btn = btnRef.current;
    const menuEl = menuPortalRef.current;
    if (!btn || !menuEl || !menuOpen) return;
    const br = btn.getBoundingClientRect();
    const mh = menuEl.offsetHeight || 52;
    const pos = computeMenuPosition(br, mh);
    setMenuStyle({
      position: "fixed",
      zIndex: 10050,
      top: pos.top,
      left: pos.left,
      width: pos.width,
    });
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    updateMenuPlacement();
  }, [menuOpen, updateMenuPlacement]);

  useEffect(() => {
    if (!menuOpen) return;
    const onViewportChange = () => updateMenuPlacement();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [menuOpen, updateMenuPlacement]);

  useEffect(() => {
    if (!menuOpen) return;
    const fn = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuPortalRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", fn, true);
    return () => document.removeEventListener("pointerdown", fn, true);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  const firstName =
    (client.firstName && client.firstName.trim()) ||
    client.name.split(/\s+/)[0] ||
    "Client";

  const snapshot = (): PauseSnapshot => ({
    pauseStatus: client.pauseStatus,
    trainingStatus: client.trainingStatus,
    athleteScore: client.athleteScore,
  });

  const applyPauseOptimistic = () => {
    onPatch({
      pauseStatus: "paused",
      trainingStatus: "paused",
      athleteScore: client.athleteScore
        ? { ...client.athleteScore, paused: true }
        : client.athleteScore,
    });
  };

  const applyResumeOptimistic = () => {
    onPatch({
      pauseStatus: "active",
      trainingStatus: computeClientTrainingStatus({
        pauseStatus: "active",
        hasActiveProgram: client.hasActiveProgram,
        priorWeekScheduledCount: client.priorWeekScheduledCount,
        priorWeekCompletedCount: client.priorWeekCompletedCount,
        currentWeekCompletedCount: client.currentWeekCompletedCount,
        currentWeekScheduledPastCount: client.currentWeekScheduledPastCount,
      }),
      athleteScore: client.athleteScore
        ? { ...client.athleteScore, paused: false }
        : client.athleteScore,
    });
  };

  const confirmPause = async () => {
    const revert = snapshot();
    setPauseOpen(false);
    closeMenu();
    applyPauseOptimistic();
    try {
      const res = await fetchApi(`/api/coach/clients/${client.id}/program/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onPatch(revert);
        const msg =
          body?.error === "in_progress_workout"
            ? "Client has an in-progress workout. Finish or discard it before pausing."
            : typeof body?.error === "string"
              ? body.error
              : `Pause failed (${res.status})`;
        addToast({ variant: "destructive", title: msg });
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["coach-home-triage", user?.id],
      });
      addToast({
        variant: "success",
        title: `${client.name}'s program paused.`,
      });
    } catch (e) {
      onPatch(revert);
      addToast({
        variant: "destructive",
        title: e instanceof Error ? e.message : "Pause failed",
      });
    }
  };

  const confirmResume = async () => {
    const revert = snapshot();
    setResumeOpen(false);
    closeMenu();
    applyResumeOptimistic();
    try {
      const res = await fetchApi(`/api/coach/clients/${client.id}/program/resume`, {
        method: "PATCH",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onPatch(revert);
        addToast({
          variant: "destructive",
          title:
            typeof body?.error === "string"
              ? body.error
              : `Resume failed (${res.status})`,
        });
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["coach-home-triage", user?.id],
      });
      addToast({
        variant: "success",
        title: `${client.name}'s program resumed.`,
      });
    } catch (e) {
      onPatch(revert);
      addToast({
        variant: "destructive",
        title: e instanceof Error ? e.message : "Resume failed",
      });
    }
  };

  if (!showKebab) {
    return null;
  }

  const menuPanel =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuPortalRef}
            className={styles.kebabMenu}
            style={menuStyle ?? undefined}
            role="menu"
          >
            {client.pauseStatus === "paused" ? (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  setResumeOpen(true);
                }}
              >
                Resume program
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  setPauseOpen(true);
                }}
              >
                Pause program
              </button>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={styles.kebabWrap}>
        <button
          ref={btnRef}
          type="button"
          className={cn(styles.kebabBtn, buttonClassName)}
          aria-label="Client actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => {
              const next = !prev;
              if (next && btnRef.current) {
                const br = btnRef.current.getBoundingClientRect();
                const pos = computeMenuPosition(br, 52);
                setMenuStyle({
                  position: "fixed",
                  zIndex: 10050,
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                });
              } else if (!next) {
                setMenuStyle(null);
              }
              return next;
            });
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      {menuPanel}

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Pause program?</DialogTitle>
            <DialogDescription>
              Pause {firstName}&apos;s program? Their athlete score will freeze at the
              current value until you resume.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setPauseOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="fc-btn fc-btn-primary" onClick={confirmPause}>
              Pause program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Resume program?</DialogTitle>
            <DialogDescription>
              Resume {firstName}&apos;s program? Their scheduled workouts will continue from
              where they paused.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setResumeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="fc-btn fc-btn-primary" onClick={confirmResume}>
              Resume program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
