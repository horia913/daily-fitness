"use client";

import { useState, useEffect } from "react";
import {
  getPhotoTimeline,
  getComparisonPhotos,
  ProgressPhoto,
} from "@/lib/progressPhotoService";

interface ClientProgressPhotosSectionProps {
  clientId: string;
}

export default function ClientProgressPhotosSection({ clientId }: ClientProgressPhotosSectionProps) {
  const [loading, setLoading] = useState(true);
  const [photoTimeline, setPhotoTimeline] = useState<
    { date: string; types: string[]; weight_kg?: number | null }[]
  >([]);
  const [comparisonPhotos, setComparisonPhotos] = useState<{
    before: ProgressPhoto[];
    after: ProgressPhoto[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const timeline = await getPhotoTimeline(clientId);
      setPhotoTimeline(timeline);
      if (timeline.length >= 2) {
        const photos = await getComparisonPhotos(
          clientId,
          timeline[timeline.length - 1].date,
          timeline[0].date
        );
        setComparisonPhotos(photos);
      } else {
        setComparisonPhotos(null);
      }
    } catch (error) {
      console.error("Error loading progress photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-64 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comparisonPhotos && (comparisonPhotos.before.length > 0 || comparisonPhotos.after.length > 0) && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Progress photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm fc-text-subtle mb-2">Previous</p>
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as const).map((type) => {
                  const photo = comparisonPhotos.before.find((p) => p.photo_type === type);
                  return (
                    <div key={type}>
                      <p className="text-xs fc-text-subtle capitalize mb-1">{type}</p>
                      {photo ? (
                        <img
                          src={photo.photo_url}
                          alt={type}
                          className="w-full rounded-lg border border-[color:var(--fc-glass-border)] aspect-[3/4] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-[color:var(--fc-glass-border)] fc-text-subtle text-xs flex items-center justify-center">
                          No {type}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-sm fc-text-subtle mb-2">Current</p>
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as const).map((type) => {
                  const photo = comparisonPhotos.after.find((p) => p.photo_type === type);
                  return (
                    <div key={type}>
                      <p className="text-xs fc-text-subtle capitalize mb-1">{type}</p>
                      {photo ? (
                        <img
                          src={photo.photo_url}
                          alt={type}
                          className="w-full rounded-lg border border-[color:var(--fc-glass-border)] aspect-[3/4] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-[color:var(--fc-glass-border)] fc-text-subtle text-xs flex items-center justify-center">
                          No {type}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {photoTimeline.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Photo timeline</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {photoTimeline.map((entry) => (
              <div
                key={entry.date}
                className="fc-glass-soft rounded-xl p-3 flex justify-between items-center text-sm"
              >
                <span className="fc-text-primary">
                  {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="fc-text-subtle">
                  {entry.types.join(", ")}
                  {entry.weight_kg != null && ` · ${entry.weight_kg} kg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!comparisonPhotos && photoTimeline.length === 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <p className="text-sm fc-text-subtle">
            No progress photos yet. Photos are uploaded by the client from their check-in flow.
          </p>
        </div>
      )}
    </div>
  );
}
