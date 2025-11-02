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
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  Activity,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MobilityMetricsService,
  MobilityMetric,
} from "@/lib/progressTrackingService";
import MobilityFormFields from "@/components/progress/MobilityFormFields";

export default function MobilityMetricsPage() {
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MobilityMetric[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MobilityMetric | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<MobilityMetric>>({
    assessed_date: new Date().toISOString().split("T")[0],
    assessment_type: "overall",
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
      const data = await MobilityMetricsService.getClientMobilityMetrics(
        user.id
      );
      setMetrics(data);
    } catch (error) {
      console.error("Error loading mobility metrics:", error);
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
        const updated = await MobilityMetricsService.updateMobilityMetric(
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
        // Create new - photos are already uploaded and URLs are in formData.photos
        const newMetric = await MobilityMetricsService.createMobilityMetric(
          user.id,
          formData
        );
        if (newMetric) {
          setMetrics((prev) => [newMetric, ...prev]);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving mobility metrics:", error);
      alert("Error saving assessment. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const success = await MobilityMetricsService.deleteMobilityMetric(id);
      if (success) {
        setMetrics((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting mobility metric:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      assessed_date: new Date().toISOString().split("T")[0],
      assessment_type: "overall",
    });
    setEditingMetric(null);
    setShowAddModal(false);
  };

  const startEdit = (metric: MobilityMetric) => {
    setEditingMetric(metric);
    setFormData(metric);
    setShowAddModal(true);
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
              <div className="p-3 rounded-2xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                  Mobility Metrics
                </h1>
                <p className={`text-sm ${theme.textSecondary}`}>
                  Track your flexibility and mobility assessments
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </div>

          {/* Metrics List */}
          {metrics.length > 0 ? (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <Card
                  key={metric.id}
                  className={`${theme.card} border ${theme.border} rounded-2xl`}
                >
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-500" />
                        <CardTitle
                          className={`text-lg font-bold ${theme.text}`}
                        >
                          {new Date(metric.assessed_date).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </CardTitle>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {metric.assessment_type}
                        </Badge>
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
                      {/* Shoulder Metrics */}
                      {(metric.left_shoulder_flexion ||
                        metric.right_shoulder_flexion) && (
                        <div className="col-span-full">
                          <h4
                            className={`text-sm font-semibold ${theme.text} mb-3`}
                          >
                            Shoulder Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {metric.left_shoulder_flexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Left Flexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.left_shoulder_flexion}°
                                </p>
                              </div>
                            )}
                            {metric.right_shoulder_flexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Right Flexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.right_shoulder_flexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hip Metrics */}
                      {(metric.left_hip_flexion ||
                        metric.right_hip_flexion) && (
                        <div className="col-span-full mt-2">
                          <h4
                            className={`text-sm font-semibold ${theme.text} mb-3`}
                          >
                            Hip Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {metric.left_hip_flexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Left Flexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.left_hip_flexion}°
                                </p>
                              </div>
                            )}
                            {metric.right_hip_flexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Right Flexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.right_hip_flexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Ankle Metrics */}
                      {(metric.left_ankle_dorsiflexion ||
                        metric.right_ankle_dorsiflexion) && (
                        <div className="col-span-full mt-2">
                          <h4
                            className={`text-sm font-semibold ${theme.text} mb-3`}
                          >
                            Ankle Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {metric.left_ankle_dorsiflexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Left Dorsiflexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.left_ankle_dorsiflexion}°
                                </p>
                              </div>
                            )}
                            {metric.right_ankle_dorsiflexion && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary} block mb-1`}
                                >
                                  Right Dorsiflexion
                                </span>
                                <p
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {metric.right_ankle_dorsiflexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Overall Score */}
                      {metric.overall_score && (
                        <div className="col-span-full mt-2">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                            <span
                              className={`text-sm font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Overall Score
                            </span>
                            <p
                              className={`text-3xl font-bold text-green-600 dark:text-green-400`}
                            >
                              {metric.overall_score}/100
                            </p>
                          </div>
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
              ))}
            </div>
          ) : (
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>
                  No assessments yet
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  Start tracking your mobility to monitor improvements over time
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Assessment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Modal */}
          <ResponsiveModal
            isOpen={showAddModal}
            onClose={resetForm}
            title={
              editingMetric
                ? "Edit Mobility Assessment"
                : "New Mobility Assessment"
            }
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className={`${theme.text} mb-2 block`}>Date</Label>
                <Input
                  type="date"
                  value={formData.assessed_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assessed_date: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label className={`${theme.text} mb-2 block`}>
                  Assessment Type
                </Label>
                <select
                  value={formData.assessment_type || "overall"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assessment_type: e.target.value as any,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${theme.border} ${theme.background}`}
                >
                  <option value="shoulder">Shoulder</option>
                  <option value="hip">Hip</option>
                  <option value="ankle">Ankle</option>
                  <option value="spine">Spine</option>
                  <option value="overall">Overall</option>
                </select>
              </div>

              {/* Assessment-specific fields with reference values and photo upload */}
              <MobilityFormFields
                assessmentType={formData.assessment_type || "overall"}
                formData={formData}
                setFormData={setFormData}
                clientId={user.id}
                recordId={editingMetric?.id}
              />

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
