"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  ClipboardCheck,
  Plus,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  User,
} from "lucide-react";
import {
  FMSAssessmentService,
  FMSAssessment,
} from "@/lib/progressTrackingService";
import { supabase } from "@/lib/supabase";
import { ProgressPhotoStorage } from "@/lib/progressPhotoStorage";
import { X, Upload } from "lucide-react";
import Image from "next/image";

const FMS_TESTS = [
  { key: "deep_squat_score", label: "Deep Squat", maxScore: 3 },
  {
    key: "hurdle_step_left_score",
    label: "Hurdle Step (Left)",
    maxScore: 3,
  },
  {
    key: "hurdle_step_right_score",
    label: "Hurdle Step (Right)",
    maxScore: 3,
  },
  {
    key: "inline_lunge_left_score",
    label: "Inline Lunge (Left)",
    maxScore: 3,
  },
  {
    key: "inline_lunge_right_score",
    label: "Inline Lunge (Right)",
    maxScore: 3,
  },
  {
    key: "shoulder_mobility_left_score",
    label: "Shoulder Mobility (Left)",
    maxScore: 3,
  },
  {
    key: "shoulder_mobility_right_score",
    label: "Shoulder Mobility (Right)",
    maxScore: 3,
  },
  {
    key: "active_straight_leg_raise_left_score",
    label: "Active Straight Leg Raise (Left)",
    maxScore: 3,
  },
  {
    key: "active_straight_leg_raise_right_score",
    label: "Active Straight Leg Raise (Right)",
    maxScore: 3,
  },
  {
    key: "trunk_stability_pushup_score",
    label: "Trunk Stability Push-up",
    maxScore: 3,
  },
  {
    key: "rotary_stability_left_score",
    label: "Rotary Stability (Left)",
    maxScore: 3,
  },
  {
    key: "rotary_stability_right_score",
    label: "Rotary Stability (Right)",
    maxScore: 3,
  },
];

export default function FMSAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles, performanceSettings } = useTheme();
  const theme = getThemeStyles();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<FMSAssessment[]>([]);
  const [clientName, setClientName] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssessment, setEditingAssessment] =
    useState<FMSAssessment | null>(null);
  const [formData, setFormData] = useState<Partial<FMSAssessment>>({
    assessed_date: new Date().toISOString().split("T")[0],
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    if (user && !authLoading && clientId) {
      loadClientInfo();
      loadAssessments();
    }
  }, [user, authLoading, clientId]);

  const loadClientInfo = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", clientId)
        .single();

      if (profile) {
        setClientName(`${profile.first_name} ${profile.last_name}`);
      }
    } catch (error) {
      console.error("Error loading client info:", error);
    }
  };

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
      alert("Error uploading photos. Please try again.");
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
      alert("Error deleting photo. Please try again.");
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
    if (!score) return "text-slate-400";
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-12 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="fc-btn fc-btn-ghost h-10 w-10">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Movement Screening
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    FMS Assessment
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {clientName || "Client"} — Functional Movement Screen
                  </p>
                </div>
              </div>
              <Button className="fc-btn fc-btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </div>
          </GlassCard>

          {/* Assessments List */}
          {assessments.length > 0 ? (
            <div className="space-y-4">
              {assessments.map((assessment) => {
                const totalScore = assessment.total_score || 0;
                const maxScore = FMS_TESTS.length * 3;
                const percentage = (totalScore / maxScore) * 100;

                return (
                  <GlassCard
                    key={assessment.id}
                    elevation={2}
                    className="fc-glass fc-card rounded-2xl"
                  >
                    <CardHeader className="p-6">
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
                    <CardContent className="p-6 pt-0">
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
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
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
                        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
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
                                className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
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
            <GlassCard elevation={2} className="fc-glass fc-card rounded-2xl">
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>
                  No assessments yet
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  Conduct a Functional Movement Screen assessment for this
                  client
                </p>
                <Button className="fc-btn fc-btn-primary" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Assessment
                </Button>
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
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group"
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
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
