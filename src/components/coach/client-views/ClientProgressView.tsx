"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  Camera,
  Scale,
  Ruler,
  Calendar,
  ClipboardCheck,
} from "lucide-react";

interface ClientProgressViewProps {
  clientId: string;
}

interface CheckIn {
  id: string;
  created_at: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  photos: string[];
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    legs?: number;
  };
}

export default function ClientProgressView({
  clientId,
}: ClientProgressViewProps) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckIns();
  }, [clientId]);

  const loadCheckIns = async () => {
    try {
      // Load from localStorage for now (will integrate with database later)
      const stored = localStorage.getItem(`checkIns_${clientId}`);
      if (stored) {
        setCheckIns(JSON.parse(stored));
      } else {
        setCheckIns([]);
      }
    } catch (error) {
      console.error("Error loading check-ins:", error);
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-40 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Link href={`/coach/clients/${clientId}/fms`}>
          <Button
            variant="outline"
            className="flex items-center gap-2 fc-btn fc-btn-secondary"
          >
            <ClipboardCheck className="w-4 h-4" />
            FMS Assessments
          </Button>
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
          <p className="text-3xl font-bold fc-text-primary">
            {checkIns.length}
          </p>
          <p className="text-sm fc-text-dim">Check-Ins</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
          <p className="text-3xl font-bold fc-text-primary">
            {checkIns.length > 0 && checkIns[0].weight
              ? `${checkIns[0].weight}kg`
              : "-"}
          </p>
          <p className="text-sm fc-text-dim">Current Weight</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
          <p className="text-3xl font-bold fc-text-primary">
            {checkIns.length > 1 &&
            checkIns[0]?.weight &&
            checkIns[checkIns.length - 1]?.weight
              ? `${(
                  (checkIns[checkIns.length - 1]?.weight || 0) -
                  (checkIns[0]?.weight || 0)
                ).toFixed(1)}kg`
              : "-"}
          </p>
          <p className="text-sm fc-text-dim">Total Change</p>
        </div>
      </div>

      {/* Check-Ins List */}
      <div className="space-y-4">
        {checkIns.length === 0 ? (
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl text-center px-6 py-12">
            <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No Check-Ins Yet
            </h3>
            <p className="text-sm fc-text-dim">
              This client hasn't submitted any check-ins yet.
            </p>
          </div>
        ) : (
          checkIns.map((checkIn, index) => (
            <div
              key={checkIn.id}
              className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
            >
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                <div className="fc-icon-tile fc-icon-workouts">
                  <Calendar className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold fc-text-primary">
                      Check-In #{checkIns.length - index}
                    </h4>
                    <span className="text-sm fc-text-subtle">
                      {new Date(checkIn.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {checkIn.weight && (
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
                        <Scale className="w-4 h-4 mb-1 fc-text-workouts" />
                        <p className="text-sm font-semibold fc-text-primary">
                          {checkIn.weight}kg
                        </p>
                        <p className="text-xs fc-text-subtle">Weight</p>
                      </div>
                    )}

                    {checkIn.bodyFat && (
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
                        <TrendingUp className="w-4 h-4 mb-1 fc-text-warning" />
                        <p className="text-sm font-semibold fc-text-primary">
                          {checkIn.bodyFat}%
                        </p>
                        <p className="text-xs fc-text-subtle">Body Fat</p>
                      </div>
                    )}

                    {checkIn.muscleMass && (
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
                        <TrendingUp className="w-4 h-4 mb-1 fc-text-success" />
                        <p className="text-sm font-semibold fc-text-primary">
                          {checkIn.muscleMass}kg
                        </p>
                        <p className="text-xs fc-text-subtle">Muscle</p>
                      </div>
                    )}

                    {checkIn.photos && checkIn.photos.length > 0 && (
                      <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
                        <Camera className="w-4 h-4 mb-1 fc-text-workouts" />
                        <p className="text-sm font-semibold fc-text-primary">
                          {checkIn.photos.length}
                        </p>
                        <p className="text-xs fc-text-subtle">Photos</p>
                      </div>
                    )}
                  </div>

                  {/* Measurements */}
                  {checkIn.measurements &&
                    Object.keys(checkIn.measurements).length > 0 && (
                      <div className="mt-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Ruler className="w-4 h-4 fc-text-workouts" />
                          <span className="text-sm font-semibold fc-text-primary">
                            Measurements
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs fc-text-subtle">
                          {checkIn.measurements.chest && (
                            <span>
                              Chest: {checkIn.measurements.chest}cm
                            </span>
                          )}
                          {checkIn.measurements.waist && (
                            <span>
                              Waist: {checkIn.measurements.waist}cm
                            </span>
                          )}
                          {checkIn.measurements.hips && (
                            <span>
                              Hips: {checkIn.measurements.hips}cm
                            </span>
                          )}
                          {checkIn.measurements.arms && (
                            <span>
                              Arms: {checkIn.measurements.arms}cm
                            </span>
                          )}
                          {checkIn.measurements.legs && (
                            <span>
                              Legs: {checkIn.measurements.legs}cm
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
