"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { GoalsAndHabits } from "@/components/progress/GoalsAndHabits";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GoalsAndHabitsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Button
              onClick={() => router.push("/client/progress")}
              variant="outline"
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Progress
            </Button>

            {/* Goals & Habits Component */}
            <GoalsAndHabits loading={false} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
