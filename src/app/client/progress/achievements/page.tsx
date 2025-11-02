"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  Calendar,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  ArrowLeft,
  Star,
  Zap,
  CheckCircle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import {
  AchievementsService,
  Achievement,
} from "@/lib/progressTrackingService";

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (user && !authLoading) {
      loadAchievements();
    }
  }, [user, authLoading]);

  const loadAchievements = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await AchievementsService.getClientAchievements(user.id);
      setAchievements(data);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "workout":
      case "strength":
        return Trophy;
      case "milestone":
      case "goal":
        return Target;
      case "streak":
        return Flame;
      case "progress":
        return TrendingUp;
      default:
        return Award;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "workout":
      case "strength":
        return "from-purple-500 to-indigo-600";
      case "milestone":
      case "goal":
        return "from-green-500 to-emerald-600";
      case "streak":
        return "from-orange-500 to-red-600";
      case "progress":
        return "from-blue-500 to-cyan-600";
      default:
        return "from-yellow-500 to-amber-600";
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen ${theme.background}`}>
          <div className="animate-pulse p-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const recentAchievements = achievements.filter((a) => {
    const achievedDate = new Date(a.achieved_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return achievedDate >= thirtyDaysAgo;
  });

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/client/progress">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                  Achievements
                </h1>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Celebrate your milestones and accomplishments
                </p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {achievements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/20">
                      <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Total Achievements
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {achievements.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/20">
                      <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Recent (30 days)
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {recentAchievements.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/20">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Public Achievements
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {achievements.filter((a) => a.is_public).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Achievements List */}
          {achievements.length > 0 ? (
            <div className="space-y-4">
              {/* Recent Achievements Section */}
              {recentAchievements.length > 0 && (
                <div>
                  <h2
                    className={`text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}
                  >
                    <Flame className="w-5 h-5 text-orange-500" />
                    Recent Achievements
                  </h2>
                  <div className="space-y-4 mb-6">
                    {recentAchievements.map((achievement) => {
                      const Icon = getAchievementIcon(
                        achievement.achievement_type
                      );
                      const gradient = getAchievementColor(
                        achievement.achievement_type
                      );

                      return (
                        <Card
                          key={achievement.id}
                          className={`${theme.card} border ${theme.border} rounded-2xl bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800`}
                        >
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
                              >
                                <Icon className="w-8 h-8 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle
                                    className={`text-xl font-bold ${theme.text}`}
                                  >
                                    {achievement.title}
                                  </CardTitle>
                                  <Badge className="bg-orange-500 text-white">
                                    <Flame className="w-3 h-3 mr-1" />
                                    New!
                                  </Badge>
                                </div>
                                {achievement.description && (
                                  <p
                                    className={`text-sm ${theme.textSecondary}`}
                                  >
                                    {achievement.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              {achievement.metric_value && (
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-orange-500" />
                                  <span className={`text-sm ${theme.text}`}>
                                    <strong>
                                      {achievement.metric_value}
                                      {achievement.metric_unit || ""}
                                    </strong>
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span
                                  className={`text-sm ${theme.textSecondary}`}
                                >
                                  {new Date(
                                    achievement.achieved_date
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              {achievement.is_public && (
                                <Badge variant="outline">Public</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Achievements Section */}
              <div>
                {recentAchievements.length > 0 && (
                  <h2
                    className={`text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}
                  >
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    All Achievements
                  </h2>
                )}
                <div className="space-y-4">
                  {achievements
                    .filter(
                      (a) => !recentAchievements.find((ra) => ra.id === a.id)
                    )
                    .map((achievement) => {
                      const Icon = getAchievementIcon(
                        achievement.achievement_type
                      );
                      const gradient = getAchievementColor(
                        achievement.achievement_type
                      );

                      return (
                        <Card
                          key={achievement.id}
                          className={`${theme.card} border ${theme.border} rounded-2xl`}
                        >
                          <CardHeader className="p-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}
                              >
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <CardTitle
                                  className={`text-lg font-bold ${theme.text} mb-1`}
                                >
                                  {achievement.title}
                                </CardTitle>
                                {achievement.description && (
                                  <p
                                    className={`text-sm ${theme.textSecondary}`}
                                  >
                                    {achievement.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              {achievement.metric_value && (
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-slate-400" />
                                  <span className={`text-sm ${theme.text}`}>
                                    {achievement.metric_value}
                                    {achievement.metric_unit || ""}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span
                                  className={`text-sm ${theme.textSecondary}`}
                                >
                                  {new Date(
                                    achievement.achieved_date
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              {achievement.is_public && (
                                <Badge variant="outline">Public</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Award className="w-12 h-12 text-yellow-500 dark:text-yellow-400" />
                </div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>
                  No Achievements Yet
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  Keep working out and hitting your goals to unlock
                  achievements! Your accomplishments will appear here
                  automatically.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/client/workouts">
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      <Trophy className="w-4 h-4 mr-2" />
                      Start Workout
                    </Button>
                  </Link>
                  <Link href="/client/progress/goals">
                    <Button variant="outline">
                      <Target className="w-4 h-4 mr-2" />
                      Set Goals
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
