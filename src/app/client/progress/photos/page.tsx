"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * Legacy route: progress photos now live under Body Metrics → Photos tab.
 * Preserves bookmarks and external links.
 */
function PhotosRedirectInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab") ?? "photos";
    const from = searchParams.get("from");
    const q = new URLSearchParams();
    q.set("tab", tab);
    if (from) q.set("from", from);
    const qs = q.toString();
    window.location.replace(`/client/progress/body-metrics${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-gray-500">
      Redirecting…
    </div>
  );
}

export default function ProgressPhotosRedirectPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-6 text-center text-sm text-gray-500">Loading…</div>}>
        <PhotosRedirectInner />
      </Suspense>
    </ProtectedRoute>
  );
}
