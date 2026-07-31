"use client";

import { cn } from "@/lib/utils";
import SideNav from "./SideNav";

interface DesktopShellProps {
  children: React.ReactNode;
  /** When true, remaps surface role tokens (v5 flat — /client* and /coach*). */
  flatSurfaces?: boolean;
  /** @deprecated use flatSurfaces */
  clientSurfaces?: boolean;
}

export default function DesktopShell({
  children,
  flatSurfaces = false,
  clientSurfaces = false,
}: DesktopShellProps) {
  const useFlat = flatSurfaces || clientSurfaces;
  return (
    <div
      className={cn(
        "fc-desktop-shell flex min-h-screen fc-app-bg",
        useFlat && "fc-flat-surfaces",
      )}
    >
      <SideNav />
      <main className="fc-page-transition min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
