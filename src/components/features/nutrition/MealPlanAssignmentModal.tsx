"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MealPlan } from "@/lib/mealPlanService";
import { Client } from "@/lib/database";
import { MealPlanService } from "@/lib/mealPlanService";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
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
  const [assigning, setAssigning] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

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
      alert("Please select at least one client.");
      return;
    }

    try {
      setAssigning(true);
      await MealPlanService.assignMealPlanToClients(
        mealPlan.id,
        selectedClients,
        user?.id || ""
      );
      alert(
        `Meal plan assigned to ${selectedClients.length} client(s) successfully!`
      );
      onComplete();
    } catch (error) {
      console.error("Error assigning meal plan:", error);
      alert("Error assigning meal plan. Please try again.");
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
        {/* Client Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={clientSearchQuery}
            onChange={(e) => setClientSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Selected Count Badge */}
        {selectedClients.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {selectedClients.length} client
              {selectedClients.length !== 1 ? "s" : ""} selected
            </Badge>
          </div>
        )}

        {/* Client List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
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
                        ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
                        : `${theme.card} border-2 border-slate-200 dark:border-slate-700`
                    }
                  `}
                >
                  <div
                    className={`
                      w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                      ${
                        isSelected
                          ? "bg-green-500 text-white"
                          : "border-2 border-slate-300 dark:border-slate-600"
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
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
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
            className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white disabled:opacity-50"
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
