"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiClient";
import { useToast } from "@/components/ui/toast-provider";
import styles from "./CoachStandingNote.module.css";

type Props = {
  clientId: string;
  /** Initial note from summary (null = empty). */
  initialNote: string | null;
  onSaved?: (note: string | null) => void;
};

/**
 * Inline standing coaching memo on the client overview header.
 * Empty state: "No note — click Edit to add one".
 */
export function CoachStandingNote({ clientId, initialNote, onSaved }: Props) {
  const { addToast } = useToast();
  const [note, setNote] = useState<string | null>(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(initialNote);
    if (!editing) setDraft(initialNote ?? "");
  }, [initialNote, editing]);

  const startEdit = () => {
    setDraft(note ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setDraft(note ?? "");
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchApi(`/api/coach/clients/${clientId}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `Save failed (${res.status})`);
      }
      const next = (body.note as string | null) ?? null;
      setNote(next);
      setDraft(next ?? "");
      setEditing(false);
      onSaved?.(next);
      addToast({
        title: next ? "Note saved" : "Note cleared",
        variant: "success",
      });
    } catch (e) {
      addToast({
        title: "Couldn't save note",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={styles.wrap} data-standing-note="edit">
        <textarea
          className={styles.textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Private coaching note (only you can see this)"
          disabled={saving}
          aria-label="Standing coach note"
        />
        <div className={styles.editActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={cancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  const display = note?.trim() || null;

  return (
    <div className={styles.wrap} data-standing-note="view">
      <p className={display ? styles.noteText : styles.emptyText}>
        {display ?? "No note — click Edit to add one"}
      </p>
      <button type="button" className={styles.editLink} onClick={startEdit}>
        Edit
      </button>
    </div>
  );
}
