"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { semanticColors, getTimeBasedGradient } from "@/lib/colors";

interface PerformanceSettings {
  animatedBackground: boolean;
  floatingParticles: boolean;
  smoothAnimations: boolean;
  batterySaver: boolean;
}

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  performanceSettings: PerformanceSettings;
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => void;
  getThemeStyles: () => {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    shadow: string;
    gradient: string;
  };
  getSemanticColor: (
    type: "energy" | "trust" | "success" | "warning" | "critical" | "neutral"
  ) => {
    primary: string;
    light: string;
    dark: string;
    gradient: string;
  };
  getTimeBasedGradientColors: () => string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [performanceSettings, setPerformanceSettings] =
    useState<PerformanceSettings>({
      animatedBackground: true,
      floatingParticles: false, // Off by default for performance
      smoothAnimations: true,
      batterySaver: false,
    });

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    // Load performance settings
    const savedSettings = localStorage.getItem("performanceSettings");
    if (savedSettings) {
      try {
        setPerformanceSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse performance settings:", e);
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const updatePerformanceSettings = (
    settings: Partial<PerformanceSettings>
  ) => {
    const newSettings = { ...performanceSettings, ...settings };
    setPerformanceSettings(newSettings);
    localStorage.setItem("performanceSettings", JSON.stringify(newSettings));
  };

  const getSemanticColor = (
    type: "energy" | "trust" | "success" | "warning" | "critical" | "neutral"
  ) => {
    return semanticColors[type];
  };

  const getTimeBasedGradientColors = () => {
    return getTimeBasedGradient(isDark);
  };

  const getThemeStyles = () => {
    // Triadic color palette: Purple (#8B5CF6), Orange (#F97316), Green (#10B981)
    if (isDark) {
      return {
        background:
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        card: "bg-slate-800 border-slate-700",
        text: "text-white",
        textSecondary: "text-slate-300",
        border: "border-slate-700",
        primary: "bg-purple-600 hover:bg-purple-700 text-white",
        secondary: "bg-slate-700 hover:bg-slate-600 text-white",
        accent: "bg-orange-500 hover:bg-orange-600 text-white",
        success: "bg-green-600 hover:bg-green-700 text-white",
        warning: "bg-yellow-500 hover:bg-yellow-600 text-black",
        error: "bg-red-600 hover:bg-red-700 text-white",
        shadow: "shadow-2xl shadow-black/25",
        gradient:
          "bg-gradient-to-r from-purple-600 via-orange-500 to-green-500",
      };
    } else {
      return {
        background:
          "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40",
        card: "bg-white border-slate-200",
        text: "text-slate-900",
        textSecondary: "text-slate-600",
        border: "border-slate-200",
        primary: "bg-purple-600 hover:bg-purple-700 text-white",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-900",
        accent: "bg-orange-500 hover:bg-orange-600 text-white",
        success: "bg-green-600 hover:bg-green-700 text-white",
        warning: "bg-yellow-500 hover:bg-yellow-600 text-black",
        error: "bg-red-600 hover:bg-red-700 text-white",
        shadow: "shadow-xl shadow-slate-200/50",
        gradient:
          "bg-gradient-to-r from-purple-600 via-orange-500 to-green-500",
      };
    }
  };

  const value = {
    isDark,
    toggleTheme,
    performanceSettings,
    updatePerformanceSettings,
    getThemeStyles,
    getSemanticColor,
    getTimeBasedGradientColors,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
