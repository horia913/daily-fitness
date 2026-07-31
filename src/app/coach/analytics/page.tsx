"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy analytics overview — redirects to Insights hub. */
export default function CoachAnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/coach/insights");
  }, [router]);
  return (
    <p className="py-8 text-center text-sm text-[color:var(--fc-text-subtle)]">
      Redirecting to Insights…
    </p>
  );
}
