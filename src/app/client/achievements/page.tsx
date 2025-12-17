"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Trophy,
  Target,
  Flame,
  Zap,
  Star,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Dumbbell,
  Activity,
  BarChart3,
  Crown,
  Sparkles,
  Heart,
  Gift,
  Rocket,
  Eye,
  ArrowRight,
  Timer,
  TrendingDown,
  Users,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Circle,
  XCircle,
  PauseCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  SortAsc,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  Medal,
  Gem,
  Shield,
  Sword,
  Mountain,
  Sun,
  Moon,
  Rainbow,
  Wind,
  Share2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Achievement {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  type: "streak" | "pr" | "goal" | "milestone";
  value?: string;
  created_at: string;
  earned_at?: string;
  is_earned: boolean;
  progress?: number;
  max_progress?: number;
}

interface AchievementCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  achievements: Achievement[];
}

export default function ClientAchievements() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [categories, setCategories] = useState<AchievementCategory[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "earned" | "locked">(
    "all"
  );
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "progress" | "rarity"
  >("newest");

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load earned achievements from database
      const { data: earnedData, error: earnedError } = await supabase
        .from("achievements")
        .select("*")
        .eq("client_id", user.id)
        .eq("is_earned", true)
        .order("earned_at", { ascending: false });

      if (earnedError) throw earnedError;

      // Create comprehensive achievement list with progress tracking
      const allAchievements: Achievement[] = [
        // Streak Achievements
        {
          id: "streak-1",
          client_id: user.id,
          title: "First Steps",
          description: "Complete your first workout",
          type: "streak",
          value: "1",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "First Steps") || false,
          earned_at: earnedData?.find((a) => a.title === "First Steps")
            ?.earned_at,
          progress: 1,
          max_progress: 1,
        },
        {
          id: "streak-3",
          client_id: user.id,
          title: "Getting Started",
          description: "Complete 3 workouts in a row",
          type: "streak",
          value: "3",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Getting Started") || false,
          earned_at: earnedData?.find((a) => a.title === "Getting Started")
            ?.earned_at,
          progress: 3,
          max_progress: 3,
        },
        {
          id: "streak-5",
          client_id: user.id,
          title: "Consistency King",
          description: "Complete 5 workouts in a row",
          type: "streak",
          value: "5",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Consistency King") || false,
          earned_at: earnedData?.find((a) => a.title === "Consistency King")
            ?.earned_at,
          progress: 5,
          max_progress: 5,
        },
        {
          id: "streak-10",
          client_id: user.id,
          title: "Dedication Master",
          description: "Complete 10 workouts in a row",
          type: "streak",
          value: "10",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Dedication Master") || false,
          earned_at: earnedData?.find((a) => a.title === "Dedication Master")
            ?.earned_at,
          progress: 5,
          max_progress: 10,
        },
        {
          id: "streak-30",
          client_id: user.id,
          title: "Iron Will",
          description: "Complete 30 workouts in a row",
          type: "streak",
          value: "30",
          created_at: new Date().toISOString(),
          is_earned: earnedData?.some((a) => a.title === "Iron Will") || false,
          earned_at: earnedData?.find((a) => a.title === "Iron Will")
            ?.earned_at,
          progress: 5,
          max_progress: 30,
        },

        // Personal Record Achievements
        {
          id: "pr-first",
          client_id: user.id,
          title: "Personal Best",
          description: "Set your first personal record",
          type: "pr",
          value: "1",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Personal Best") || false,
          earned_at: earnedData?.find((a) => a.title === "Personal Best")
            ?.earned_at,
          progress: 1,
          max_progress: 1,
        },
        {
          id: "pr-5",
          client_id: user.id,
          title: "Record Breaker",
          description: "Set 5 personal records",
          type: "pr",
          value: "5",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Record Breaker") || false,
          earned_at: earnedData?.find((a) => a.title === "Record Breaker")
            ?.earned_at,
          progress: 2,
          max_progress: 5,
        },
        {
          id: "pr-10",
          client_id: user.id,
          title: "PR Machine",
          description: "Set 10 personal records",
          type: "pr",
          value: "10",
          created_at: new Date().toISOString(),
          is_earned: earnedData?.some((a) => a.title === "PR Machine") || false,
          earned_at: earnedData?.find((a) => a.title === "PR Machine")
            ?.earned_at,
          progress: 2,
          max_progress: 10,
        },

        // Goal Achievements
        {
          id: "goal-weekly",
          client_id: user.id,
          title: "Weekly Warrior",
          description: "Complete 5 workouts in a week",
          type: "goal",
          value: "5",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Weekly Warrior") || false,
          earned_at: earnedData?.find((a) => a.title === "Weekly Warrior")
            ?.earned_at,
          progress: 3,
          max_progress: 5,
        },
        {
          id: "goal-monthly",
          client_id: user.id,
          title: "Monthly Master",
          description: "Complete 20 workouts in a month",
          type: "goal",
          value: "20",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Monthly Master") || false,
          earned_at: earnedData?.find((a) => a.title === "Monthly Master")
            ?.earned_at,
          progress: 8,
          max_progress: 20,
        },

        // Milestone Achievements
        {
          id: "milestone-50",
          client_id: user.id,
          title: "Half Century",
          description: "Complete 50 total workouts",
          type: "milestone",
          value: "50",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Half Century") || false,
          earned_at: earnedData?.find((a) => a.title === "Half Century")
            ?.earned_at,
          progress: 12,
          max_progress: 50,
        },
        {
          id: "milestone-100",
          client_id: user.id,
          title: "Century Club",
          description: "Complete 100 total workouts",
          type: "milestone",
          value: "100",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Century Club") || false,
          earned_at: earnedData?.find((a) => a.title === "Century Club")
            ?.earned_at,
          progress: 12,
          max_progress: 100,
        },
        {
          id: "milestone-500",
          client_id: user.id,
          title: "Fitness Legend",
          description: "Complete 500 total workouts",
          type: "milestone",
          value: "500",
          created_at: new Date().toISOString(),
          is_earned:
            earnedData?.some((a) => a.title === "Fitness Legend") || false,
          earned_at: earnedData?.find((a) => a.title === "Fitness Legend")
            ?.earned_at,
          progress: 12,
          max_progress: 500,
        },
      ];

      setAchievements(allAchievements);

      // Organize achievements by category
      const achievementCategories: AchievementCategory[] = [
        {
          id: "streak",
          name: "Consistency",
          icon: Flame,
          color: "text-orange-600",
          achievements: allAchievements.filter((a) => a.type === "streak"),
        },
        {
          id: "pr",
          name: "Personal Records",
          icon: TrendingUp,
          color: "text-green-600",
          achievements: allAchievements.filter((a) => a.type === "pr"),
        },
        {
          id: "goal",
          name: "Goals",
          icon: Target,
          color: "text-blue-600",
          achievements: allAchievements.filter((a) => a.type === "goal"),
        },
        {
          id: "milestone",
          name: "Milestones",
          icon: Trophy,
          color: "text-purple-600",
          achievements: allAchievements.filter((a) => a.type === "milestone"),
        },
      ];

      setCategories(achievementCategories);
      setTotalEarned(allAchievements.filter((a) => a.is_earned).length);
      setTotalAvailable(allAchievements.length);
    } catch (error) {
      console.error("Error loading achievements:", error);
      // Set fallback data
      setAchievements([]);
      setCategories([]);
      setTotalEarned(0);
      setTotalAvailable(0);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (achievement: Achievement) => {
    const type = achievement.type;
    const isEarned = achievement.is_earned;
    const progress = achievement.progress || 0;
    const maxProgress = achievement.max_progress || 1;
    const progressPercentage = (progress / maxProgress) * 100;

    if (isEarned) {
      switch (type) {
        case "streak":
          return <Flame className="w-8 h-8 text-orange-500" />;
        case "pr":
          return <TrendingUp className="w-8 h-8 text-green-500" />;
        case "goal":
          return <Target className="w-8 h-8 text-blue-500" />;
        case "milestone":
          return <Trophy className="w-8 h-8 text-purple-500" />;
        default:
          return <Award className="w-8 h-8 text-yellow-500" />;
      }
    } else if (progressPercentage >= 80) {
      return <Crown className="w-8 h-8 text-purple-400" />;
    } else if (progressPercentage >= 50) {
      return <Medal className="w-8 h-8 text-blue-400" />;
    } else if (progressPercentage >= 25) {
      return <Gem className="w-8 h-8 text-green-400" />;
    } else {
      return <Circle className="w-8 h-8 text-slate-400" />;
    }
  };

  const getAchievementGradient = (achievement: Achievement) => {
    const type = achievement.type;
    const isEarned = achievement.is_earned;
    const progress = achievement.progress || 0;
    const maxProgress = achievement.max_progress || 1;
    const progressPercentage = (progress / maxProgress) * 100;

    if (isEarned) {
      switch (type) {
        case "streak":
          return "from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20";
        case "pr":
          return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20";
        case "goal":
          return "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20";
        case "milestone":
          return "from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20";
        default:
          return "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20";
      }
    } else if (progressPercentage >= 80) {
      return "from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20";
    } else if (progressPercentage >= 50) {
      return "from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20";
    } else if (progressPercentage >= 25) {
      return "from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20";
    } else {
      return "from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20";
    }
  };

  const getMotivationalMessage = () => {
    const earnedCount = totalEarned;
    const totalCount = totalAvailable;
    const percentage =
      totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

    if (percentage >= 80) {
      return "You're a true fitness legend! 🏆";
    } else if (percentage >= 60) {
      return "Incredible progress! You're unstoppable! 🚀";
    } else if (percentage >= 40) {
      return "Amazing achievements! Keep pushing forward! 💪";
    } else if (percentage >= 20) {
      return "Great start! Your journey is just beginning! ✨";
    } else if (earnedCount > 0) {
      return "Every achievement counts! Well done! 🌟";
    } else {
      return "Ready to start your achievement journey? 🎯";
    }
  };

  const getAchievementRarity = (achievement: Achievement) => {
    const value = parseInt(achievement.value || "1");
    if (value >= 500) return "legendary";
    if (value >= 100) return "epic";
    if (value >= 30) return "rare";
    if (value >= 10) return "uncommon";
    return "common";
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "epic":
        return "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800";
      case "rare":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      case "uncommon":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-800";
    }
  };

  const filteredAndSortedAchievements = () => {
    let filtered = achievements;

    // Apply category filter
    if (activeTab !== "all") {
      filtered = filtered.filter(
        (achievement) => achievement.type === activeTab
      );
    }

    // Apply status filter
    if (filterStatus === "earned") {
      filtered = filtered.filter((achievement) => achievement.is_earned);
    } else if (filterStatus === "locked") {
      filtered = filtered.filter((achievement) => !achievement.is_earned);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        return filtered.sort((a, b) => {
          if (a.is_earned && !b.is_earned) return -1;
          if (!a.is_earned && b.is_earned) return 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      case "oldest":
        return filtered.sort((a, b) => {
          if (a.is_earned && !b.is_earned) return -1;
          if (!a.is_earned && b.is_earned) return 1;
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      case "progress":
        return filtered.sort((a, b) => {
          if (a.is_earned && !b.is_earned) return -1;
          if (!a.is_earned && b.is_earned) return 1;
          const aProgress = a.max_progress
            ? (a.progress || 0) / a.max_progress
            : 0;
          const bProgress = b.max_progress
            ? (b.progress || 0) / b.max_progress
            : 0;
          return bProgress - aProgress;
        });
      case "rarity":
        return filtered.sort((a, b) => {
          if (a.is_earned && !b.is_earned) return -1;
          if (!a.is_earned && b.is_earned) return 1;
          const aValue = parseInt(a.value || "1");
          const bValue = parseInt(b.value || "1");
          return bValue - aValue;
        });
      default:
        return filtered;
    }
  };

  const getAchievementStats = () => {
    const earned = achievements.filter((a) => a.is_earned).length;
    const locked = achievements.filter((a) => !a.is_earned).length;
    const streaks = achievements.filter(
      (a) => a.type === "streak" && a.is_earned
    ).length;
    const prs = achievements.filter(
      (a) => a.type === "pr" && a.is_earned
    ).length;
    const goals = achievements.filter(
      (a) => a.type === "goal" && a.is_earned
    ).length;
    const milestones = achievements.filter(
      (a) => a.type === "milestone" && a.is_earned
    ).length;

    return { earned, locked, streaks, prs, goals, milestones };
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="text-center space-y-4 py-8">
                <div className="animate-pulse">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl w-80 mx-auto mb-4"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-96 mx-auto mb-6"></div>
                </div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                        <div>
                          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Skeleton */}
              <div className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-4">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                  </div>
                </div>
              </div>

              {/* Achievement Cards Skeleton */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                          <div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mb-2"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const stats = getAchievementStats();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-4 py-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Trophy Room
                </h1>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {getMotivationalMessage()}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl px-5 py-2 shadow-lg">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Trophy Room
                </Button>
                <Button variant="outline" className="rounded-xl">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Earned
                      </p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {stats.earned}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Available
                      </p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {stats.locked}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Streaks
                      </p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {stats.streaks}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-0">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        PRs
                      </p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {stats.prs}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Sorting */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border-0">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Category
                    </label>
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 bg-slate-100 dark:bg-slate-700">
                        <TabsTrigger value="all" className="text-xs">
                          All
                        </TabsTrigger>
                        <TabsTrigger value="streak" className="text-xs">
                          <Flame className="w-3 h-3 mr-1" />
                          Streaks
                        </TabsTrigger>
                        <TabsTrigger value="pr" className="text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          PRs
                        </TabsTrigger>
                        <TabsTrigger value="goal" className="text-xs">
                          <Target className="w-3 h-3 mr-1" />
                          Goals
                        </TabsTrigger>
                        <TabsTrigger value="milestone" className="text-xs">
                          <Trophy className="w-3 h-3 mr-1" />
                          Milestones
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) =>
                          setFilterStatus(
                            e.target.value as "all" | "earned" | "locked"
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <option value="all">All Achievements</option>
                        <option value="earned">Earned Only</option>
                        <option value="locked">Locked Only</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Sort by
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as
                              | "newest"
                              | "oldest"
                              | "progress"
                              | "rarity"
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="progress">Progress</option>
                        <option value="rarity">Rarity</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements List */}
            <div className="space-y-4">
              {filteredAndSortedAchievements().map((achievement) => {
                const progress = achievement.progress || 0;
                const maxProgress = achievement.max_progress || 1;
                const progressPercentage = (progress / maxProgress) * 100;
                const rarity = getAchievementRarity(achievement);
                const rarityColor = getRarityColor(rarity);

                return (
                  <Card
                    key={achievement.id}
                    className={`bg-gradient-to-r ${getAchievementGradient(
                      achievement
                    )} rounded-2xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                      achievement.is_earned
                        ? "ring-2 ring-yellow-200 dark:ring-yellow-900/30 animate-in fade-in"
                        : "opacity-75"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {/* Left Section - Icon and Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                            {getAchievementIcon(achievement)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">
                                {achievement.title}
                              </h3>
                              <Badge
                                className={`${rarityColor} rounded-full px-3 py-1`}
                              >
                                {rarity}
                              </Badge>
                              {achievement.is_earned ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full px-3 py-1">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Earned
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 rounded-full px-3 py-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mb-3">
                              {achievement.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              {achievement.value && (
                                <span className="flex items-center gap-1">
                                  <TargetIcon className="w-4 h-4" />
                                  Target: {achievement.value}
                                </span>
                              )}
                              {achievement.is_earned &&
                                achievement.earned_at && (
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    Earned:{" "}
                                    {new Date(
                                      achievement.earned_at
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Progress and Status */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Progress Circle */}
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{
                                  background: `conic-gradient(from 0deg, ${
                                    achievement.is_earned
                                      ? "#10B981"
                                      : progressPercentage >= 80
                                      ? "#8B5CF6"
                                      : progressPercentage >= 50
                                      ? "#3B82F6"
                                      : progressPercentage >= 25
                                      ? "#F59E0B"
                                      : "#E5E7EB"
                                  } ${
                                    progressPercentage * 3.6
                                  }deg, #E5E7EB 0deg)`,
                                }}
                              >
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                                  <span
                                    className={`text-xs font-bold ${
                                      achievement.is_earned
                                        ? "text-green-600"
                                        : progressPercentage >= 80
                                        ? "text-purple-600"
                                        : progressPercentage >= 50
                                        ? "text-blue-600"
                                        : progressPercentage >= 25
                                        ? "text-orange-600"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {achievement.is_earned
                                      ? "✓"
                                      : `${Math.round(progressPercentage)}%`}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {achievement.is_earned
                                  ? "100%"
                                  : `${Math.round(progressPercentage)}%`}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {achievement.is_earned
                                  ? "complete"
                                  : "progress"}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar for Locked Achievements */}
                          {!achievement.is_earned &&
                            achievement.max_progress && (
                              <div className="w-full lg:w-48">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-slate-600 dark:text-slate-400">
                                    Progress
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {progress}/{maxProgress}
                                  </span>
                                </div>
                                <Progress
                                  value={progressPercentage}
                                  className="h-3 rounded-full"
                                />
                              </div>
                            )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                            {achievement.is_earned && (
                              <Button
                                size="sm"
                                className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white"
                              >
                                <Share2 className="w-3 h-3 mr-1" />
                                Share
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredAndSortedAchievements().length === 0 && (
                <Card className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-lg border-0">
                  <CardContent className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                      {filterStatus === "earned"
                        ? "No Achievements Earned Yet"
                        : filterStatus === "locked"
                        ? "No Locked Achievements"
                        : "No Achievements Found"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                      {filterStatus === "earned"
                        ? "You haven't earned any achievements yet. Keep working towards your goals!"
                        : filterStatus === "locked"
                        ? "All achievements are unlocked! You're doing amazing!"
                        : "No achievements match your current filters."}
                    </p>
                    {filterStatus !== "all" && (
                      <Button
                        onClick={() => setFilterStatus("all")}
                        className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        View All Achievements
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
