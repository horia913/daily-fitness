"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  Plus,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  Activity,
} from "lucide-react";
import {
  FMSAssessmentService,
  FMSAssessment,
} from "@/lib/progressTrackingService";
import { ProgressPhotoStorage } from "@/lib/progressPhotoStorage";
import { useToast } from "@/components/ui/toast-provider";
import { X, Upload, ClipboardList } from "lucide-react";
import Image from "next/image";
import { EmptyState } from "@/components/ui/EmptyState";

// DB columns use no _score suffix (e.g. deep_squat, hurdle_step_left)
const FMS_TESTS = [
  { key: "deep_squat", label: "Deep Squat", maxScore: 3 },
  { key: "hurdle_step_left", label: "Hurdle Step (Left)", maxScore: 3 },
  { key: "hurdle_step_right", label: "Hurdle Step (Right)", maxScore: 3 },
  { key: "inline_lunge_left", label: "Inline Lunge (Left)", maxScore: 3 },
  { key: "inline_lunge_right", label: "Inline Lunge (Right)", maxScore: 3 },
  { key: "shoulder_mobility_left", label: "Shoulder Mobility (Left)", maxScore: 3 },
  { key: "shoulder_mobility_right", label: "Shoulder Mobility (Right)", maxScore: 3 },
  { key: "active_straight_leg_raise_left", label: "Active Straight Leg Raise (Left)", maxScore: 3 },
  { key: "active_straight_leg_raise_right", label: "Active Straight Leg Raise (Right)", maxScore: 3 },
  { key: "trunk_stability_pushup", label: "Trunk Stability Push-up", maxScore: 3 },
  { key: "rotary_stability_left", label: "Rotary Stability (Left)", maxScore: 3 },
  { key: "rotary_stability_right", label: "Rotary Stability (Right)", maxScore: 3 },
];

export type ClientFmsAssessmentsPanelProps = {
  clientId: string;
  /** When false, hides hub back link header (e.g. embedded under Profile). */
  showPageHeader?: boolean;
  clientName?: string | null;
};

