"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import Header from "./Header";
import BottomNav from "./BottomNav";
import DesktopShell from "./DesktopShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname() ?? "";
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [hasMounted, setHasMounted] = useState(false);
  const isClientRoute = pathname.startsWith("/client");
  /** v5 flat surfaces on product routes (client + coach); admin keeps milky defaults. */
  const useFlatSurfaces =
    isClientRoute || pathname.startsWith("/coach");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  /* Portaled Dialog/Toast mount under body — sync html so float tokens apply. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (useFlatSurfaces) {
      document.documentElement.setAttribute("data-fc-surface-scope", "flat");
    } else {
      document.documentElement.removeAttribute("data-fc-surface-scope");
    }
    return () => {
      document.documentElement.removeAttribute("data-fc-surface-scope");
    };
  }, [useFlatSurfaces]);

  if (pathname === "/" || pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (hasMounted && isDesktop) {
    return (
      <DesktopShell flatSurfaces={useFlatSurfaces}>{children}</DesktopShell>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen fc-app-bg flex flex-col",
        useFlatSurfaces && "fc-flat-surfaces",
      )}
    >
      {!isClientRoute && <Header />}
      <main className="flex-1 min-h-0 overflow-y-auto fc-page-transition">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
