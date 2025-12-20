"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { BookOpen, ArrowLeft, Info } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

function CreateProgramContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [targetAudience, setTargetAudience] =
    useState<string>("general_fitness");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        difficulty_level: difficulty,
        duration_weeks: durationWeeks,
        target_audience: targetAudience,
        coach_id: user.id,
        is_active: true,
        is_public: false,
      };
      const created = await WorkoutTemplateService.createProgram(payload);
      if (created?.id) {
        window.location.href = `/coach/programs/${created.id}/edit`;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/coach/programs")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>

          {/* Header */}
          <GlassCard elevation={3} className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Create Training Program
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Build a structured multi-week training program for your clients
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Form */}
          <GlassCard elevation={2} className="p-6">
            <div className="space-y-6">
              {/* Program Name */}
              <div>
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Program Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 8-Week Strength Builder"
                  className="text-base"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the program goals, structure, and who it's designed for..."
                  rows={4}
                  className="text-base resize-none"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Difficulty & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Difficulty Level
                  </label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as any)}
                  >
                    <SelectTrigger
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Duration (Weeks)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={durationWeeks}
                    onChange={(e) =>
                      setDurationWeeks(parseInt(e.target.value || "1", 10))
                    }
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Target Audience
                </label>
                <Select
                  value={targetAudience}
                  onValueChange={(v) => setTargetAudience(v)}
                >
                  <SelectTrigger
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_fitness">
                      General Fitness
                    </SelectItem>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="athletic_performance">
                      Athletic Performance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="flex items-center justify-end gap-3 mt-8 pt-6"
              style={{
                borderTop: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/coach/programs")}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !name.trim()}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                  opacity: saving || !name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </GlassCard>

          {/* Info Card */}
          <GlassCard elevation={1} className="p-4">
            <div className="flex items-start gap-3">
              <Info
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{
                  color: getSemanticColor("trust").primary,
                }}
              />
              <div>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  After creating the program, you'll be able to configure the
                  weekly schedule, assign workout templates to specific days, and
                  set up progression rules for each week.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function CreateProgramPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CreateProgramContent />
    </ProtectedRoute>
  );
}

