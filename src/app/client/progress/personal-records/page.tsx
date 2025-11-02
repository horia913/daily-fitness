"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  Flame,
  Target,
  TrendingUp,
  Award,
  ArrowLeft,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import {
  fetchPersonalRecords,
  PersonalRecord,
  formatRecordDisplay,
  getRecordType,
} from "@/lib/personalRecords";

export default function PersonalRecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    if (user && !authLoading) {
      loadPersonalRecords();
    }
  }, [user, authLoading]);

  const loadPersonalRecords = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const records = await fetchPersonalRecords(user.id);
      setPersonalRecords(records);
    } catch (error) {
      console.error("Error loading personal records:", error);
    } finally {
      setLoading(false);
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
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                  Personal Records
                </h1>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Your best lifts and achievements
                </p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {personalRecords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/20">
                      <Trophy className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Total PRs
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {personalRecords.length}
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
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/20">
                      <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Recent PRs
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {personalRecords.filter((r) => r.isRecent).length}
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
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>
                        Best Weight
                      </p>
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {Math.max(...personalRecords.map((r) => r.weight))} kg
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Personal Records List */}
          {personalRecords.length > 0 ? (
            <div className="space-y-4">
              {personalRecords.map((record) => {
                const recordType = getRecordType(record.weight, record.reps);
                const recordDisplay = formatRecordDisplay(
                  record.weight,
                  record.reps
                );

                return (
                  <Card
                    key={record.id}
                    className={`${theme.card} border ${
                      theme.border
                    } rounded-2xl transition-all hover:shadow-lg ${
                      record.isRecent
                        ? "bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800"
                        : ""
                    }`}
                  >
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`p-3 rounded-xl ${
                              recordType.type === "power"
                                ? "bg-red-100 dark:bg-red-900/20"
                                : recordType.type === "endurance"
                                ? "bg-green-100 dark:bg-green-900/20"
                                : "bg-blue-100 dark:bg-blue-900/20"
                            }`}
                          >
                            <Trophy
                              className={`w-6 h-6 ${
                                recordType.type === "power"
                                  ? "text-red-600 dark:text-red-400"
                                  : recordType.type === "endurance"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-blue-600 dark:text-blue-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle
                              className={`text-xl font-bold ${theme.text} mb-1`}
                            >
                              {record.exerciseName}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`${
                                  recordType.type === "power"
                                    ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                                    : recordType.type === "endurance"
                                    ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                                    : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                }`}
                              >
                                {recordType.label}
                              </Badge>
                              {record.isRecent && (
                                <Badge className="bg-orange-500 text-white">
                                  <Flame className="w-3 h-3 mr-1" />
                                  New!
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span
                            className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                          >
                            Record
                          </span>
                          <p className={`text-2xl font-bold ${theme.text}`}>
                            {recordDisplay}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span
                            className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                          >
                            Weight
                          </span>
                          <p className={`text-2xl font-bold ${theme.text}`}>
                            {record.weight} kg
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span
                            className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                          >
                            Reps
                          </span>
                          <p className={`text-2xl font-bold ${theme.text}`}>
                            {record.reps}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span
                            className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                          >
                            Date
                          </span>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <p className={`text-sm font-medium ${theme.text}`}>
                              {new Date(record.date).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-12 h-12 text-orange-500 dark:text-orange-400" />
                </div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>
                  No Records Yet
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  Complete some workouts to start building your personal
                  records! Your best lifts will automatically be tracked here.
                </p>
                <Link href="/client/workouts">
                  <Button className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700">
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Start a Workout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
