"use client";

import React from "react";
import type { MealPlanSaveUiState } from "@/types/mealPlanDraft";
import styles from "./mealDisplay.module.css";

interface MealPlanSaveButtonProps {
  saveState: MealPlanSaveUiState;
  isDirty: boolean;
  errorMessage?: string | null;
  onSave: () => void;
}

export function MealPlanSaveButton({
  saveState,
  isDirty,
  errorMessage,
  onSave,
}: MealPlanSaveButtonProps) {
  const label =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Save";

  const canSave = saveState === "error" || isDirty;

  return (
    <div className={styles.saveWrap}>
      <button
        type="button"
        data-testid="meal-plan-save-button"
        onClick={() => {
          if (saveState === "saving") return;
          void onSave();
        }}
        disabled={saveState === "saving" || !canSave}
        className={`${styles.saveBtn} ${canSave ? styles.saveBtnDirty : styles.saveBtnIdle}`}
      >
        {isDirty && saveState === "idle" ? (
          <span className={styles.saveDot} aria-hidden />
        ) : null}
        {label}
      </button>
      {isDirty && saveState === "idle" ? (
        <span className={styles.saveHint}>Unsaved changes</span>
      ) : null}
      {saveState === "error" && errorMessage ? (
        <span className={styles.saveError} title={errorMessage}>
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
