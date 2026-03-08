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
        className={`flex-shrink-0 ${theme?.card ?? ''} border-t ${theme?.border ?? ''} px-6 py-4 rounded-b-3xl`}
      >
        <div className="w-full flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            onClick={() => onSubmit()}
            className={`${theme?.primary ?? ''} flex items-center gap-2 rounded-xl w-full sm:w-auto justify-center`}
          >
            <Save className="w-4 h-4" />
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
