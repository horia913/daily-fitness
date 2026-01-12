"use client";

import { AuthWrapper } from "@/components/hybrid/AuthWrapper";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthWrapper />
    </Suspense>
  );
}
