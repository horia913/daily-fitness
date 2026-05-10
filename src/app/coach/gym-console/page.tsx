"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { User, CheckCircle, Loader2, Plus, X } from "lucide-react";
import { fetchApi } from "@/lib/apiClient";
import type { ClientStatus, ClientForModal } from "./gymConsoleTypes";
import { SessionCard } from "@/components/coach-gym-console/SessionCard";
import { GymTopBar } from "@/components/coach-gym-console/GymTopBar";
import { GymHero } from "@/components/coach-gym-console/GymHero";
import { AddClientButton } from "@/components/coach-gym-console/AddClientButton";
import gymStyles from "@/components/coach-gym-console/gymConsoleV1.module.css";

const STORAGE_KEY_CLIENTS = "gym-console-clients";
const MAX_CONSOLE_CLIENTS = 6;

function AddClientModal({
  open,
  onClose,
  currentIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentIds: string[];
  onSave: (ids: string[]) => void;
}) {
  const [list, setList] = useState<ClientForModal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentIds));

  useEffect(() => {
    setSelected(new Set(currentIds));
  }, [currentIds, open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchApi("/api/coach/clients")
      .then((res) => res.json())
      .then((body) => {
        const arr = Array.isArray(body.clients) ? body.clients : [];
        setList(arr.filter((c: ClientForModal) => c.status === "active"));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CONSOLE_CLIENTS) next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md max-h-[min(80vh,36rem)] gap-0 p-4 flex flex-col overflow-hidden sm:max-w-md"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
          <DialogTitle className="m-0 p-0 text-left text-lg font-semibold text-[color:var(--fc-text-primary)]">
            Add clients to console
          </DialogTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-2 text-xs text-[color:var(--fc-text-dim)]">Select up to {MAX_CONSOLE_CLIENTS} clients.</p>
        {loading ? (
          <div className="flex flex-1 justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent-cyan)]" aria-hidden />
          </div>
        ) : (
          <ul className="mb-4 flex-1 space-y-1 overflow-y-auto">
            {list.map((c) => {
              const name = c.profiles
                ? `${c.profiles.first_name ?? ""} ${c.profiles.last_name ?? ""}`.trim() || "Client"
                : "Client";
              const isSelected = selected.has(c.client_id);
              const disabled = !isSelected && selected.size >= MAX_CONSOLE_CLIENTS;
              return (
                <li key={c.client_id}>
                  <button
                    type="button"
                    onClick={() => !disabled && toggle(c.client_id)}
                    disabled={disabled}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm ${
                      isSelected
                        ? "border border-[color:color-mix(in_srgb,var(--fc-accent-cyan)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)]"
                        : "border border-transparent hover:bg-[color:var(--fc-glass-highlight)]"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <User className="h-4 w-4 shrink-0 text-[color:var(--fc-text-dim)]" />
                    <span className="flex-1 truncate text-[color:var(--fc-text-primary)]">{name}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 shrink-0 text-[color:var(--fc-accent-cyan)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex shrink-0 gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GymConsoleContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [consoleClientIds, setConsoleClientIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_CONSOLE_CLIENTS) : [];
    } catch {
      return [];
    }
  });

  const [statusList, setStatusList] = useState<ClientStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sessionSetsLogged, setSessionSetsLogged] = useState(0);
  const [prsToday, setPrsToday] = useState(0);

  const isFetchingStatusRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (!user || consoleClientIds.length === 0) {
      setStatusList([]);
      return;
    }
    if (isFetchingStatusRef.current) return;
    isFetchingStatusRef.current = true;
    setStatusLoading(true);
    try {
      const res = await fetchApi("/api/coach/gym-console/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: consoleClientIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch status");
      setStatusList(Array.isArray(data.clients) ? data.clients : []);
      setLastFetchedAt(Date.now());
    } catch (e) {
      console.error(e);
      addToast({ title: "Error", description: "Failed to load console status", variant: "destructive" });
      setStatusList([]);
    } finally {
      isFetchingStatusRef.current = false;
      setStatusLoading(false);
    }
  }, [user, consoleClientIds, addToast]);

  const fetchPrsToday = useCallback(async () => {
    if (!user || consoleClientIds.length === 0) {
      setPrsToday(0);
      return;
    }
    try {
      const res = await fetchApi("/api/coach/gym-console/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: consoleClientIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "metrics");
      setPrsToday(typeof data.prsToday === "number" ? data.prsToday : 0);
    } catch {
      setPrsToday(0);
    }
  }, [user, consoleClientIds]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    void fetchPrsToday();
  }, [fetchPrsToday]);

  useEffect(() => {
    if (!user || consoleClientIds.length === 0) return;
    let isVisible = document.visibilityState === "visible";

    const poll = () => {
      if (isVisible) void fetchStatus();
    };
    const intervalId = window.setInterval(poll, 30_000);
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) void fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, consoleClientIds, fetchStatus]);

  const saveConsoleClients = (ids: string[]) => {
    const next = ids.slice(0, MAX_CONSOLE_CLIENTS);
    setConsoleClientIds(next);
    try {
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleRemoveFromConsole = (clientId: string) => {
    const next = consoleClientIds.filter((id) => id !== clientId);
    saveConsoleClients(next);
  };

  const statusByClientId = useMemo(() => new Map(statusList.map((s) => [s.clientId, s])), [statusList]);
  const secondsAgo = lastFetchedAt != null ? Math.floor((Date.now() - lastFetchedAt) / 1000) : null;

  const bumpSessionSets = useCallback(() => {
    setSessionSetsLogged((n) => n + 1);
  }, []);

  const onClientPR = useCallback(() => {
    void fetchPrsToday();
  }, [fetchPrsToday]);

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className={`relative z-10 flex h-[100dvh] flex-col ${gymStyles.root}`}>
        <header className="sticky top-0 z-20 border-b border-[color:var(--fc-glass-border)] bg-[color:color-mix(in_srgb,var(--fc-bg-deep)_88%,transparent)] backdrop-blur-md">
          <GymTopBar onRefresh={fetchStatus} refreshing={statusLoading} />
          <GymHero
            secondsAgo={secondsAgo}
            clientCount={consoleClientIds.length}
            sessionSetsLogged={sessionSetsLogged}
            prsToday={prsToday}
          />
        </header>

        <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden">
          <div className="mx-auto max-w-7xl pb-[var(--fc-bottom-safe-area)] pt-2 sm:pb-6">
            {consoleClientIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-[color:var(--fc-text-dim)]" />
                <h2 className="mb-2 text-lg font-semibold text-[color:var(--fc-text-primary)]">No clients on the console</h2>
                <p className="mb-4 max-w-md text-sm text-[color:var(--fc-text-dim)]">
                  Add clients training in this session to see today&apos;s workout and last performance at a glance.
                </p>
                <Button className="fc-btn fc-btn-primary mb-3" onClick={() => setAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add clients to console
                </Button>
              </div>
            ) : (
              <>
                <section className="mb-5">
                  <div className="grid grid-cols-1 gap-5 px-4">
                    {consoleClientIds.map((clientId) => {
                      const status = statusByClientId.get(clientId);
                      if (!status) {
                        return (
                          <div
                            key={clientId}
                            className="flex min-h-[100px] items-center justify-center rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] p-4"
                          >
                            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent-cyan)]" />
                          </div>
                        );
                      }
                      return (
                        <SessionCard
                          key={clientId}
                          status={status}
                          onRemoveFromConsole={() => handleRemoveFromConsole(clientId)}
                          globalNowMs={nowMs}
                          onSessionSetLogged={bumpSessionSets}
                          onClientPR={onClientPR}
                        />
                      );
                    })}
                  </div>
                </section>
                <AddClientButton onClick={() => setAddModalOpen(true)} />
              </>
            )}
          </div>
        </div>

        <AddClientModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          currentIds={consoleClientIds}
          onSave={saveConsoleClients}
        />
      </div>
    </AnimatedBackground>
  );
}

export default function GymConsolePage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "admin"]}>
      <GymConsoleContent />
    </ProtectedRoute>
  );
}