export function ClientFmsAssessmentsPanel({
  clientId,
  showPageHeader = true,
  clientName: clientNameProp,
}: ClientFmsAssessmentsPanelProps) {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const { clientName: contextClientName } = useCoachClient();
  const displayClientName =
    (clientNameProp && clientNameProp.trim()) || contextClientName || "Client";
  const { addToast } = useToast();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<FMSAssessment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssessment, setEditingAssessment] =
    useState<FMSAssessment | null>(null);
  const [formData, setFormData] = useState<Partial<FMSAssessment>>({
    assessed_date: new Date().toISOString().split("T")[0],
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const fmsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !clientId) return;
    if (fmsTimeoutRef.current) clearTimeout(fmsTimeoutRef.current);
    fmsTimeoutRef.current = setTimeout(() => {
      fmsTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadAssessments().finally(() => {
      if (fmsTimeoutRef.current) {
        clearTimeout(fmsTimeoutRef.current);
        fmsTimeoutRef.current = null;
      }
    });
    return () => {
      if (fmsTimeoutRef.current) {
        clearTimeout(fmsTimeoutRef.current);
        fmsTimeoutRef.current = null;
      }
    };
  }, [user, clientId]);

  const loadAssessments = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const data = await FMSAssessmentService.getClientFMSAssessments(clientId);
      setAssessments(data);
    } catch (error) {
      console.error("Error loading FMS assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !user?.id) return;

    try {
      if (editingAssessment) {
        // Update existing - need to add update method
        const updated = await FMSAssessmentService.updateFMSAssessment(
          editingAssessment.id,
          formData
        );
        if (updated) {
          setAssessments((prev) =>
            prev.map((a) => (a.id === editingAssessment.id ? updated : a))
          );
          resetForm();
        }
      } else {
        // Create new
        const newAssessment = await FMSAssessmentService.createFMSAssessment(
          clientId,
          {
            ...formData,
            photos: formData.photos, // Include photos in submission
          },
          user.id
        );
        if (newAssessment) {
          // If photos were uploaded with temp IDs, we keep them as-is since temp IDs are unique
          // Photos are already in formData.photos and will be saved
          setAssessments((prev) => [newAssessment, ...prev]);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving FMS assessment:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const success = await FMSAssessmentService.deleteFMSAssessment(id);
      if (success) {
        setAssessments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Error deleting FMS assessment:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      assessed_date: new Date().toISOString().split("T")[0],
    });
    setEditingAssessment(null);
    setShowAddModal(false);
  };

  // Handle photo upload
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const tempRecordId =
          editingAssessment?.id ||
          `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const photoUrl = await ProgressPhotoStorage.uploadPhoto(
          file,
          clientId,
          "fms",
          tempRecordId,
          undefined
        );
        return photoUrl;
      });

      const newPhotoUrls = await Promise.all(uploadPromises);
      const currentPhotos = formData.photos || [];
      setFormData({
        ...formData,
        photos: [...currentPhotos, ...newPhotoUrls],
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
      addToast({ title: "Error uploading photos. Please try again.", variant: "destructive" });
    } finally {
      setUploadingPhotos(false);
      event.target.value = "";
    }
  };

  // Handle photo deletion
  const handlePhotoDelete = async (photoUrl: string, index: number) => {
    if (!editingAssessment?.id) {
      // For new records, just remove from state
      const currentPhotos = formData.photos || [];
      setFormData({
        ...formData,
        photos: currentPhotos.filter((_, i) => i !== index),
      });
      return;
    }

    try {
      await ProgressPhotoStorage.deletePhoto(
        photoUrl,
        clientId,
        "fms",
        editingAssessment.id
      );
      const currentPhotos = formData.photos || [];
      setFormData({
        ...formData,
        photos: currentPhotos.filter((_, i) => i !== index),
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      addToast({ title: "Error deleting photo. Please try again.", variant: "destructive" });
    }
  };

  const startEdit = (assessment: FMSAssessment) => {
    setEditingAssessment(assessment);
    setFormData(assessment);
    setShowAddModal(true);
  };

  const calculateTotalScore = (assessment: Partial<FMSAssessment>): number => {
    const scores = FMS_TESTS.map((test) => (assessment as any)[test.key] || 0);
    return scores.reduce((sum, score) => sum + score, 0);
  };

  const getScoreColor = (score: number | undefined, maxScore: number) => {
    if (!score) return "text-[color:var(--fc-text-subtle)]";
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassCard elevation={2} className="fc-card-shell p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
            <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {showPageHeader ? (
          <GlassCard elevation={2} className="fc-card-shell p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Link
                  href={`/coach/clients/${clientId}`}
                  className="fc-card-shell inline-flex p-2.5 rounded-xl border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)] shrink-0"
                  aria-label="Back to client hub"
                >
                  <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                      FMS Assessment
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                      {displayClientName} — Functional Movement Screen
                    </p>
                  </div>
                </div>
              </div>
              <Button className="fc-btn fc-btn-primary shrink-0" type="button" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </div>
          </GlassCard>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold fc-text-primary">FMS assessments</h2>
              <Button className="fc-btn fc-btn-primary shrink-0" type="button" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </div>
          )}

          {assessments.length >= 2 && (
            <GlassCard elevation={1} className="fc-card-shell p-4 rounded-2xl">
              <p className="text-xs font-medium fc-text-subtle mb-2">Total score trend (oldest → newest)</p>
              {(() => {
                const maxPts = FMS_TESTS.length * 3;
                const sorted = [...assessments].sort(
                  (a, b) =>
                    new Date(a.assessed_date || 0).getTime() -
                    new Date(b.assessed_date || 0).getTime()
                );
                const pts = sorted.map((a, i) => {
                  const x = (i / Math.max(sorted.length - 1, 1)) * 100;
                  const sc = a.total_score ?? 0;
                  const y = 22 - (sc / maxPts) * 20;
                  return `${x},${y}`;
                });
                return (
                  <svg viewBox="0 0 100 24" className="w-full h-14" preserveAspectRatio="none" aria-hidden>
                    <polyline
                      fill="none"
                      stroke="var(--fc-accent, #6366f1)"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      points={pts.join(" ")}
                    />
                  </svg>
                );
              })()}
            </GlassCard>
          )}

          {/* Assessments List */}
          {assessments.length > 0 ? (
            <div className="rounded-xl border border-[color:var(--fc-glass-border)]">
              {assessments.map((assessment) => {
                const totalScore = assessment.total_score || 0;
                const maxScore = FMS_TESTS.length * 3;
                const percentage = (totalScore / maxScore) * 100;

                return (
                  <GlassCard
                    key={assessment.id}
                    elevation={2}
                    className="rounded-none border-b border-[color:var(--fc-glass-border)] last:border-b-0"
                  >
                    <CardHeader className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-orange-500" />
                          <CardTitle
                            className={`text-lg font-bold ${theme.text}`}
                          >
                            {new Date(
                              assessment.assessed_date ||
                                new Date()
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(assessment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(assessment.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 py-2">
                      {/* Total Score */}
                      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <span
                              className={`text-sm font-medium ${theme.textSecondary} block mb-1`}
                            >
                              Total Score
                            </span>
                            <p
                              className={`text-4xl font-bold ${
                                percentage >= 75
                                  ? "text-green-600 dark:text-green-400"
                                  : percentage >= 50
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {totalScore}/{maxScore}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm ${theme.textSecondary} block mb-1`}
                            >
                              Percentage
                            </span>
                            <p className={`text-2xl font-bold ${theme.text}`}>
                              {percentage.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Test Scores */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {FMS_TESTS.map((test) => {
                          const score = (assessment as any)[test.key] as
                            | number
                            | undefined;
                          return (
                            <div
                              key={test.key}
                              className="p-3 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-surface-card-border)]"
                            >
                              <p
                                className={`text-xs font-medium ${theme.textSecondary} mb-2`}
                              >
                                {test.label}
                              </p>
                              <div className="flex items-center justify-between">
                                <p
                                  className={`text-2xl font-bold ${getScoreColor(
                                    score,
                                    test.maxScore
                                  )}`}
                                >
                                  {score !== undefined ? score : "-"}
                                </p>
                                <span
                                  className={`text-xs ${theme.textSecondary}`}
                                >
                                  /{test.maxScore}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {assessment.notes && (
                        <div className="mt-4 p-3 rounded-xl bg-[color:var(--fc-glass-highlight)]">
                          <p className={`text-sm ${theme.textSecondary}`}>
                            {assessment.notes}
                          </p>
                        </div>
                      )}

                      {/* Photos */}
                      {assessment.photos && assessment.photos.length > 0 && (
                        <div className="mt-4">
                          <p
                            className={`text-sm font-medium ${theme.textSecondary} mb-2`}
                          >
                            Photos ({assessment.photos.length})
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {assessment.photos.map((photoUrl, index) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-lg overflow-hidden border border-[color:var(--fc-surface-card-border)]"
                              >
                                <Image
                                  src={photoUrl}
                                  alt={`Assessment photo ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 50vw, 33vw"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <GlassCard elevation={2} className="fc-card-shell">
              <CardContent className="p-12">
                <EmptyState
                  icon={ClipboardList}
                  title="No FMS assessments"
                  description="Create the first assessment for this client"
                  action={{ label: "New Assessment", onClick: () => setShowAddModal(true) }}
                />
              </CardContent>
            </GlassCard>
          )}

          {/* Add/Edit Modal */}
          <ResponsiveModal
            isOpen={showAddModal}
            onClose={resetForm}
            title={
              editingAssessment ? "Edit FMS Assessment" : "New FMS Assessment"
            }
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className={`${theme.text} mb-2 block`}>
                  Assessment Date
                </Label>
                <Input
                  type="date"
                  value={
                    formData.assessed_date || ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assessed_date: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="border-t pt-4">
                <Label
                  className={`${theme.text} mb-4 block text-lg font-semibold`}
                >
                  Test Scores (0-3)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                  {FMS_TESTS.map((test) => (
                    <div key={test.key}>
                      <Label
                        className={`${theme.textSecondary} mb-2 block text-sm`}
                      >
                        {test.label}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max={test.maxScore}
                        step="1"
                        value={(formData as any)[test.key] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [test.key]: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="0-3"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className={`text-sm ${theme.textSecondary}`}>
                    <strong>Total Score:</strong>{" "}
                    {calculateTotalScore(formData)}/{FMS_TESTS.length * 3}
                  </p>
                </div>
              </div>

              <div>
                <Label className={`${theme.text} mb-2 block`}>Notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Assessment notes, recommendations..."
                  rows={4}
                />
              </div>

              {/* Photo Upload Section */}
              <div>
                <Label className={`${theme.text} mb-2 block`}>Photos</Label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="fms-photo-upload"
                      disabled={uploadingPhotos}
                    />
                    <label
                      htmlFor="fms-photo-upload"
                      className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        uploadingPhotos
                          ? "border-slate-300 dark:border-slate-700 opacity-50 cursor-not-allowed"
                          : "border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600"
                      } ${theme.card}`}
                    >
                      {uploadingPhotos ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className={`text-sm ${theme.textSecondary}`}>
                            Uploading...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className={`text-sm font-medium ${theme.text}`}>
                            Add Photos
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Photo Preview Grid */}
                  {formData.photos && formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.photos.map((photoUrl, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden border border-[color:var(--fc-surface-card-border)] group"
                        >
                          <Image
                            src={photoUrl}
                            alt={`Photo ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, 150px"
                          />
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(photoUrl, index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={uploadingPhotos}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingAssessment ? "Update" : "Save"}
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
  );
}
