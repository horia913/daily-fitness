"use client";

import React, { Suspense } from "react";
import CoachProfileShell from "@/components/coach/client-views/CoachProfileShell";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function ClientProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <CoachProfileShell />
    </Suspense>
  );
}
