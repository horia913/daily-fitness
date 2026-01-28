"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Don't show layout on auth page
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen fc-app-bg flex flex-col">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
