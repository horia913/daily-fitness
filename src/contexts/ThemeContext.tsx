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
  const isDark = true;
  const [performanceSettings, setPerformanceSettings] =
    useState<PerformanceSettings>({
      animatedBackground: true,
      floatingParticles: false, // Off by default for performance
      smoothAnimations: true,
      batterySaver: false,
    });

  useEffect(() => {
    document.documentElement.classList.add("dark");

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
    // Dark mode only — surface hierarchy: base dark, cards elevated (lighter), borders visible
    return {
      background:
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
      card: "bg-[#1c2333] border border-white/[0.08]",
      text: "text-white",
      textSecondary: "text-slate-300",
      border: "border-white/10",
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
  };

  const value = {
    isDark,
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
