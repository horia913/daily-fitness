"use client";

import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Header from "./Header";
import BottomNav from "./BottomNav";
import DesktopShell from "./DesktopShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (pathname === "/" || pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (isDesktop) {
    return <DesktopShell>{children}</DesktopShell>;
  }

  return (
    <div className="min-h-screen fc-app-bg flex flex-col">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto fc-page-transition">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
