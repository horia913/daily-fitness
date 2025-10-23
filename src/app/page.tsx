"use client";

import { AuthWrapper } from "@/components/hybrid/AuthWrapper";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthWrapper />
    </Suspense>
  );
}
