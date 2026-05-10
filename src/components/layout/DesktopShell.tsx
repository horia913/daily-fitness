"use client";

import SideNav from "./SideNav";

interface DesktopShellProps {
  children: React.ReactNode;
}

export default function DesktopShell({ children }: DesktopShellProps) {
  return (
    <div className="fc-desktop-shell flex min-h-screen fc-app-bg">
      <SideNav />
      <main className="fc-page-transition min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
