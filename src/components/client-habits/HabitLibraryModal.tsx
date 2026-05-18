"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { HabitTemplateRow } from "@/lib/habitTemplateService";
import { ModalHead } from "./ModalHead";
import { CategoryChips, type ChipFilterId } from "./CategoryChips";
import { HabitCategoryGroup } from "./HabitCategoryGroup";
import { ModalFooter } from "./ModalFooter";
import { EmptyHabitSearch } from "./EmptyHabitSearch";
import styles from "./habitLibraryModalV1.module.css";

function matchesSearch(t: HabitTemplateRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const name = t.name.toLowerCase();
  const desc = (t.description ?? "").toLowerCase();
  return name.includes(s) || desc.includes(s);
}

const CHIP_CAT_KEYS: ChipFilterId[] = [
  "hydration",
  "nutrition",
  "movement",
  "sleep_recovery",
  "mindfulness",
];

function buildChipCounts(
  searchFiltered: HabitTemplateRow[],
): Record<ChipFilterId, number> {
  const c: Record<ChipFilterId, number> = {
    all: searchFiltered.length,
    hydration: 0,
    nutrition: 0,
    movement: 0,
    sleep_recovery: 0,
    mindfulness: 0,
  };
  for (const t of searchFiltered) {
    const k = t.category as ChipFilterId;
    if (CHIP_CAT_KEYS.includes(k)) c[k] += 1;
  }
  return c;
}

