"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** Progress hub formerly hosted Extra Activities charts here — now merged into /client/activity?tab=trends. */
export default function ActivitiesProgressRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client/activity?tab=trends");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <PageSkeleton variant="dashboard" />
      </ClientPageShell>
    </ProtectedRoute>
  );
}
