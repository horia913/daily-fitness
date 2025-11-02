"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  Scale,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { BodyMetricsService, BodyMetrics } from "@/lib/progressTrackingService";
import { supabase } from "@/lib/supabase";

export default function BodyMetricsPage() {
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BodyMetrics[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<BodyMetrics | null>(null);
  const [formData, setFormData] = useState<Partial<BodyMetrics>>({
    measured_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user && !authLoading) {
      loadMetrics();
    }
  }, [user, authLoading]);

  const loadMetrics = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await BodyMetricsService.getClientMetrics(user.id);
      setMetrics(data);
    } catch (error) {
      console.error("Error loading body metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      if (editingMetric) {
        // Update existing
        const updated = await BodyMetricsService.updateBodyMetrics(
          editingMetric.id,
          formData
        );
        if (updated) {
          setMetrics((prev) =>
            prev.map((m) => (m.id === editingMetric.id ? updated : m))
          );
          resetForm();
        }
      } else {
        // Create new
        const newMetric = await BodyMetricsService.createBodyMetrics(
          user.id,
          formData
        );
        if (newMetric) {
          setMetrics((prev) => [newMetric, ...prev]);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving body metrics:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this measurement?")) return;

    try {
      const success = await BodyMetricsService.deleteBodyMetrics(id);
      if (success) {
        setMetrics((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting body metrics:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      measured_date: new Date().toISOString().split("T")[0],
    });
    setEditingMetric(null);
    setShowAddModal(false);
  };

  const startEdit = (metric: BodyMetrics) => {
    setEditingMetric(metric);
    setFormData(metric);
    setShowAddModal(true);
  };

  const getWeightTrend = (index: number) => {
    if (
      index === metrics.length - 1 ||
      !metrics[index + 1]?.weight_kg ||
      !metrics[index]?.weight_kg
    ) {
      return null;
    }
    const current = metrics[index].weight_kg!;
    const previous = metrics[index + 1].weight_kg!;
    const diff = current - previous;
    return diff;
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
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                  Body Metrics
                </h1>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Track your body composition and measurements
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Measurement
            </Button>
          </div>

          {/* Metrics List */}
          {metrics.length > 0 ? (
            <div className="space-y-4">
              {metrics.map((metric, index) => {
                const weightTrend = getWeightTrend(index);
                return (
                  <Card
                    key={metric.id}
                    className={`${theme.card} border ${theme.border} rounded-2xl`}
                  >
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-500" />
                          <CardTitle
                            className={`text-lg font-bold ${theme.text}`}
                          >
                            {new Date(metric.measured_date).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(metric)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(metric.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metric.weight_kg && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-medium ${theme.textSecondary}`}
                              >
                                Weight
                              </span>
                              {weightTrend !== null && (
                                <span
                                  className={
                                    weightTrend > 0
                                      ? "text-red-500"
                                      : "text-green-500"
                                  }
                                >
                                  {weightTrend > 0 ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                </span>
                              )}
                            </div>
                            <p className={`text-2xl font-bold ${theme.text}`}>
                              {metric.weight_kg.toFixed(1)} kg
                            </p>
                          </div>
                        )}

                        {metric.body_fat_percentage && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Body Fat %
                            </span>
                            <p className={`text-2xl font-bold ${theme.text}`}>
                              {metric.body_fat_percentage.toFixed(1)}%
                            </p>
                          </div>
                        )}

                        {metric.muscle_mass_kg && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Muscle Mass
                            </span>
                            <p className={`text-2xl font-bold ${theme.text}`}>
                              {metric.muscle_mass_kg.toFixed(1)} kg
                            </p>
                          </div>
                        )}

                        {metric.waist_circumference && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Waist
                            </span>
                            <p className={`text-2xl font-bold ${theme.text}`}>
                              {metric.waist_circumference.toFixed(1)} cm
                            </p>
                          </div>
                        )}

                        {/* Additional measurements */}
                        {metric.left_arm_circumference && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Left Arm
                            </span>
                            <p className={`text-xl font-bold ${theme.text}`}>
                              {metric.left_arm_circumference.toFixed(1)} cm
                            </p>
                          </div>
                        )}

                        {metric.right_arm_circumference && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Right Arm
                            </span>
                            <p className={`text-xl font-bold ${theme.text}`}>
                              {metric.right_arm_circumference.toFixed(1)} cm
                            </p>
                          </div>
                        )}

                        {metric.torso_circumference && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Torso
                            </span>
                            <p className={`text-xl font-bold ${theme.text}`}>
                              {metric.torso_circumference.toFixed(1)} cm
                            </p>
                          </div>
                        )}

                        {metric.hips_circumference && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span
                              className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Hips
                            </span>
                            <p className={`text-xl font-bold ${theme.text}`}>
                              {metric.hips_circumference.toFixed(1)} cm
                            </p>
                          </div>
                        )}
                      </div>

                      {metric.notes && (
                        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <p className={`text-sm ${theme.textSecondary}`}>
                            {metric.notes}
                          </p>
                        </div>
                      )}
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
                <Scale className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>
                  No measurements yet
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  Start tracking your body metrics to see your progress over
                  time
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Measurement
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Modal */}
          <ResponsiveModal
            isOpen={showAddModal}
            onClose={resetForm}
            title={editingMetric ? "Edit Measurement" : "Add Body Measurement"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className={`${theme.text} mb-2 block`}>Date</Label>
                <Input
                  type="date"
                  value={formData.measured_date}
                  onChange={(e) =>
                    setFormData({ ...formData, measured_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Weight (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight_kg || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight_kg: parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="75.5"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Body Fat %
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.body_fat_percentage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        body_fat_percentage:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="20.5"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Muscle Mass (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.muscle_mass_kg || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        muscle_mass_kg: parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="55.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Waist (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.waist_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waist_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="85.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Torso (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.torso_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        torso_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="100.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Hips (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.hips_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hips_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="95.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Left Arm (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.left_arm_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        left_arm_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="35.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Right Arm (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.right_arm_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        right_arm_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="35.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Left Thigh (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.left_thigh_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        left_thigh_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="60.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Right Thigh (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.right_thigh_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        right_thigh_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="60.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Left Calf (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.left_calf_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        left_calf_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="38.0"
                  />
                </div>

                <div>
                  <Label className={`${theme.text} mb-2 block`}>
                    Right Calf (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.right_calf_circumference || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        right_calf_circumference:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    placeholder="38.0"
                  />
                </div>
              </div>

              <div>
                <Label className={`${theme.text} mb-2 block`}>
                  Measurement Method
                </Label>
                <Input
                  type="text"
                  value={formData.measurement_method || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      measurement_method: e.target.value,
                    })
                  }
                  placeholder="e.g., Bioimpedance, DEXA, Tape measure"
                />
              </div>

              <div>
                <Label className={`${theme.text} mb-2 block`}>Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingMetric ? "Update" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </ResponsiveModal>
        </div>
      </div>
    </ProtectedRoute>
  );
}
