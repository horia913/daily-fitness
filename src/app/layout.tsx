import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/mobile.css";
import "../styles/android-fixes.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";
import ServiceWorkerProvider from "@/components/ServiceWorkerProvider";
import OneSignalProvider from "@/components/OneSignalProvider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { PrefetchProvider } from "@/components/PrefetchProvider";
import MobileCompatibilityProvider from "@/components/MobileCompatibilityProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DailyFitness",
  description: "Your personal fitness companion",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Android specific viewport fixes
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MobileCompatibilityProvider />
        <ServiceWorkerProvider />
        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <PrefetchProvider>
                <OneSignalProvider>
                  <AppLayout>{children}</AppLayout>
                </OneSignalProvider>
              </PrefetchProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
