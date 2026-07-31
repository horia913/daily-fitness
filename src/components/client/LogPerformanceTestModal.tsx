"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PerformanceResultForm } from "@/components/coach/performance/PerformanceResultForm";
import {
  createPerformanceResult,
  updatePerformanceResult,
  type PerformanceTestCatalogItem,
  type PerformanceTestResult,
} from "@/lib/performanceTestService";

interface LogPerformanceTestModalProps {
  open: boolean;
  clientId: string;
  catalogTest: PerformanceTestCatalogItem;
  onClose: () => void;
  onSuccess: () => void;
  /** When set, modal edits this existing self-logged result. */
  editResult?: PerformanceTestResult | null;
}

export function LogPerformanceTestModal({
  open,
  clientId,
  catalogTest,
  onClose,
  onSuccess,
  editResult = null,
}: LogPerformanceTestModalProps) {
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open) setFormKey((k) => k + 1);
  }, [open, catalogTest.id, editResult?.id]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-performance-test-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-[500px] flex-col overflow-hidden rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-deep)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--fc-glass-border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--fc-accent)]">
              Performance
            </p>
            <h2
              id="log-performance-test-title"
              className="mt-1 text-xl font-bold fc-text-primary"
            >
              {editResult ? "Edit" : "Log"} {catalogTest.display_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PerformanceResultForm
            key={formKey}
            catalog={[catalogTest]}
            lockedTest={catalogTest}
            initial={editResult}
            variant="client"
            submitLabel={editResult ? "Update test" : "Save test"}
            onCancel={onClose}
            onSubmit={async (payload) => {
              if (editResult) {
                await updatePerformanceResult(editResult.id, payload);
              } else {
                await createPerformanceResult({
                  ...payload,
                  client_id: clientId,
                  tested_by: clientId,
                });
              }
              onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
