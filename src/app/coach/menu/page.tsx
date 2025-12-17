"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Users,
  Dumbbell,
  Apple,
  Calendar,
  BarChart3,
  MessageCircle,
  Target,
  TrendingUp,
  Clock,
  Library,
  Layers,
  FolderTree,
  User,
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  {
    title: "Client Management",
    description: "Manage clients, view progress, and assign workouts",
    icon: Users,
    href: "/coach/clients",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Programs & Workouts",
    description: "Create and manage workout programs and templates",
    icon: Dumbbell,
    href: "/coach/programs-workouts",
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Exercise Library",
    description: "Manage your exercise database and create custom exercises",
    icon: Library,
    href: "/coach/exercises",
    color: "bg-violet-100 text-violet-600",
  },
  {
    title: "Exercise Categories",
    description: "Organize exercises with custom categories",
    icon: Layers,
    href: "/coach/exercise-categories",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Workout Categories",
    description: "Organize workout templates and programs",
    icon: FolderTree,
    href: "/coach/categories",
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Nutrition Management",
    description: "Create meal plans and track client nutrition",
    icon: Apple,
    href: "/coach/nutrition",
    color: "bg-orange-100 text-orange-600",
  },
  {
    title: "Analytics & Reports",
    description: "View client progress and generate reports",
    icon: BarChart3,
    href: "/coach/analytics",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    title: "Client Progress",
    description: "Monitor client progress and improvements",
    icon: TrendingUp,
    href: "/coach/progress",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Goals & Habits",
    description: "Set goals and track client habits",
    icon: Target,
    href: "/coach/goals",
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    title: "Session Management",
    description: "Schedule and manage client sessions",
    icon: Calendar,
    href: "/coach/sessions",
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Availability Settings",
    description: "Set your availability for client session bookings",
    icon: Clock,
    href: "/coach/availability",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Coach Profile",
    description: "Manage your profile, settings, and account information",
    icon: User,
    href: "/coach/profile",
    color: "bg-slate-100 text-slate-600",
  },
];

