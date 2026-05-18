"use client";

import React, { useEffect, useMemo, useState } from "react";
import { List, Search } from "lucide-react";
import type { ExerciseProgression, TrainedExercise } from "@/lib/strengthAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import { ExerciseAccordionRow } from "./ExerciseAccordionRow";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";
import { Button } from "@/components/ui/button";

const PAGE = 20;

export function AllExercisesSection({
  trainedExercises,
  expandedExerciseId,
  progressionCache,
  loadingProgressionId,
  rangeBusy,
  onToggleExercise,
}: {
  trainedExercises: TrainedExercise[];
  expandedExerciseId: string | null;
  progressionCache: Record<string, ExerciseProgression>;
  loadingProgressionId: string | null;
  rangeBusy: boolean;
  onToggleExercise: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return trainedExercises
      .filter((ex) => !q || ex.name.toLowerCase().includes(q))
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }, [trainedExercises, debounced]);

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <SectionCard id="strength-exercises">
      <SectionHead
        icon={List}
        iconClassName="bg-[rgba(79,227,232,0.12)] text-[var(--cyan)]"
        title="All exercises"
        meta={<span>{trainedExercises.length} tracked</span>}
      />

      <div className={v6.searchBar}>
        <Search className="h-3 w-3 shrink-0 text-[var(--t3)]" aria-hidden />
        <input
          className={v6.searchInput}
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exercises"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyStateBlock
          icon={Search}
          title="No exercises match your search"
          description={
            debounced
              ? `No exercises match '${debounced}' · Clear search to see all.`
              : "No exercises to show."
          }
          actions={
            debounced
              ? [{ label: "Clear search", onClick: () => setQuery(""), variant: "outline" }]
              : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {slice.map((ex) => {
              const expanded = expandedExerciseId === ex.id;
              return (
                <ExerciseAccordionRow
                  key={ex.id}
                  exercise={ex}
                  expanded={expanded}
                  onToggle={() => onToggleExercise(ex.id)}
                  progression={progressionCache[ex.id] ?? null}
                  loading={loadingProgressionId === ex.id || (expanded && rangeBusy && !progressionCache[ex.id])}
                />
              );
            })}
          </div>
          {filtered.length > PAGE ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span
                className="text-[9px] text-[var(--t4)]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                Page {page + 1} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
