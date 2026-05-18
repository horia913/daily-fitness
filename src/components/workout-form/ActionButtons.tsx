'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import wt from '@/components/coach/workouts/workoutTemplateEditV1.module.css';
import { cn } from '@/lib/utils';

export interface ActionButtonsProps {
  onCancel: () => void;
  /** Called when submit button is clicked. Event is optional so form submit handlers are assignable. */
  onSubmit: (e?: React.FormEvent) => void | Promise<void>;
  loading: boolean;
  /** Shown on the save button and saving overlay while loading. */
  saveStatus?: string | null;
  /** When truthy, submit button label is "Update Template"; otherwise "Create Template". */
  template?: unknown;
  /** Coach template editor v1 — lime save, top fade, ghost cancel. */
  visualVariant?: "default" | "coachV1";
}

export function ActionButtons({
  onCancel,
  onSubmit,
  loading,
  saveStatus,
  template,
  visualVariant = 'default',
}: ActionButtonsProps) {
  const saveLabel = loading
    ? saveStatus ?? 'Saving...'
    : template
      ? 'Update template'
      : 'Create template';
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles?.() ?? {};

  if (visualVariant === 'coachV1') {
    return (
      <div className={wt.saveBar}>
        <div className={wt.saveBarInner}>
          <button
            type="button"
            className={wt.btnGhostCancel}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            onClick={() => {
              if (!loading) void onSubmit();
            }}
            className={wt.btnLimeSave}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} aria-hidden />
            ) : (
              <Save className="w-4 h-4" strokeWidth={2.25} aria-hidden />
            )}
            <span className="truncate max-w-[min(100%,14rem)]">{saveLabel}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Action Buttons */}
      <div
        className={`flex-shrink-0 border-t border-black/5 dark:border-white/5 px-3 py-3 sm:px-4 rounded-b-3xl ${theme?.card ?? ''}`}
      >
        <div className="w-full flex flex-col sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="h-9 text-sm rounded-lg w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            aria-busy={loading}
            onClick={() => {
              if (!loading) void onSubmit();
            }}
            className={`${theme?.primary ?? ''} flex items-center gap-2 h-9 text-sm rounded-lg w-full sm:w-auto justify-center`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="w-3.5 h-3.5" aria-hidden />
            )}
            <span className="truncate max-w-[min(100%,14rem)]">{saveLabel}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
