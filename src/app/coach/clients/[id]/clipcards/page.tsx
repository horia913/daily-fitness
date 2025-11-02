"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import ClientClipcards from "@/components/coach/client-views/ClientClipcards";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ClientClipcardsPage() {
  const params = useParams();
  const { loading: authLoading } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const clientId = params.id as string;
  const [clientName, setClientName] = useState<string>("Client");

  useEffect(() => {
    if (clientId) {
      loadClientName();
    }
  }, [clientId]);

  const loadClientName = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", clientId)
        .single();

      if (profile) {
        const name =
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          "Client";
        setClientName(name);
      }
    } catch (error) {
      console.error("Error loading client name:", error);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Link href={`/coach/clients/${clientId}`}>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  ClipCards
                </h1>
                <p className={`${theme.textSecondary}`}>
                  Manage session credits & packages
                </p>
              </div>
            </div>

            {/* Clipcards Content */}
            <ClientClipcards clientId={clientId} clientName={clientName} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
