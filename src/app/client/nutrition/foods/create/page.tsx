"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

/** Clients log meals from assigned options only — no custom food database writes. */
export default function AddCustomFoodPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client/nutrition");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen fc-app-bg" />
    </ProtectedRoute>
  );
}
