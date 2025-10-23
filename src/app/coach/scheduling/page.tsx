"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  ArrowRight,
  Sparkles,
  Activity,
  Star,
  Copy,
  UserPlus,
  Filter,
  SortAsc,
  Search,
  Zap,
  BarChart3,
  Flame,
  Trophy,
  Eye,
  MessageCircle,
  Send,
  Flag,
  Timer,
  DollarSign,
  Package,
  Target,
  TrendingUp,
  Award,
  Gift,
  ShoppingCart,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Calendar as Today,
  Grid,
  List,
  MapPin,
  Phone,
  Mail,
  Video,
  Home,
  Building,
  Coffee,
  Dumbbell,
  Heart,
  Smile,
  ThumbsUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Hexagon,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CoachAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface SessionType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function CoachScheduling() {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [availability, setAvailability] = useState<CoachAvailability[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAvailability, setEditingAvailability] = useState<string | null>(
    null
  );
  const [editingSessionType, setEditingSessionType] = useState<string | null>(
    null
  );
  const [showAddAvailability, setShowAddAvailability] = useState(false);
  const [showAddSessionType, setShowAddSessionType] = useState(false);

  // Enhanced calendar and scheduling states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
  });
  const [sessionTypeForm, setSessionTypeForm] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    price: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load availability
      const { data: availabilityData, error: availabilityError } =
        await supabase
          .from("coach_availability")
          .select("*")
          .eq("coach_id", user.id)
          .order("day_of_week, start_time");

      if (availabilityError) {
        console.log("Availability table not found, using empty array");
        setAvailability([]);
      } else {
        setAvailability(availabilityData || []);
      }

      // Load session types
      const { data: sessionTypesData, error: sessionTypesError } =
        await supabase
          .from("session_types")
          .select("*")
          .eq("coach_id", user.id)
          .eq("is_active", true)
          .order("name");

      if (sessionTypesError) {
        console.log("Session types table not found, using empty array");
        setSessionTypes([]);
      } else {
        setSessionTypes(sessionTypesData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Set empty arrays as fallback
      setAvailability([]);
      setSessionTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced calendar and scheduling functions
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];

    // Add days from previous month
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = new Date(firstDay);
      prevDay.setDate(firstDay.getDate() - i - 1);
      dates.push(prevDay);
    }

    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    // Add days from next month to complete grid
    const remainingDays = 42 - dates.length;
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(year, month + 1, i));
    }

    return dates;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const navigateDate = (direction: "prev" | "next" | "today") => {
    const newDate = new Date(currentDate);

    switch (direction) {
      case "prev":
        if (viewMode === "day") {
          newDate.setDate(newDate.getDate() - 1);
        } else if (viewMode === "week") {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setMonth(newDate.getMonth() - 1);
        }
        break;
      case "next":
        if (viewMode === "day") {
          newDate.setDate(newDate.getDate() + 1);
        } else if (viewMode === "week") {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
        break;
      case "today":
        newDate.setTime(new Date().getTime());
        break;
    }

    setCurrentDate(newDate);
  };

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return availability.filter(
      (slot) => slot.day_of_week === dayOfWeek && slot.is_active
    );
  };

  const getSessionTypeColor = (sessionType: SessionType) => {
    const colors = [
      "bg-gradient-to-r from-purple-500 to-purple-600",
      "bg-gradient-to-r from-blue-500 to-blue-600",
      "bg-gradient-to-r from-green-500 to-green-600",
      "bg-gradient-to-r from-orange-500 to-orange-600",
      "bg-gradient-to-r from-pink-500 to-pink-600",
      "bg-gradient-to-r from-indigo-500 to-indigo-600",
      "bg-gradient-to-r from-teal-500 to-teal-600",
    ];
    const index = sessionType.id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const addAvailability = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("coach_availability").insert({
        coach_id: user.id,
        ...availabilityForm,
      });

      if (error) {
        console.error("Error adding availability:", error);
        alert(
          "Database tables not set up yet. Please run the database-scheduling.sql script first."
        );
        return;
      }

      setShowAddAvailability(false);
      setAvailabilityForm({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
      });
      loadData();
    } catch (error) {
      console.error("Error adding availability:", error);
      alert("Error adding availability. Please try again.");
    }
  };

  const updateAvailability = async (
    id: string,
    updates: Partial<CoachAvailability>
  ) => {
    try {
      const { error } = await supabase
        .from("coach_availability")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setEditingAvailability(null);
      loadData();
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("coach_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error("Error deleting availability:", error);
    }
  };

  const addSessionType = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("session_types").insert({
        coach_id: user.id,
        ...sessionTypeForm,
      });

      if (error) {
        console.error("Error adding session type:", error);
        alert(
          "Database tables not set up yet. Please run the database-scheduling.sql script first."
        );
        return;
      }

      setShowAddSessionType(false);
      setSessionTypeForm({
        name: "",
        description: "",
        duration_minutes: 60,
        price: 0,
      });
      loadData();
    } catch (error) {
      console.error("Error adding session type:", error);
      alert("Error adding session type. Please try again.");
    }
  };

  const updateSessionType = async (
    id: string,
    updates: Partial<SessionType>
  ) => {
    try {
      const { error } = await supabase
        .from("session_types")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setEditingSessionType(null);
      loadData();
    } catch (error) {
      console.error("Error updating session type:", error);
    }
  };

  const deleteSessionType = async (id: string) => {
    try {
      const { error } = await supabase
        .from("session_types")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error("Error deleting session type:", error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-48 ${theme.card} ${theme.shadow} rounded-2xl`}
                  >
                    <div className="animate-pulse p-6">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
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

  return (
    <ProtectedRoute requiredRole="coach">
      <div className={`min-h-screen ${theme.background}`}>
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}
                >
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h1
                  className={`text-4xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}
                >
                  Session Scheduling
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Manage your availability, schedule sessions, and track your
                calendar
              </p>
            </div>

            {/* Enhanced Search and Filters */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`}
                  />
                  <Input
                    placeholder="Search availability, session types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>

                <div className="flex gap-3">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger
                      className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                      <SelectItem value="sessions">Session Types</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={viewMode}
                    onValueChange={(value: "day" | "week" | "month") =>
                      setViewMode(value)
                    }
                  >
                    <SelectTrigger
                      className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    >
                      <Grid className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day View</SelectItem>
                      <SelectItem value="week">Week View</SelectItem>
                      <SelectItem value="month">Month View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Coach Availability */}
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle
                      className={`flex items-center gap-2 ${theme.text}`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}
                      >
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      Coach Availability
                    </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      Set your weekly availability schedule
                    </CardDescription>
                  </div>
                  <Dialog
                    open={showAddAvailability}
                    onOpenChange={setShowAddAvailability}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3`}
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Availability
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availability.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-4 ${theme.card} rounded-xl border-2 ${theme.border} hover:shadow-lg transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-3 py-1">
                          {DAYS_OF_WEEK[slot.day_of_week]}
                        </Badge>
                        <Badge
                          className={`${
                            slot.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          } rounded-xl`}
                        >
                          {slot.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className={`${theme.text} font-medium`}>
                          {formatTime(slot.start_time)} -{" "}
                          {formatTime(slot.end_time)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAvailability(slot.id)}
                          className={`flex-1 ${theme.border} ${theme.text} rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all`}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAvailability(slot.id)}
                          className={`${theme.border} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {availability.length === 0 && (
                  <div className="text-center py-12">
                    <div
                      className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}
                    >
                      <Clock className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                      No availability set
                    </h3>
                    <p
                      className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}
                    >
                      Add your weekly schedule to start accepting bookings from
                      clients.
                    </p>
                    <Button
                      onClick={() => setShowAddAvailability(true)}
                      className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Add Availability
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Session Types */}
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle
                      className={`flex items-center gap-2 ${theme.text}`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}
                      >
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      Session Types
                    </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      Define your different types of sessions
                    </CardDescription>
                  </div>
                  <Dialog
                    open={showAddSessionType}
                    onOpenChange={setShowAddSessionType}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3`}
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Session Type
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessionTypes.map((sessionType) => (
                    <div
                      key={sessionType.id}
                      className={`p-4 ${theme.card} rounded-xl border-2 ${theme.border} hover:shadow-lg transition-all duration-300`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${getSessionTypeColor(
                            sessionType
                          )} ${theme.shadow} flex items-center justify-center`}
                        >
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold ${theme.text} text-lg`}>
                            {sessionType.name}
                          </h4>
                          {sessionType.description && (
                            <p className={`text-sm ${theme.textSecondary}`}>
                              {sessionType.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                          <div className={`text-lg font-bold ${theme.text}`}>
                            {sessionType.duration_minutes}
                          </div>
                          <div className={`text-xs ${theme.textSecondary}`}>
                            minutes
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10">
                          <div className={`text-lg font-bold text-green-600`}>
                            ${sessionType.price}
                          </div>
                          <div className={`text-xs ${theme.textSecondary}`}>
                            price
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSessionType(sessionType.id)}
                          className={`flex-1 ${theme.border} ${theme.text} rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all`}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSessionType(sessionType.id)}
                          className={`${theme.border} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {sessionTypes.length === 0 && (
                  <div className="text-center py-12">
                    <div
                      className={`p-6 rounded-2xl ${theme.gradient} ${theme.shadow} w-24 h-24 mx-auto mb-6 flex items-center justify-center`}
                    >
                      <Calendar className="w-12 h-12 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                      No session types defined
                    </h3>
                    <p
                      className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}
                    >
                      Add your session types to start offering different
                      services to clients.
                    </p>
                    <Button
                      onClick={() => setShowAddSessionType(true)}
                      className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Add Session Type
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Add Availability Modal */}
            <Dialog
              open={showAddAvailability}
              onOpenChange={setShowAddAvailability}
            >
              <DialogContent
                className={`${theme.card} ${theme.shadow} rounded-2xl border-2 ${theme.border} max-w-md`}
              >
                <DialogHeader>
                  <DialogTitle
                    className={`flex items-center gap-2 ${theme.text} text-xl`}
                  >
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}
                    >
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Add Availability
                  </DialogTitle>
                  <DialogDescription className={`${theme.textSecondary}`}>
                    Set your weekly availability schedule for client bookings
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 p-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="day"
                      className={`${theme.text} font-medium`}
                    >
                      Day of Week
                    </Label>
                    <Select
                      value={availabilityForm.day_of_week.toString()}
                      onValueChange={(value) =>
                        setAvailabilityForm((prev) => ({
                          ...prev,
                          day_of_week: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                      >
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="start_time"
                      className={`${theme.text} font-medium`}
                    >
                      Start Time
                    </Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={availabilityForm.start_time}
                      onChange={(e) =>
                        setAvailabilityForm((prev) => ({
                          ...prev,
                          start_time: e.target.value,
                        }))
                      }
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="end_time"
                      className={`${theme.text} font-medium`}
                    >
                      End Time
                    </Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={availabilityForm.end_time}
                      onChange={(e) =>
                        setAvailabilityForm((prev) => ({
                          ...prev,
                          end_time: e.target.value,
                        }))
                      }
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={addAvailability}
                      className={`flex-1 ${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl h-12 font-semibold`}
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Add Availability
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddAvailability(false)}
                      className={`${theme.border} ${theme.text} rounded-xl h-12 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all`}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Enhanced Add Session Type Modal */}
            <Dialog
              open={showAddSessionType}
              onOpenChange={setShowAddSessionType}
            >
              <DialogContent
                className={`${theme.card} ${theme.shadow} rounded-2xl border-2 ${theme.border} max-w-md`}
              >
                <DialogHeader>
                  <DialogTitle
                    className={`flex items-center gap-2 ${theme.text} text-xl`}
                  >
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}
                    >
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    Add Session Type
                  </DialogTitle>
                  <DialogDescription className={`${theme.textSecondary}`}>
                    Define a new type of session you offer to clients
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 p-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className={`${theme.text} font-medium`}
                    >
                      Session Name
                    </Label>
                    <Input
                      id="name"
                      value={sessionTypeForm.name}
                      onChange={(e) =>
                        setSessionTypeForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Personal Training"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className={`${theme.text} font-medium`}
                    >
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={sessionTypeForm.description}
                      onChange={(e) =>
                        setSessionTypeForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Brief description of the session"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="duration"
                        className={`${theme.text} font-medium`}
                      >
                        Duration (min)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        value={sessionTypeForm.duration_minutes}
                        onChange={(e) =>
                          setSessionTypeForm((prev) => ({
                            ...prev,
                            duration_minutes: parseInt(e.target.value),
                          }))
                        }
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="price"
                        className={`${theme.text} font-medium`}
                      >
                        Price ($)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={sessionTypeForm.price}
                        onChange={(e) =>
                          setSessionTypeForm((prev) => ({
                            ...prev,
                            price: parseFloat(e.target.value),
                          }))
                        }
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={addSessionType}
                      className={`flex-1 ${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl h-12 font-semibold`}
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Add Session Type
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddSessionType(false)}
                      className={`${theme.border} ${theme.text} rounded-xl h-12 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all`}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
