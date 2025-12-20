"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
// import { ClientDetailModal } from './ClientDetailModal' // Replaced with page navigation
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Dumbbell,
  Apple,
  Heart,
  Zap,
  Star,
  Trophy,
  Award,
  Flame,
  Clock,
  BarChart3,
  Eye,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  CircleDot,
  CirclePause,
  CirclePlay,
  CircleStop,
  CircleHelp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";

interface ClientCompliance {
  client_id: string;
  full_name: string;
  avatar_url: string;
  compliance_score: number;
  total_assigned: number;
  total_completed: number;
  last_workout_date: string | null;
  current_streak: number;
  workout_frequency: number;
  workout_compliance?: number;
  nutrition_compliance?: number;
  habit_compliance?: number;
}

interface ComplianceCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  compliance: number;
  target: number;
  completed: number;
  total: number;
  trend: "up" | "down" | "stable";
  lastActivity?: string;
  streak?: number;
}

export default function ComplianceSnapshot() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientCompliance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  useEffect(() => {
    if (user) {
      loadComplianceData();
    }
  }, [user]);

  const loadComplianceData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Try the main function first
      const { data, error: mainError } = await supabase.rpc(
        "get_client_compliance_scores",
        { coach_id_param: user.id }
      );

      if (mainError) {
        // Silently try fallback function
        const { data: simpleData, error: simpleError } = await supabase.rpc(
          "get_client_compliance_scores_simple",
          { coach_id_param: user.id }
        );

        if (simpleError) {
          // Silently handle - function doesn't exist or has type mismatch
          setError(
            "Compliance data unavailable - database functions need to be set up"
          );
          setClients([]);
        } else {
          setClients(simpleData || []);
        }
      } else {
        setClients(data || []);
      }
    } catch (error: any) {
      // Silently handle - database functions don't exist yet
      setError(
        "Compliance data unavailable - database functions need to be set up"
      );

      // Set fallback data
      setClients([
        {
          client_id: "1",
          full_name: "Jane Doe",
          avatar_url: "",
          compliance_score: 66,
          total_assigned: 5,
          total_completed: 3,
          last_workout_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          current_streak: 2,
          workout_frequency: 0.6,
          workout_compliance: 70,
          nutrition_compliance: 65,
          habit_compliance: 60,
        },
        {
          client_id: "2",
          full_name: "John Smith",
          avatar_url: "",
          compliance_score: 89,
          total_assigned: 6,
          total_completed: 5,
          last_workout_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          current_streak: 5,
          workout_frequency: 0.8,
          workout_compliance: 95,
          nutrition_compliance: 85,
          habit_compliance: 87,
        },
        {
          client_id: "3",
          full_name: "Sarah Wilson",
          avatar_url: "",
          compliance_score: 45,
          total_assigned: 7,
          total_completed: 3,
          last_workout_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          current_streak: 0,
          workout_frequency: 0.3,
          workout_compliance: 40,
          nutrition_compliance: 50,
          habit_compliance: 45,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getComplianceBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
    if (score >= 60)
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Improvement";
    return "At Risk";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return Target;
    return AlertTriangle;
  };

  const getStatusIconColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getComplianceBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getMotivationalMessage = (score: number) => {
    if (score >= 80) return "Outstanding! Keep up the excellent work! 🎉";
    if (score >= 60) return "Great progress! You're on the right track! 💪";
    if (score >= 40) return "Room for improvement! Every step counts! 🌟";
    return "Let's get back on track! You've got this! 🚀";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return (
          <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
        );
      case "down":
        return (
          <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
        );
      default:
        return <Activity className="w-3 h-3 text-slate-400" />;
    }
  };

  const calculateOverallCompliance = () => {
    if (clients.length === 0) return 0;
    const total = clients.reduce(
      (sum, client) => sum + client.compliance_score,
      0
    );
    return Math.round(total / clients.length);
  };

  const getComplianceCategories = (): ComplianceCategory[] => {
    if (clients.length === 0) return [];

    const workoutCompliance =
      clients.reduce(
        (sum, client) =>
          sum + (client.workout_compliance || client.compliance_score),
        0
      ) / clients.length;
    const nutritionCompliance =
      clients.reduce(
        (sum, client) =>
          sum + (client.nutrition_compliance || client.compliance_score),
        0
      ) / clients.length;
    const habitCompliance =
      clients.reduce(
        (sum, client) =>
          sum + (client.habit_compliance || client.compliance_score),
        0
      ) / clients.length;

    return [
      {
        id: "workouts",
        name: "Workouts",
        icon: Dumbbell,
        color: "purple",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-600 dark:text-purple-400",
        borderColor: "border-purple-200 dark:border-purple-800",
        glowColor: "shadow-purple-200 dark:shadow-purple-800",
        compliance: Math.round(workoutCompliance),
        target: 80,
        completed: clients.reduce(
          (sum, client) => sum + client.total_completed,
          0
        ),
        total: clients.reduce((sum, client) => sum + client.total_assigned, 0),
        trend: "up",
        lastActivity: "2 hours ago",
        streak: Math.max(...clients.map((c) => c.current_streak)),
      },
      {
        id: "nutrition",
        name: "Nutrition",
        icon: Apple,
        color: "blue",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-800",
        glowColor: "shadow-blue-200 dark:shadow-blue-800",
        compliance: Math.round(nutritionCompliance),
        target: 75,
        completed: Math.round(nutritionCompliance * clients.length),
        total: clients.length,
        trend: "stable",
        lastActivity: "1 hour ago",
        streak: 3,
      },
      {
        id: "habits",
        name: "Habits",
        icon: Heart,
        color: "green",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-600 dark:text-green-400",
        borderColor: "border-green-200 dark:border-green-800",
        glowColor: "shadow-green-200 dark:shadow-green-800",
        compliance: Math.round(habitCompliance),
        target: 70,
        completed: Math.round(habitCompliance * clients.length),
        total: clients.length,
        trend: "up",
        lastActivity: "30 minutes ago",
        streak: 5,
      },
    ];
  };

  const formatLastActivity = (lastWorkoutDate: string | null) => {
    if (!lastWorkoutDate) return "No workouts";

    const date = new Date(lastWorkoutDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  };

  const handleClientClick = (client: ClientCompliance) => {
    // Navigate to client detail page
    router.push(`/coach/clients/${client.client_id}`);
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Client Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const theme = getThemeStyles();
  const overallCompliance = calculateOverallCompliance();
  const complianceCategories = getComplianceCategories();

  return (
    <>
      <Card
        className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}
      >
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
              <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-xl">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  Compliance Snapshot
                </h2>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Overall client adherence overview
                </p>
              </div>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1">
                {overallCompliance}% overall
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === "overview" ? "detailed" : "overview")
                }
                className="text-xs"
              >
                {viewMode === "overview" ? "Detailed View" : "Overview"}
                <Eye className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {error}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 relative z-10">
          {clients.length > 0 ? (
            <div className="space-y-6">
              {/* Overall Compliance Score */}
              <div
                className={`${theme.card} rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${theme.text}`}>
                        Overall Compliance
                      </h3>
                      <p className={`text-sm ${theme.textSecondary}`}>
                        Average across all clients
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${getComplianceColor(
                        overallCompliance
                      )}`}
                    >
                      {overallCompliance}%
                    </div>
                    <p className={`text-sm ${theme.textSecondary}`}>
                      {getComplianceStatus(overallCompliance)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`${theme.textSecondary}`}>
                      Progress to Excellence
                    </span>
                    <span
                      className={`font-medium ${getComplianceColor(
                        overallCompliance
                      )}`}
                    >
                      {overallCompliance}% / 100%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getComplianceBarColor(
                        overallCompliance
                      )} transition-all duration-500`}
                      style={{ width: `${overallCompliance}%` }}
                    />
                  </div>
                  <p
                    className={`text-sm font-medium ${getComplianceColor(
                      overallCompliance
                    )} mt-2`}
                  >
                    {getMotivationalMessage(overallCompliance)}
                  </p>
                </div>
              </div>

              {/* Compliance Categories */}
              <div className="space-y-4">
                <h3
                  className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}
                >
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Category Breakdown
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {complianceCategories.map((category) => {
                    const Icon = category.icon;
                    const isExpanded = expandedCategory === category.id;

                    return (
                      <div
                        key={category.id}
                        className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 ${category.borderColor} hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:${category.glowColor} hover:shadow-lg`}
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : category.id)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-3 rounded-xl ${category.bgColor} group-hover:scale-110 transition-transform duration-300`}
                          >
                            <Icon className={`w-5 h-5 ${category.textColor}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-bold ${theme.text} text-sm`}>
                                {category.name}
                              </h4>
                              <div className="flex items-center gap-1">
                                {getTrendIcon(category.trend)}
                                <Badge
                                  className={`text-xs ${getComplianceBadgeColor(
                                    category.compliance
                                  )}`}
                                >
                                  {category.compliance}%
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`${theme.textSecondary}`}>
                                  Progress
                                </span>
                                <span
                                  className={`font-medium ${getComplianceColor(
                                    category.compliance
                                  )}`}
                                >
                                  {category.completed}/{category.total}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getComplianceBarColor(
                                    category.compliance
                                  )} transition-all duration-500`}
                                  style={{ width: `${category.compliance}%` }}
                                />
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={`${theme.textSecondary}`}>
                                      Target
                                    </span>
                                    <span
                                      className={`font-medium ${theme.text}`}
                                    >
                                      {category.target}%
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={`${theme.textSecondary}`}>
                                      Last Activity
                                    </span>
                                    <span
                                      className={`font-medium ${theme.text}`}
                                    >
                                      {category.lastActivity}
                                    </span>
                                  </div>
                                  {category.streak && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span
                                        className={`${theme.textSecondary}`}
                                      >
                                        Best Streak
                                      </span>
                                      <span
                                        className={`font-medium ${theme.text}`}
                                      >
                                        {category.streak} days
                                      </span>
                                    </div>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 rounded-xl text-xs"
                                  >
                                    View Details
                                    <ArrowRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Summary */}
              {viewMode === "detailed" && (
                <div className="space-y-4">
                  <h3
                    className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}
                  >
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Client Details
                  </h3>

                  <div className="space-y-3">
                    {clients.map((client) => {
                      const StatusIcon = getStatusIcon(client.compliance_score);
                      return (
                        <div
                          key={client.client_id}
                          onClick={() => handleClientClick(client)}
                          className={`${theme.card} ${theme.shadow} rounded-xl p-4 border-2 hover:shadow-lg transition-all duration-300 cursor-pointer`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative">
                              {client.avatar_url ? (
                                <Image
                                  src={client.avatar_url}
                                  alt={client.full_name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {client.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                              )}
                              <div
                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${getStatusIconColor(
                                  client.compliance_score
                                )}`}
                              >
                                <StatusIcon className="w-2.5 h-2.5" />
                              </div>
                            </div>

                            {/* Client Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4
                                  className={`font-semibold ${theme.text} truncate`}
                                >
                                  {client.full_name}
                                </h4>
                                <Badge
                                  className={`text-xs ${getComplianceBadgeColor(
                                    client.compliance_score
                                  )}`}
                                >
                                  {getComplianceStatus(client.compliance_score)}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={`${theme.textSecondary}`}>
                                    Compliance Score
                                  </span>
                                  <span
                                    className={`font-semibold ${getComplianceColor(
                                      client.compliance_score
                                    )}`}
                                  >
                                    {client.compliance_score.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getComplianceBarColor(
                                      client.compliance_score
                                    )} transition-all duration-500`}
                                    style={{
                                      width: `${client.compliance_score}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  <span>
                                    {client.total_completed}/
                                    {client.total_assigned} workouts
                                  </span>
                                </div>
                                {client.current_streak > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Flame className="w-3 h-3" />
                                    <span>
                                      {client.current_streak} day streak
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {formatLastActivity(
                                      client.last_workout_date
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Click indicator */}
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${theme.textSecondary}`}
                              >
                                View Details
                              </span>
                              <ArrowRight
                                className={`w-4 h-4 ${theme.textSecondary}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className={`${theme.card} rounded-xl p-4 border-2`}>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {clients.length}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      Total Clients
                    </p>
                  </div>
                  <div
                    className={`${theme.card} rounded-xl p-4 border-2 border-green-200 dark:border-green-800`}
                  >
                    <p
                      className={`text-2xl font-bold text-green-600 dark:text-green-400`}
                    >
                      {clients.filter((c) => c.compliance_score >= 80).length}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      High Compliance
                    </p>
                  </div>
                  <div
                    className={`${theme.card} rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800`}
                  >
                    <p
                      className={`text-2xl font-bold text-yellow-600 dark:text-yellow-400`}
                    >
                      {
                        clients.filter(
                          (c) =>
                            c.compliance_score >= 60 && c.compliance_score < 80
                        ).length
                      }
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      Medium Compliance
                    </p>
                  </div>
                  <div
                    className={`${theme.card} rounded-xl p-4 border-2 border-red-200 dark:border-red-800`}
                  >
                    <p
                      className={`text-2xl font-bold text-red-600 dark:text-red-400`}
                    >
                      {clients.filter((c) => c.compliance_score < 60).length}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      Needs Attention
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-6">
                <Users className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
                No client data available
              </h3>
              <p className={`text-sm ${theme.textSecondary} mb-4`}>
                Client compliance data will appear here once clients start
                working out
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  className={`${theme.primary} ${theme.shadow} rounded-xl`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Clients
                </Button>
                <Button variant="outline" className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Modal - Replaced with page navigation via router.push */}
    </>
  );
}
