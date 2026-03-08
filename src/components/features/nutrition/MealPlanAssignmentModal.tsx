"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MealPlan } from "@/lib/mealPlanService";
import { Client } from "@/lib/database";
import { MealPlanService } from "@/lib/mealPlanService";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { supabase } from "@/lib/supabase";
import { Users, Check, Search } from "lucide-react";

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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const { addToast } = useToast();
  const [assigning, setAssigning] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [label, setLabel] = useState("");
  const [existingActiveCount, setExistingActiveCount] = useState<number>(0);

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
      title="Assign Meal Plan"
      subtitle={mealPlan.name}
    >
      <div className="space-y-4">
        {/* Optional label (e.g. Training Day, Rest Day) */}
        <div>
          <label className={`text-sm font-medium ${theme.text} block mb-1`}>
            Label (optional)
          </label>
          <Input
            type="text"
            placeholder="e.g. Training Day, Rest Day"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {/* Client Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[color:var(--fc-text-subtle)]" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={clientSearchQuery}
            onChange={(e) => setClientSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Selected Count Badge + note when clients already have active plans */}
        {selectedClients.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)]">
                {selectedClients.length} client
                {selectedClients.length !== 1 ? "s" : ""} selected
              </Badge>
            </div>
            {existingActiveCount > 0 && (
              <p className={`text-sm ${theme.textSecondary}`}>
                Selected client(s) already have {existingActiveCount} active plan(s). The new plan will be added alongside them.
              </p>
            )}
          </div>
        )}

        {/* Client List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-[color:var(--fc-text-subtle)] mb-4" />
            <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
              No clients found
            </h3>
            <p className={`${theme.textSecondary}`}>
              {clientSearchQuery
                ? "Try adjusting your search query"
                : "You don't have any active clients to assign this meal plan to."}
            </p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
            {filteredClients.map((client) => {
              const isSelected = selectedClients.includes(client.client_id);
              return (
                <div
                  key={client.id}
                  onClick={() => toggleClient(client.client_id)}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all
                    ${
                      isSelected
                        ? "bg-[color:var(--fc-status-success)]/10 border-2 border-[color:var(--fc-status-success)]"
                        : `${theme.card} fc-glass fc-card border-2 border-[color:var(--fc-surface-card-border)]`
                    }
                  `}
                >
                  <div
                    className={`
                      w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                      ${
                        isSelected
                          ? "bg-[color:var(--fc-status-success)] text-white"
                          : "border-2 border-[color:var(--fc-glass-border-strong)]"
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${theme.text}`}>
                      {client.profiles?.first_name} {client.profiles?.last_name}
                    </div>
                    <div className={`text-sm ${theme.textSecondary}`}>
                      {client.profiles?.email}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-[color:var(--fc-surface-card-border)]">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedClients.length === 0 || assigning}
            className="flex-1 rounded-xl bg-[color:var(--fc-status-success)] hover:opacity-90 text-white disabled:opacity-50"
          >
            {assigning
              ? "Assigning..."
              : `Assign to ${selectedClients.length} Client${
                  selectedClients.length !== 1 ? "s" : ""
                }`}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
