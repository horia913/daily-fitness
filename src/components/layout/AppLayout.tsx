"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (pathname === "/" || pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (hasMounted && isDesktop) {
    return <DesktopShell>{children}</DesktopShell>;
  }

  return (
    <div className="min-h-screen fc-app-bg flex flex-col">
      {!isClientRoute && <Header />}
      <main className="flex-1 min-h-0 overflow-y-auto fc-page-transition">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