export default function CoachMenu() {
  const { isDark, getThemeStyles, performanceSettings } = useTheme();
  const theme = getThemeStyles();

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
          {/* Content */}
          <div
            className="relative z-10"
            style={{ padding: "24px 20px", paddingBottom: "100px" }}
          >
            <div
              className="max-w-7xl mx-auto"
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Header */}
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isDark
                        ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                        : "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <Users
                      style={{
                        width: "40px",
                        height: "40px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div>
                    <h1
                      style={{
                        fontSize: "32px",
                        fontWeight: "800",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        margin: 0,
                        lineHeight: "1.2",
                      }}
                    >
                      Coach Menu
                    </h1>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: "400",
                        color: isDark ? "#D1D5DB" : "#6B7280",
                        margin: 0,
                      }}
                    >
                      Access all your coaching tools and features
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Grid */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                style={{ gap: "20px" }}
              >
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  const gradients = [
                    "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)", // Purple
                    "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)", // Orange
                    "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)", // Green
                    "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)", // Blue
                    "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)", // Purple
                    "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)", // Orange
                    "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)", // Green
                    "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)", // Blue
                    "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)", // Purple
                    "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)", // Orange
                    "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)", // Green
                  ];
                  return (
                    <Link href={item.href} key={index}>
                      <div
                        style={{
                          backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                          borderRadius: "24px",
                          padding: "24px",
                          boxShadow: isDark
                            ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                            : "0 2px 8px rgba(0, 0, 0, 0.08)",
                          cursor: "pointer",
                          height: "100%",
                          border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                          transition: "all 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.02)";
                          e.currentTarget.style.boxShadow = isDark
                            ? "0 8px 24px rgba(0, 0, 0, 0.6)"
                            : "0 4px 16px rgba(0, 0, 0, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = isDark
                            ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                            : "0 2px 8px rgba(0, 0, 0, 0.08)";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                          }}
                        >
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "18px",
                              background: gradients[index % gradients.length],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon
                              style={{
                                width: "32px",
                                height: "32px",
                                color: "#FFFFFF",
                              }}
                            />
                          </div>
                          <h3
                            style={{
                              fontSize: "18px",
                              fontWeight: "600",
                              color: isDark ? "#FFFFFF" : "#1A1A1A",
                              margin: 0,
                              lineHeight: "1.4",
                              flex: 1,
                            }}
                          >
                            {item.title}
                          </h3>
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "400",
                            color: isDark ? "#9CA3AF" : "#6B7280",
                            margin: 0,
                            lineHeight: "1.5",
                          }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div
                style={{
                  backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: isDark
                    ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.08)",
                  border: `2px solid ${isDark ? "#8B5CF6" : "#6C5CE7"}`,
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: isDark ? "#8B5CF6" : "#6C5CE7",
                    margin: 0,
                    marginBottom: "20px",
                  }}
                >
                  Quick Actions
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <Link href="/coach/clients">
                    <button
                      style={{
                        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                        borderRadius: "20px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#2A2A2A"
                          : "#F9FAFB";
                        e.currentTarget.style.borderColor = "#6C5CE7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#1E1E1E"
                          : "#FFFFFF";
                        e.currentTarget.style.borderColor = isDark
                          ? "#2A2A2A"
                          : "#E5E7EB";
                      }}
                    >
                      <Users style={{ width: "16px", height: "16px" }} />
                      View All Clients
                    </button>
                  </Link>
                  <Link href="/coach/programs-workouts">
                    <button
                      style={{
                        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                        borderRadius: "20px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#2A2A2A"
                          : "#F9FAFB";
                        e.currentTarget.style.borderColor = "#6C5CE7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#1E1E1E"
                          : "#FFFFFF";
                        e.currentTarget.style.borderColor = isDark
                          ? "#2A2A2A"
                          : "#E5E7EB";
                      }}
                    >
                      <Dumbbell style={{ width: "16px", height: "16px" }} />
                      Create Workout
                    </button>
                  </Link>
                  <Link href="/coach/nutrition">
                    <button
                      style={{
                        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                        borderRadius: "20px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#2A2A2A"
                          : "#F9FAFB";
                        e.currentTarget.style.borderColor = "#6C5CE7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#1E1E1E"
                          : "#FFFFFF";
                        e.currentTarget.style.borderColor = isDark
                          ? "#2A2A2A"
                          : "#E5E7EB";
                      }}
                    >
                      <Apple style={{ width: "16px", height: "16px" }} />
                      Create Meal Plan
                    </button>
                  </Link>
                  <Link href="/coach/availability">
                    <button
                      style={{
                        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                        borderRadius: "20px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#2A2A2A"
                          : "#F9FAFB";
                        e.currentTarget.style.borderColor = "#6C5CE7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#1E1E1E"
                          : "#FFFFFF";
                        e.currentTarget.style.borderColor = isDark
                          ? "#2A2A2A"
                          : "#E5E7EB";
                      }}
                    >
                      <Clock style={{ width: "16px", height: "16px" }} />
                      Set Availability
                    </button>
                  </Link>
                  <Link href="/coach/profile">
                    <button
                      style={{
                        backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
                        color: isDark ? "#FFFFFF" : "#1A1A1A",
                        border: `2px solid ${isDark ? "#2A2A2A" : "#E5E7EB"}`,
                        borderRadius: "20px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#2A2A2A"
                          : "#F9FAFB";
                        e.currentTarget.style.borderColor = "#6C5CE7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "#1E1E1E"
                          : "#FFFFFF";
                        e.currentTarget.style.borderColor = isDark
                          ? "#2A2A2A"
                          : "#E5E7EB";
                      }}
                    >
                      <User style={{ width: "16px", height: "16px" }} />
                      Edit Profile
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