function sessionSummaryLine(
  ids: Set<string>,
  templates: HabitTemplateRow[],
): string {
  if (ids.size === 0) return "";
  const idList = Array.from(ids);
  const names = idList
    .map((id) => templates.find((t) => t.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const shown = names.slice(0, 3);
  const rest = names.length - 3;
  let s = shown.join(" · ");
  if (rest > 0) s += ` + ${rest} more`;
  return s;
}

export type HabitLibraryModalProps = {
  open: boolean;
  view: "library" | "configure";
  onClose: () => void;
  templatesLoading: boolean;
  pickableTemplates: HabitTemplateRow[];
  categoryOrder: readonly string[];
  categoryLabel: Record<string, string>;
  isManualLike: (t: HabitTemplateRow) => boolean;
  isAutoTracked: (t: HabitTemplateRow) => boolean;
  savingHabit: boolean;
  onCommitSession: (templateIds: string[]) => Promise<void>;
  onPickConfigurable: (t: HabitTemplateRow) => void;
  configureTemplate: HabitTemplateRow | null;
  configureForm: Record<string, string>;
  setConfigureForm: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onSaveConfigure: () => Promise<void>;
  onBackConfigure: () => void;
  inputModeForKey: (key: string) => "text" | "number";
};

export function HabitLibraryModal({
  open,
  view,
  onClose,
  templatesLoading,
  pickableTemplates,
  categoryOrder,
  categoryLabel,
  isManualLike,
  isAutoTracked,
  savingHabit,
  onCommitSession,
  onPickConfigurable,
  configureTemplate,
  configureForm,
  setConfigureForm,
  onSaveConfigure,
  onBackConfigure,
  inputModeForKey,
}: HabitLibraryModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const prevOpen = useRef(false);

  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [chip, setChip] = useState<ChipFilterId>("all");
  const [sessionIds, setSessionIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchDraft), 150);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setSessionIds(new Set());
      setSearchDraft("");
      setDebouncedSearch("");
      setChip("all");
    }
    prevOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || view !== "library") return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, view]);

  const requestClose = useCallback(() => {
    if (sessionIds.size > 0) {
      const ok = window.confirm(
        `Discard ${sessionIds.size} selected habit${sessionIds.size === 1 ? "" : "s"}?`,
      );
      if (!ok) return;
    }
    setSessionIds(new Set());
    onClose();
  }, [sessionIds, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement)) return;
      const sel =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const list = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
        (el) => !el.hasAttribute("disabled") && root.contains(el),
      );
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose, view]);

  const searchFiltered = useMemo(
    () => pickableTemplates.filter((t) => matchesSearch(t, debouncedSearch)),
    [pickableTemplates, debouncedSearch],
  );

  const chipCounts = useMemo(
    () => buildChipCounts(searchFiltered),
    [searchFiltered],
  );

  const bodyList = useMemo(() => {
    if (chip === "all") return searchFiltered;
    return searchFiltered.filter((t) => t.category === chip);
  }, [searchFiltered, chip]);

  const grouped = useMemo(() => {
    const m = new Map<string, HabitTemplateRow[]>();
    for (const t of bodyList) {
      if (!m.has(t.category)) m.set(t.category, []);
      m.get(t.category)!.push(t);
    }
    return m;
  }, [bodyList]);

  const searchEmpty =
    debouncedSearch.trim().length > 0 &&
    searchFiltered.length === 0 &&
    pickableTemplates.length > 0;

  const libraryFullyEmpty = !templatesLoading && pickableTemplates.length === 0;

  const toggleSession = (id: string) => {
    setSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onRowActivate = (t: HabitTemplateRow) => {
    if (t.user_configurable_keys.length > 0) {
      onPickConfigurable(t);
      return;
    }
    toggleSession(t.id);
  };

  const handleDone = async () => {
    if (sessionIds.size === 0) return;
    await onCommitSession(Array.from(sessionIds));
    setSessionIds(new Set());
  };

  const footerSummary = useMemo(
    () => sessionSummaryLine(sessionIds, pickableTemplates),
    [sessionIds, pickableTemplates],
  );

  const liveMsg =
    sessionIds.size > 0
      ? `${sessionIds.size} habit(s) staged. ${footerSummary}`
      : "";

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.portalRoot} role="presentation">
      <div
        className={styles.backdrop}
        aria-hidden
        onClick={() => requestClose()}
      />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${styles.root}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          view === "library" ? "habit-lib-title" : "habit-cfg-title"
        }
      >
        <div className={styles.grabber} aria-hidden />
        {liveMsg ? (
          <span className="sr-only" aria-live="polite">
            {liveMsg}
          </span>
        ) : null}

        {view === "library" ? (
          <>
            <ModalHead
              ref={searchRef}
              searchValue={searchDraft}
              onSearchChange={setSearchDraft}
              onClose={requestClose}
            />
            <CategoryChips
              active={chip}
              onChange={setChip}
              counts={chipCounts}
            />
            <div className={styles.scrollBody}>
              {templatesLoading ? (
                <p
                  style={{
                    color: "var(--t3)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  Loading library…
                </p>
              ) : null}
              {!templatesLoading && libraryFullyEmpty ? (
                <p
                  style={{
                    color: "var(--t3)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  You already added every habit from the library.
                </p>
              ) : null}
              {!templatesLoading && searchEmpty ? (
                <EmptyHabitSearch
                  query={debouncedSearch.trim()}
                  onClear={() => setSearchDraft("")}
                />
              ) : null}
              {!templatesLoading &&
                !libraryFullyEmpty &&
                !searchEmpty &&
                categoryOrder.map((cat) => {
                  const list = grouped.get(cat);
                  if (!list?.length) return null;
                  return (
                    <HabitCategoryGroup
                      key={cat}
                      category={cat}
                      label={categoryLabel[cat] ?? cat}
                      templates={list}
                      sessionIds={sessionIds}
                      saving={savingHabit}
                      isManualLike={isManualLike}
                      isAutoTracked={isAutoTracked}
                      onRowActivate={onRowActivate}
                    />
                  );
                })}
            </div>
            <ModalFooter
              sessionCount={sessionIds.size}
              sessionSummaryLine={footerSummary}
              saving={savingHabit}
              onClose={requestClose}
              onDone={() => void handleDone()}
            />
          </>
        ) : (
          <>
            <header className={styles.configureHead}>
              <div className={styles.titleRow}>
                <div className={styles.metaCol}>
                  <h2 id="habit-cfg-title" className={styles.configureTitle}>
                    {configureTemplate?.name}
                  </h2>
                  <p className={styles.configureDesc}>
                    {configureTemplate?.description ?? "Set your targets."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  className={styles.modalCloseBtn}
                  aria-label="Close"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            </header>
            <div className={styles.configureBody}>
              <div className={styles.fieldStack}>
                {configureTemplate?.user_configurable_keys.map((key) => (
                  <div key={key}>
                    <label
                      className={styles.fieldLabel}
                      htmlFor={`habit-cfg-${key}`}
                    >
                      {key.replace(/_/g, " ")}
                    </label>
                    <input
                      id={`habit-cfg-${key}`}
                      type={inputModeForKey(key)}
                      inputMode={key === "bedtime" ? "text" : "decimal"}
                      className={styles.fieldInput}
                      value={configureForm[key] ?? ""}
                      onChange={(e) =>
                        setConfigureForm((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={key === "bedtime" ? "23:00" : ""}
                    />
                  </div>
                ))}
              </div>
            </div>
            <footer className={styles.configureFoot}>
              <button
                type="button"
                className={styles.btnPrimary}
                style={{ flex: 1 }}
                disabled={savingHabit}
                onClick={() => void onSaveConfigure()}
              >
                {savingHabit ? "Saving…" : "Save habit"}
              </button>
              <button
                type="button"
                className={styles.btnOutline}
                disabled={savingHabit}
                onClick={onBackConfigure}
              >
                Back
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
