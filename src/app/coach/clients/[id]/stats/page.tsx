"use client";

import React from "react";
import { useParams } from "next/navigation";
import ClientCoachStatsTab from "@/components/coach/client-views/ClientCoachStatsTab";

export default function ClientStatsPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-3">
      <ClientCoachStatsTab clientId={clientId} />
    </div>
  );
}
