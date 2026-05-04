"use client";

import React from "react";
import { useParams } from "next/navigation";
import ClientMealsView from "@/components/coach/client-views/ClientMealsView";

export default function ClientMealsPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="space-y-3">
      <ClientMealsView clientId={clientId} />
    </div>
  );
}
