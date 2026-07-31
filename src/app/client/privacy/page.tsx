"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** Privacy folded into Settings — keep old URL as redirect. */
export default function ClientPrivacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client/settings");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
        <PageSkeleton variant="form" />
      </ClientPageShell>
    </ProtectedRoute>
  );
}
