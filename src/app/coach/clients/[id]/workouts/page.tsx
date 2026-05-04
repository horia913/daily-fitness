"use client";

import React from "react";
import { useParams } from "next/navigation";
import ClientWorkoutsView from "@/components/coach/client-views/ClientWorkoutsView";

export default function ClientWorkoutsPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-4">
      <ClientWorkoutsView clientId={clientId} />
    </div>
  );
}
