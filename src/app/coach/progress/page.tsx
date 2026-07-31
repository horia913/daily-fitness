"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy progress action queue — redirects to Briefing. */
export default function CoachProgressRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/coach");
  }, [router]);
  return (
    <p className="py-8 text-center text-sm text-[color:var(--fc-text-subtle)]">
      Redirecting to Briefing…
    </p>
  );
}
