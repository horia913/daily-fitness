"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function MealPlansPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main nutrition page with meal-plans tab
    router.replace("/coach/nutrition");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to Nutrition page...</p>
      </div>
    </ProtectedRoute>
  );
}
