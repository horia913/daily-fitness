import type { ReactNode } from "react";

/**
 * Client route root — applies `.fc-flat-surfaces` so inset/float/well/tint
 * tokens remapped in ui-system.css cascade to every /client page.
 * AppLayout syncs html[data-fc-surface-scope="flat"] for portaled chrome.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <div className="fc-flat-surfaces min-h-0 min-w-0">{children}</div>;
}
