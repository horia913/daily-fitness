"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
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
import Link from "next/link";
import {
  MobilityMetricsService,
  MobilityMetric,
} from "@/lib/progressTrackingService";
import MobilityFormFields from "@/components/progress/MobilityFormFields";

export default function MobilityMetricsPage() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

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

  const latestAssessment = metrics.reduce<null | MobilityMetric>((latest, metric) => {
    if (!latest) return metric;
    return new Date(metric.assessed_date).getTime() >
      new Date(latest.assessed_date).getTime()
      ? metric
      : latest;
  }, null);

  const assessmentTypes = metrics.reduce((acc, metric) => {
    if (metric.assessment_type) {
      acc.add(metric.assessment_type);
    }
    return acc;
  }, new Set<string>());

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`mobility-skeleton-${index}`}
                      className="h-28 rounded-2xl bg-[color:var(--fc-glass-highlight)]"
                    ></div>
                  ))}
                </div>
                <div className="h-72 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link href="/client/progress">
                  <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Progress Hub
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Mobility Metrics
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Track flexibility progress and mobility assessments over time.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="fc-btn fc-btn-primary">
                <Plus className="mr-2 h-5 w-5" />
                New Assessment
              </Button>
            </div>
          </GlassCard>

          {/* Metrics List */}
          {metrics.length > 0 ? (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Total Assessments</p>
                      <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        {metrics.length}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_8px_18px_rgba(59,130,246,0.35)]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Latest Assessment</p>
                      <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                        {latestAssessment
                          ? new Date(latestAssessment.assessed_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_8px_18px_rgba(245,158,11,0.35)]">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Assessment Types</p>
                      <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        {assessmentTypes.size}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="mt-6 space-y-4">
                {metrics.map((metric) => (
                  <GlassCard key={metric.id} elevation={2} className="fc-glass fc-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-domain-meals)]">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                            {new Date(metric.assessed_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            {metric.assessment_type && (
                              <span className="fc-badge fc-glass-soft capitalize text-[color:var(--fc-text-primary)]">
                                {metric.assessment_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10" onClick={() => startEdit(metric)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10 text-[color:var(--fc-status-error)]" onClick={() => handleDelete(metric.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                      {/* Shoulder Metrics */}
                      {((metric as any).left_shoulder_flexion ||
                        (metric as any).right_shoulder_flexion) && (
                        <div className="col-span-full">
                          <h4 className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
                            Shoulder Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(metric as any).left_shoulder_flexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Left Flexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_shoulder_flexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_shoulder_flexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Right Flexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).right_shoulder_flexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hip Metrics */}
                      {((metric as any).left_hip_flexion ||
                        (metric as any).right_hip_flexion) && (
                        <div className="col-span-full mt-2">
                          <h4 className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
                            Hip Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(metric as any).left_hip_flexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Left Flexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_hip_flexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_hip_flexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Right Flexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).right_hip_flexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Ankle Metrics */}
                      {((metric as any).left_ankle_dorsiflexion ||
                        (metric as any).right_ankle_dorsiflexion) && (
                        <div className="col-span-full mt-2">
                          <h4 className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
                            Ankle Mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(metric as any).left_ankle_dorsiflexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Left Dorsiflexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_ankle_dorsiflexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_ankle_dorsiflexion && (
                              <div className="fc-glass-soft fc-card p-3">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Right Dorsiflexion
                                </span>
                                <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).right_ankle_dorsiflexion}°
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Overall Score */}
                      {(metric as any).overall_score && (
                        <div className="col-span-full mt-2">
                          <div className="fc-glass-soft fc-card p-4 border border-[color:var(--fc-status-success)]/30">
                            <span className="text-sm font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                              Overall Score
                            </span>
                            <p className="text-3xl font-bold text-[color:var(--fc-status-success)]">
                              {(metric as any).overall_score}/100
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {metric.notes && (
                      <div className="mt-4 fc-glass-soft fc-card p-3">
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          {metric.notes}
                        </p>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 fc-glass fc-card p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[color:var(--fc-glass-highlight)]">
                <Activity className="h-10 w-10 text-[color:var(--fc-text-subtle)]" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                No assessments yet
              </h3>
              <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                Start tracking mobility scores to monitor improvements over time.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="fc-btn fc-btn-primary mt-6">
                <Plus className="mr-2 h-5 w-5" />
                Add First Assessment
              </Button>
            </div>
          )}

          {/* Add/Edit Modal */}
          <ResponsiveModal
            isOpen={showAddModal}
            onClose={resetForm}
            title={editingMetric ? "Edit Mobility Assessment" : "New Mobility Assessment"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-2 block text-[color:var(--fc-text-primary)]">Date</Label>
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
                  variant="fc"
                />
              </div>

              <div>
                <Label className="mb-2 block text-[color:var(--fc-text-primary)]">
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
                  className="fc-select w-full px-4 py-3 text-sm"
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
                clientId={user?.id || ''}
                recordId={editingMetric?.id}
              />

              <div>
                <Label className="mb-2 block text-[color:var(--fc-text-primary)]">Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  rows={3}
                  variant="fc"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 fc-btn fc-btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  {editingMetric ? "Update" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 fc-btn fc-btn-secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </ResponsiveModal>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
