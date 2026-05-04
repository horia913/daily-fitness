import type { ReactNode } from "react";
import { notFound } from "next/navigation";

/**
 * Gates all routes under `/dev` (e.g. `/dev/ui-gallery`, `/dev/v4-lab`).
 * Returns 404 in production without loading client bundles for those pages.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return children;
}
