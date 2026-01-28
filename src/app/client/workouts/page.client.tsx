"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import EnhancedClientWorkouts from "@/components/client/EnhancedClientWorkouts";

export default function ClientWorkoutsClient() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="client">
      <EnhancedClientWorkouts clientId={user?.id || ""} />
    </ProtectedRoute>
  );
}
