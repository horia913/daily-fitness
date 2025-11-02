"use client";

import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

export default function ProgramsAndWorkoutsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to workout templates by default (can be updated later to handle both)
    router.replace("/coach/workouts/templates");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="coach">
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#E8E9F3",
          paddingBottom: "100px",
        }}
      >
        <div style={{ padding: "24px 20px" }} className="container mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">
              Redirecting to workout templates...
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
