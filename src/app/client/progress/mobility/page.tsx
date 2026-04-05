"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  Activity,
  Plus,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { isFromCheckIns, progressBackHref } from "@/lib/clientProgressNav";
import { useToast } from "@/components/ui/toast-provider";
import {
  MobilityMetricsService,
  MobilityMetric,
} from "@/lib/progressTrackingService";
import MobilityFormFields from "@/components/progress/MobilityFormFields";

function MobilityMetricsPageContent() {
  const searchParams = useSearchParams();
  const fromCheckIns = isFromCheckIns(searchParams);
  const { addToast } = useToast();
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadMetrics().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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
      addToast({ title: "Error saving assessment. Please try again.", variant: "destructive" });
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

  /** Get a single numeric value for progression display per assessment type */
  const getRepresentativeValue = (m: MobilityMetric): number | null => {
    switch (m.assessment_type) {
      case "shoulder": {
        const l = m.left_shoulder_flexion ?? m.left_shoulder_abduction;
        const r = m.right_shoulder_flexion ?? m.right_shoulder_abduction;
        if (l != null && r != null) return Math.round((l + r) / 2);
        return l ?? r ?? null;
      }
      case "hip": {
        const l = m.left_hip_straight_leg_raise ?? m.left_hip_knee_to_chest;
        const r = m.right_hip_straight_leg_raise ?? m.right_hip_knee_to_chest;
        if (l != null && r != null) return Math.round((l + r) / 2);
        return l ?? r ?? null;
      }
      case "ankle": {
        const left = (m as any).left_ankle_dorsiflexion ?? (m as any).left_foot_dorsiflexion;
        const right = (m as any).right_ankle_dorsiflexion ?? (m as any).right_foot_dorsiflexion;
        if (left != null && right != null) return Math.round((Number(left) + Number(right)) / 2);
        return left != null ? Number(left) : right != null ? Number(right) : null;
      }
      case "spine":
        return (m.forward_lean ?? (m as any).toe_touch) ?? null;
      case "overall":
        return (m as any).overall_score ?? null;
      default:
        return null;
    }
  };

  const progressionByType = (() => {
    const byType = new Map<string, MobilityMetric[]>();
    for (const m of metrics) {
      const t = m.assessment_type || "overall";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(m);
    }
    const result: { type: string; first: MobilityMetric; latest: MobilityMetric; firstVal: number; latestVal: number; firstDate: string }[] = [];
    for (const [type, list] of byType) {
      if (list.length < 2) continue;
      const sorted = [...list].sort((a, b) => a.assessed_date.localeCompare(b.assessed_date));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const firstVal = getRepresentativeValue(first);
      const latestVal = getRepresentativeValue(latest);
      if (firstVal != null && latestVal != null) {
        result.push({
          type,
          first,
          latest,
          firstVal,
          latestVal,
          firstDate: first.assessed_date,
        });
      }
    }
    return result;
  })();

  const singleAssessmentTypes = (() => {
    const byType = new Map<string, MobilityMetric[]>();
    for (const m of metrics) {
      const t = m.assessment_type || "overall";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(m);
    }
    return Array.from(byType.entries()).filter(([, list]) => list.length === 1).map(([type]) => type);
  })();

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-10">
            <div className="py-6 text-center">
              <p className="mb-3 text-sm text-[color:var(--fc-text-dim)]">{loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="fc-btn fc-btn-secondary fc-press h-10 px-5 text-sm">Retry</button>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-10">
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-32 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
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
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-10">
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = progressBackHref(fromCheckIns);
              }}
              className="fc-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-[color:var(--fc-text-primary)]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Mobility Assessment</h1>
              <p className="text-sm text-[color:var(--fc-text-dim)]">Flexibility and ROM over time</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="fc-btn fc-btn-primary h-9 shrink-0 px-3 text-sm">
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </div>

          {/* Metrics List */}
          {metrics.length > 0 ? (
            <>
              {/* Mobility Progress summary */}
              {(progressionByType.length > 0 || singleAssessmentTypes.length > 0) && (
                <div className="mt-3 space-y-2 border-t border-[color:var(--fc-glass-border)] pt-3">
                  <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)]">Mobility progress</h2>
                  <div className="space-y-2">
                    {progressionByType.map(({ type, firstVal, latestVal, firstDate }) => {
                      const change = latestVal - firstVal;
                      const improved = change > 0;
                      const isOverall = type === "overall";
                      const suffix = isOverall ? "" : "°";
                      return (
                        <div
                          key={type}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--fc-glass-border)]/70 py-2 last:border-0"
                        >
                          <span className="capitalize font-medium text-[color:var(--fc-text-primary)]">{type}</span>
                          <span className="text-sm font-mono">
                            {firstVal}{suffix} → {latestVal}{suffix}
                            {change !== 0 && (
                              <span className={improved ? "fc-text-success ml-1" : "fc-text-subtle ml-1"}>
                                {improved ? "▲" : "▼"} {change > 0 ? "+" : ""}{change}{suffix} since {new Date(firstDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            {change === 0 && <span className="fc-text-subtle ml-1">No change ({latestVal}{suffix})</span>}
                          </span>
                        </div>
                      );
                    })}
                    {singleAssessmentTypes.map((type) => (
                      <div
                        key={type}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--fc-glass-border)]/70 py-2 last:border-0"
                      >
                        <span className="capitalize font-medium text-[color:var(--fc-text-primary)]">{type}</span>
                        <span className="text-sm fc-text-dim">1 assessment — log another to track progress.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[color:var(--fc-glass-border)] pt-3 text-sm text-[color:var(--fc-text-dim)]">
                <span>
                  <span className="fc-text-subtle">Total:</span>{" "}
                  <span className="font-medium fc-text-primary">{metrics.length}</span>
                </span>
                <span>
                  <span className="fc-text-subtle">Latest:</span>{" "}
                  <span className="font-medium fc-text-primary">
                    {latestAssessment
                      ? new Date(latestAssessment.assessed_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </span>
                <span>
                  <span className="fc-text-subtle">Types:</span>{" "}
                  <span className="font-medium fc-text-primary">{assessmentTypes.size}</span>
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {metrics.map((metric) => (
                  <div key={metric.id} className="rounded-xl border border-[color:var(--fc-glass-border)]/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-domain-meals)]">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                            {new Date(metric.assessed_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-9 w-9" onClick={() => startEdit(metric)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-9 w-9 text-[color:var(--fc-status-error)]" onClick={() => handleDelete(metric.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {/* Shoulder Metrics */}
                      {((metric as any).left_shoulder_flexion ||
                        (metric as any).right_shoulder_flexion) && (
                        <div className="col-span-full">
                          <h4 className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            Shoulder mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(metric as any).left_shoulder_flexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Left Flexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_shoulder_flexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_shoulder_flexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="text-xs font-medium text-[color:var(--fc-text-subtle)] block mb-1">
                                  Right Flexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
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
                          <h4 className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            Hip mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(metric as any).left_hip_flexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="mb-1 block text-xs font-medium text-[color:var(--fc-text-subtle)]">
                                  Left flexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_hip_flexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_hip_flexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="mb-1 block text-xs font-medium text-[color:var(--fc-text-subtle)]">
                                  Right flexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
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
                          <h4 className="mb-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            Ankle mobility
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(metric as any).left_ankle_dorsiflexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="mb-1 block text-xs font-medium text-[color:var(--fc-text-subtle)]">
                                  Left dorsiflexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                                  {(metric as any).left_ankle_dorsiflexion}°
                                </p>
                              </div>
                            )}
                            {(metric as any).right_ankle_dorsiflexion && (
                              <div className="rounded-lg border border-[color:var(--fc-glass-border)]/60 p-2">
                                <span className="mb-1 block text-xs font-medium text-[color:var(--fc-text-subtle)]">
                                  Right dorsiflexion
                                </span>
                                <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
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
                          <div className="rounded-lg border border-[color:var(--fc-status-success)]/35 p-2">
                            <span className="mb-0.5 block text-xs font-medium text-[color:var(--fc-text-subtle)]">
                              Overall score
                            </span>
                            <p className="text-xl font-bold text-[color:var(--fc-status-success)]">
                              {(metric as any).overall_score}/100
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {metric.notes && (
                      <div className="mt-2 border-t border-[color:var(--fc-glass-border)]/60 pt-2">
                        <p className="text-sm text-[color:var(--fc-text-dim)]">{metric.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 space-y-3 border-t border-[color:var(--fc-glass-border)] pt-4 text-center">
              <p className="text-sm text-[color:var(--fc-text-dim)]">No assessments yet</p>
              <Button onClick={() => setShowAddModal(true)} className="fc-btn fc-btn-primary mx-auto h-9 text-sm">
                <Plus className="mr-1 h-4 w-4" />
                New Assessment
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

export default function MobilityMetricsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <AnimatedBackground>
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-10">
              <div className="animate-pulse space-y-3">
                <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
                <div className="h-32 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </div>
          </AnimatedBackground>
        </ProtectedRoute>
      }
    >
      <MobilityMetricsPageContent />
    </Suspense>
  );
}
