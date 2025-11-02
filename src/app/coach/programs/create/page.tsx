"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
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

export default function CreateProgramPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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
      };
      const created = await WorkoutTemplateService.createProgram(payload);
      if (created?.id) {
        window.location.href = `/coach/programs/${created.id}`;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <h1 className={`text-xl font-bold ${theme.text} mb-4`}>
              Create Program
            </h1>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Program Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter program name..."
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the program goals and structure..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Difficulty Level
                  </label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as any)}
                  >
                    <SelectTrigger>
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
                  <label className="text-sm font-medium block mb-2">
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
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  Target Audience
                </label>
                <Select
                  value={targetAudience}
                  onValueChange={(v) => setTargetAudience(v)}
                >
                  <SelectTrigger>
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

              {/* is_public removed from schema - no control */}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/coach/programs")}
              >
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving || !name.trim()}>
                {saving ? "Saving..." : "Create Program"}
              </Button>
            </div>
          </div>

          <div className={`${theme.card} rounded-2xl p-4`}>
            <p className={`${theme.textSecondary} text-sm`}>
              Note: This is a minimal create flow. Weekly schedule and
              progression rules can be configured after creation on the edit
              page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
