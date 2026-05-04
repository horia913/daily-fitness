"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import CoachCheckInsShell from "@/components/coach/client-views/CoachCheckInsShell";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function ClientProgressMergedPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-3">
      <Suspense fallback={<PageSkeleton variant="list" />}>
        <CoachCheckInsShell clientId={clientId} />
      </Suspense>
    </div>
  );
}
