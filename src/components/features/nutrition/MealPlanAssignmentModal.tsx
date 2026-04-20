"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealPlan } from "@/lib/mealPlanService";
import { Client } from "@/lib/database";
import { MealPlanService } from "@/lib/mealPlanService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast-provider";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { supabase } from "@/lib/supabase";
import { Users, Check, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MealPlanAssignmentModalProps {
  mealPlan: MealPlan;
  clients: Client[];
  selectedClients: string[];
  onSelectedClientsChange: (clientIds: string[]) => void;
  onClose: () => void;
  onComplete: () => void;
}

export default function MealPlanAssignmentModal({
  mealPlan,
  clients,
  selectedClients,
  onSelectedClientsChange,
  onClose,
  onComplete,
}: MealPlanAssignmentModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [assigning, setAssigning] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [label, setLabel] = useState("");
  const [existingActiveCount, setExistingActiveCount] = useState<number>(0);
  /** Collapsed by default when roster is large so the modal stays compact. */
  const [rosterOpen, setRosterOpen] = useState(clients.length <= 4);

  useEffect(() => {
    if (selectedClients.length === 0) {
      setExistingActiveCount(0);
      return;
    }
    (async () => {
      const { count, error } = await supabase
        .from("meal_plan_assignments")
        .select("id", { count: "exact", head: true })
        .in("client_id", selectedClients)
        .eq("is_active", true);
      if (!error) setExistingActiveCount(count ?? 0);
    })();
  }, [selectedClients]);

  const filteredClients = clients.filter((client) => {
    if (!clientSearchQuery.trim()) return true;
    const query = clientSearchQuery.toLowerCase();
    const firstName = client.profiles?.first_name?.toLowerCase() || "";
    const lastName = client.profiles?.last_name?.toLowerCase() || "";
    const email = client.profiles?.email?.toLowerCase() || "";
    return (
      firstName.includes(query) ||
      lastName.includes(query) ||
      email.includes(query)
    );
  });

  const toggleClient = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      onSelectedClientsChange(selectedClients.filter((id) => id !== clientId));
    } else {
      onSelectedClientsChange([...selectedClients, clientId]);
    }
  };

  const handleAssign = async () => {
    if (selectedClients.length === 0) {
      addToast({ title: "Select clients", description: "Please select at least one client.", variant: "destructive" });
      return;
    }

    try {
      setAssigning(true);
      await MealPlanService.assignMealPlanToClients(
        mealPlan.id,
        selectedClients,
        user?.id || "",
        label.trim() || undefined
      );
      addToast({
        title: "Assigned",
        description: `Meal plan assigned to ${selectedClients.length} client(s) successfully!`,
        variant: "success",
      });
      onComplete();
    } catch (error) {
      console.error("Error assigning meal plan:", error);
      addToast({ title: "Error", description: "Error assigning meal plan. Please try again.", variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onClose}
      title="Assign meal plan"
      subtitle={mealPlan.name}
      maxWidth="lg"
      maxHeight="min(78vh, 540px)"
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[color:var(--fc-text-dim)]">Label (optional)</label>
          <Input
            type="text"
            placeholder="e.g. Training day, rest day"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="fc-input h-9 rounded-xl text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => setRosterOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--fc-text-primary)]">Clients</p>
            <p className="truncate text-xs text-[color:var(--fc-text-dim)]">
              {selectedClients.length === 0
                ? "None selected — expand to choose"
                : `${selectedClients.length} selected · tap to ${rosterOpen ? "hide" : "edit"}`}
            </p>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-[color:var(--fc-text-dim)] transition-transform", rosterOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {rosterOpen && (
          <div className="space-y-2 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-sunken)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
              <Input
                type="text"
                placeholder="Search clients…"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="fc-input h-9 rounded-lg pl-9 pr-3 text-sm"
              />
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-6 text-center">
                <Users className="mx-auto mb-2 h-10 w-10 text-[color:var(--fc-text-subtle)]" />
                <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">No clients match</p>
                <p className="mt-1 text-xs text-[color:var(--fc-text-dim)]">
                  {clientSearchQuery ? "Try a different search" : "No clients available to assign."}
                </p>
              </div>
            ) : (
              <ul className="max-h-[min(36vh,240px)] space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {filteredClients.map((client) => {
                  const isSelected = selectedClients.includes(client.client_id);
                  return (
                    <li key={client.client_id}>
                      <button
                        type="button"
                        onClick={() => toggleClient(client.client_id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          isSelected
                            ? "border border-[color:var(--fc-status-success)] bg-[color-mix(in_srgb,var(--fc-status-success)_10%,transparent)]"
                            : "border border-transparent hover:bg-[color:var(--fc-glass-highlight)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-[color:var(--fc-status-success)] bg-[color:var(--fc-status-success)] text-white"
                              : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)]",
                          )}
                        >
                          {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[color:var(--fc-text-primary)]">
                            {client.profiles?.first_name} {client.profiles?.last_name}
                          </span>
                          <span className="block truncate text-xs text-[color:var(--fc-text-dim)]">{client.profiles?.email}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {selectedClients.length > 0 && existingActiveCount > 0 && (
          <p className="text-xs leading-snug text-[color:var(--fc-text-dim)]">
            Some selected clients already have{" "}
            <span className="font-medium text-[color:var(--fc-text-primary)]">{existingActiveCount}</span> active plan
            {existingActiveCount !== 1 ? "s" : ""}. This plan will be added in addition.
          </p>
        )}

        <div className="flex gap-2 border-t border-[color:var(--fc-glass-border)] pt-3">
          <Button onClick={onClose} variant="outline" className="fc-btn fc-btn-secondary h-10 flex-1 rounded-xl text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedClients.length === 0 || assigning}
            className="fc-btn fc-btn-primary h-10 flex-1 rounded-xl text-sm disabled:opacity-50"
          >
            {assigning ? "Assigning…" : `Assign (${selectedClients.length})`}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
