"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ArrowLeft,
  Camera,
  X,
  Save,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { isFromCheckIns, progressBackHref } from "@/lib/clientProgressNav";
import { useToast } from "@/components/ui/toast-provider";
import {
  uploadPhoto,
  getPhotosForDate,
  getPhotoTimeline,
  getComparisonPhotos,
  getLatestWeightForPhoto,
  deletePhoto,
  ProgressPhoto,
} from "@/lib/progressPhotoService";

type PhotoType = "front" | "side" | "back";

interface PhotoSlot {
  type: PhotoType;
  label: string;
  file: File | null;
  preview: string | null;
  existingPhoto: ProgressPhoto | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ProgressPhotosPageContent() {
  const searchParams = useSearchParams();
  const fromCheckIns = isFromCheckIns(searchParams);
  const { addToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [timeline, setTimeline] = useState<
    { date: string; types: string[]; weight_kg?: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDate1, setComparisonDate1] = useState<string | null>(null);
  const [comparisonDate2, setComparisonDate2] = useState<string | null>(null);
  const [comparisonPhotos, setComparisonPhotos] = useState<{
    before: ProgressPhoto[];
    after: ProgressPhoto[];
  } | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([
    { type: "front", label: "Front", file: null, preview: null, existingPhoto: null },
    { type: "side", label: "Side", file: null, preview: null, existingPhoto: null },
    { type: "back", label: "Back", file: null, preview: null, existingPhoto: null },
  ]);

  const loadTimeline = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getPhotoTimeline(user.id);
      setTimeline(data);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadTodayPhotos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const photos = await getPhotosForDate(user.id, today);
      setPhotoSlots((slots) =>
        slots.map((slot) => {
          const existing = photos.find((p) => p.photo_type === slot.type);
          return {
            ...slot,
            existingPhoto: existing || null,
            preview: existing?.photo_url || null,
          };
        })
      );
    } catch (error) {
      console.error("Error loading today's photos:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, today]);

  const loadLatestWeight = useCallback(async () => {
    if (!user?.id) return;
    try {
      const latestWeight = await getLatestWeightForPhoto(user.id);
      if (latestWeight != null) {
        setWeight(latestWeight.toString());
      }
    } catch (error) {
      console.error("Error loading latest weight:", error);
    }
  }, [user?.id]);

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
    Promise.all([loadTimeline(), loadTodayPhotos(), loadLatestWeight()]).finally(() => {
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
  }, [user, authLoading, loadTimeline, loadTodayPhotos, loadLatestWeight]);


  const loadDatePhotos = async (date: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const photos = await getPhotosForDate(user.id, date);
      setSelectedPhotos(photos);
      setSelectedDate(date);
    } catch (error) {
      console.error("Error loading date photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (
    type: PhotoType,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast({ title: "Please select an image file", variant: "warning" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoSlots((slots) =>
        slots.map((slot) =>
          slot.type === type
            ? {
                ...slot,
                file,
                preview: reader.result as string,
                existingPhoto: null, // Clear existing when new photo selected
              }
            : slot
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (type: PhotoType) => {
    setPhotoSlots((slots) =>
      slots.map((slot) =>
        slot.type === type
          ? { ...slot, file: null, preview: null, existingPhoto: null }
          : slot
      )
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const photosToUpload = photoSlots.filter(
      (slot) => slot.file !== null || slot.existingPhoto !== null
    );

    if (photosToUpload.length === 0) {
      addToast({ title: "Please take at least one photo", variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const uploadPromises = photoSlots
        .filter((slot) => slot.file !== null)
        .map((slot) =>
          uploadPhoto(user.id, {
            photo_date: today,
            photo_type: slot.type,
            file: slot.file!,
            weight_kg: weight ? parseFloat(weight) : undefined,
            notes: notes.trim() || undefined,
          })
        );

      await Promise.all(uploadPromises);

      // Reload timeline and today's photos
      await Promise.all([loadTimeline(), loadTodayPhotos()]);

      // Reset form
      setPhotoSlots((slots) =>
        slots.map((slot) => ({
          ...slot,
          file: null,
          preview: slot.existingPhoto?.photo_url || null,
        }))
      );
      setNotes("");
    } catch (error) {
      console.error("Error saving photos:", error);
      addToast({ title: "Failed to save photos. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user?.id || !confirm("Delete this photo?")) return;
    try {
      await deletePhoto(photoId, user.id);
      await loadTodayPhotos();
      await loadTimeline();
      if (selectedDate) {
        await loadDatePhotos(selectedDate);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      addToast({ title: "Failed to delete photo", variant: "destructive" });
    }
  };

  const startComparison = () => {
    if (timeline.length < 2) {
      addToast({ title: "Need at least 2 photo dates to compare", variant: "warning" });
      return;
    }
    setComparisonMode(true);
    setComparisonDate1(timeline[timeline.length - 1].date); // Earliest
    setComparisonDate2(timeline[0].date); // Latest
  };

  const loadComparison = useCallback(async () => {
    if (!comparisonDate1 || !comparisonDate2 || !user?.id) return;
    try {
      const photos = await getComparisonPhotos(
        user.id,
        comparisonDate1,
        comparisonDate2
      );
      setComparisonPhotos(photos);
    } catch (error) {
      console.error("Error loading comparison:", error);
    }
  }, [comparisonDate1, comparisonDate2, user?.id]);

  useEffect(() => {
    if (comparisonMode && comparisonDate1 && comparisonDate2 && user?.id) {
      loadComparison();
    }
  }, [comparisonMode, comparisonDate1, comparisonDate2, user?.id, loadComparison]);

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 fc-page">
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
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 fc-page">
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-36 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (comparisonMode) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
            <div className="mb-4 border-b border-[color:var(--fc-glass-border)] pb-3">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <h1 className="text-lg font-semibold fc-text-primary">Photo comparison</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm fc-text-subtle">Before:</label>
                    <select
                      value={comparisonDate1 || ""}
                      onChange={(e) => setComparisonDate1(e.target.value)}
                      className="px-3 py-2 rounded-lg fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] text-sm"
                    >
                      {timeline.map((entry) => (
                        <option key={entry.date} value={entry.date}>
                          {formatDate(entry.date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm fc-text-subtle">After:</label>
                    <select
                      value={comparisonDate2 || ""}
                      onChange={(e) => setComparisonDate2(e.target.value)}
                      className="px-3 py-2 rounded-lg fc-glass-soft fc-text-primary border border-[color:var(--fc-glass-border)] text-sm"
                    >
                      {timeline.map((entry) => (
                        <option key={entry.date} value={entry.date}>
                          {formatDate(entry.date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setComparisonMode(false);
                      setComparisonPhotos(null);
                    }}
                    className="fc-btn fc-btn-ghost"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {comparisonPhotos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <h3 className="text-lg font-semibold fc-text-primary mb-4">
                    {formatDate(comparisonDate1!)}
                    {comparisonPhotos.before[0]?.weight_kg != null && (
                      <span className="text-sm font-normal fc-text-subtle ml-2">
                        ({comparisonPhotos.before[0].weight_kg.toFixed(1)} kg)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {(["front", "side", "back"] as PhotoType[]).map((type) => {
                      const photo = comparisonPhotos.before.find(
                        (p) => p.photo_type === type
                      );
                      return (
                        <div key={type}>
                          <p className="text-sm font-medium fc-text-subtle mb-2 capitalize">
                            {type}
                          </p>
                          {photo ? (
                            <img
                              src={photo.photo_url}
                              alt={`${type} view`}
                              className="w-full rounded-xl border border-[color:var(--fc-glass-border)] cursor-pointer"
                              onClick={() => setFullscreenPhoto(photo.photo_url)}
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle">
                              No {type} photo
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-glass-border)]">
                  <h3 className="text-lg font-semibold fc-text-primary mb-4">
                    {formatDate(comparisonDate2!)}
                    {comparisonPhotos.after[0]?.weight_kg != null && (
                      <span className="text-sm font-normal fc-text-subtle ml-2">
                        ({comparisonPhotos.after[0].weight_kg.toFixed(1)} kg)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {(["front", "side", "back"] as PhotoType[]).map((type) => {
                      const photo = comparisonPhotos.after.find(
                        (p) => p.photo_type === type
                      );
                      return (
                        <div key={type}>
                          <p className="text-sm font-medium fc-text-subtle mb-2 capitalize">
                            {type}
                          </p>
                          {photo ? (
                            <img
                              src={photo.photo_url}
                              alt={`${type} view`}
                              className="w-full rounded-xl border border-[color:var(--fc-glass-border)] cursor-pointer"
                              onClick={() => setFullscreenPhoto(photo.photo_url)}
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle">
                              No {type} photo
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="fc-surface p-12 rounded-2xl border border-[color:var(--fc-glass-border)] text-center">
                <div className="animate-pulse">
                  <div className="h-64 bg-[color:var(--fc-glass-highlight)] rounded-xl" />
                </div>
              </div>
            )}
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 fc-page">
          {/* Header — compact */}
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
              <h1 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Progress Photos</h1>
              <p className="text-sm text-[color:var(--fc-text-dim)]">Log and compare over time</p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-4 space-y-3 border-t border-[color:var(--fc-glass-border)] pt-3">
            <h2 className="text-base font-semibold fc-text-primary">Take photos</h2>

            <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
              {photoSlots.map((slot) => (
                <div key={slot.type}>
                  <label className="mb-1 block text-xs font-medium capitalize fc-text-primary">
                    {slot.label}
                  </label>
                  <div className="relative h-28 overflow-hidden rounded-lg border border-dashed border-[color:var(--fc-glass-border)] sm:h-32">
                    {slot.preview ? (
                      <>
                        <img
                          src={slot.preview}
                          alt={`${slot.label} view`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer fc-btn fc-btn-primary px-4 py-2 rounded-lg text-sm">
                            Retake
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoSelect(slot.type, e)}
                            />
                          </label>
                          {slot.existingPhoto && (
                            <button
                              onClick={() => handleDeletePhoto(slot.existingPhoto!.id)}
                              className="fc-btn fc-btn-ghost px-4 py-2 rounded-lg text-sm text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 px-1 fc-text-subtle transition-colors hover:fc-text-primary">
                        <Camera className="h-6 w-6" />
                        <span className="text-center text-xs font-medium">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoSelect(slot.type, e)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium fc-text-primary">
                  Weight (kg) — optional
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="From latest log"
                  className="w-full rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm fc-glass-soft fc-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium fc-text-primary">
                  Notes — optional
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes"
                  className="w-full rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm fc-glass-soft fc-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !photoSlots.some((s) => s.file || s.existingPhoto)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold fc-btn fc-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Photos
                </>
              )}
            </button>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-3 border-t border-[color:var(--fc-glass-border)] pt-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold fc-text-primary">Timeline</h2>
                {timeline.length >= 2 && (
                  <button
                    type="button"
                    onClick={startComparison}
                    className="fc-btn fc-btn-secondary text-sm"
                  >
                    Compare
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {timeline.map((entry) => {
                  const photos = selectedDate === entry.date ? selectedPhotos : [];
                  const isExpanded = selectedDate === entry.date;

                  return (
                    <div
                      key={entry.date}
                      className="overflow-hidden rounded-lg border border-[color:var(--fc-glass-border)]/80"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isExpanded
                            ? setSelectedDate(null)
                            : loadDatePhotos(entry.date)
                        }
                        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-[color:var(--fc-glass-highlight)]/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <p className="text-sm font-semibold fc-text-primary">
                              {formatDate(entry.date)}
                            </p>
                            <p className="text-xs fc-text-subtle">
                              {entry.types.length} photo{entry.types.length !== 1 ? "s" : ""}
                              {entry.weight_kg != null &&
                                ` · ${entry.weight_kg.toFixed(1)} kg`}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 fc-text-subtle transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 border-t border-[color:var(--fc-glass-border)]/60 p-2 pt-2">
                          {(["front", "side", "back"] as PhotoType[]).map((type) => {
                            const photo = photos.find((p) => p.photo_type === type);
                            return (
                              <div key={type}>
                                <p className="text-xs font-medium fc-text-subtle mb-2 capitalize">
                                  {type}
                                </p>
                                {photo ? (
                                  <div className="relative group">
                                    <img
                                      src={photo.photo_url}
                                      alt={`${type} view`}
                                      className="w-full rounded-lg border border-[color:var(--fc-glass-border)] cursor-pointer"
                                      onClick={() => setFullscreenPhoto(photo.photo_url)}
                                    />
                                    <button
                                      onClick={() => handleDeletePhoto(photo.id)}
                                      className="absolute top-2 right-2 p-2 rounded-lg fc-glass bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle text-xs">
                                    No {type}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Photo Modal */}
        {fullscreenPhoto && (
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setFullscreenPhoto(null)}
          >
            <button
              onClick={() => setFullscreenPhoto(null)}
              className="absolute top-4 right-4 p-3 rounded-full fc-glass text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullscreenPhoto}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

export default function ProgressPhotosPage() {
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
      <ProgressPhotosPageContent />
    </Suspense>
  );
}
