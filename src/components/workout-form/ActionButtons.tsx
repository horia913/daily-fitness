'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface ActionButtonsProps {
  onCancel: () => void;
  /** Called when submit button is clicked. Event is optional so form submit handlers are assignable. */
  onSubmit: (e?: React.FormEvent) => void | Promise<void>;
  loading: boolean;
  /** When truthy, submit button label is "Update Template"; otherwise "Create Template". */
  template?: unknown;
}

export function ActionButtons({
  onCancel,
  onSubmit,
  loading,
  template,
}: ActionButtonsProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles?.() ?? {};

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
            className="h-9 text-sm rounded-lg w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            onClick={() => onSubmit()}
            className={`${theme?.primary ?? ''} flex items-center gap-2 h-9 text-sm rounded-lg w-full sm:w-auto justify-center`}
          >
            <Save className="w-3.5 h-3.5" />
            {loading
              ? 'Saving...'
              : template
                ? 'Update Template'
                : 'Create Template'}
          </Button>
        </div>
      </div>
    </>
  );
}
