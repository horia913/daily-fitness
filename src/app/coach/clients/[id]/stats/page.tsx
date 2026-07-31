"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy Stats tab — redirects to merged client overview. */
export default function ClientStatsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  useEffect(() => {
    router.replace(`/coach/clients/${clientId}`);
  }, [router, clientId]);

  return (
    <p className="py-8 text-center text-sm text-[color:var(--fc-text-subtle)]">
      Redirecting to client overview…
    </p>
  );
}
