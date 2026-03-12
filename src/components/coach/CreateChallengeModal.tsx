"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { createChallenge, type CreateChallengePayload, type ScoringMethod } from "@/lib/challengeService";
import { supabase } from "@/lib/supabase";

const SCORING_METHODS: { value: ScoringMethod; label: string }[] = [
  { value: "max_weight", label: "Max weight" },
  { value: "max_reps", label: "Max reps" },
  { value: "max_volume", label: "Max volume (weight × reps)" },
  { value: "completion_count", label: "Completion count" },
  { value: "body_recomp_percentage", label: "Body recomp %" },
  { value: "custom", label: "Custom" },
  { value: "pr_improvement", label: "PR improvement" },
  { value: "tonnage", label: "Tonnage" },
  { value: "adherence_percentage", label: "Adherence %" },
];

interface ScoringCategoryRow {
  id: string;
  category_name: string;
  exercise_id: string;
  scoring_method: ScoringMethod;
  weight_percentage: number;
}

interface CreateChallengeModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSuccess: (challengeId: string) => void;
  coachId: string;
}

export function CreateChallengeModal({
  open,
  onClose,
  onCreateSuccess,
  coachId,
}: CreateChallengeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState<"coach_challenge" | "recomp_challenge">("coach_challenge");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [isPublic, setIsPublic] = useState(true);
  const [requiresVideoProof, setRequiresVideoProof] = useState(false);
  const [recompTrack, setRecompTrack] = useState<"fat_loss" | "muscle_gain" | "both">("both");
  const [programId, setProgramId] = useState<string>("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [categories, setCategories] = useState<ScoringCategoryRow[]>([
    { id: crypto.randomUUID(), category_name: "", exercise_id: "", scoring_method: "max_weight", weight_percentage: 100 },
  ]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && coachId) {
      fetch("/api/coach/programs?filter=all")
        .then((r) => r.json())
        .then((d) => setPrograms(d.programs || []))
        .catch(() => setPrograms([]));
      supabase
        .from("exercises")
        .select("id, name")
        .eq("coach_id", coachId)
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => setExercises(data || []));
    }
  }, [open, coachId]);

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category_name: "", exercise_id: "", scoring_method: "max_weight", weight_percentage: 0 },
    ]);
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (id: string, field: keyof ScoringCategoryRow, value: string | number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }
    const totalWeight = categories.reduce((s, c) => s + (Number(c.weight_percentage) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError("Scoring category weight percentages must sum to 100%.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateChallengePayload = {
        created_by: coachId,
        name: name.trim(),
        description: description.trim() || null,
        challenge_type: challengeType,
        start_date: startDate,
        end_date: endDate,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        is_public: isPublic,
        requires_video_proof: requiresVideoProof,
        recomp_track: challengeType === "recomp_challenge" ? recompTrack : null,
        program_id: programId || null,
        reward_description: rewardDescription.trim() || null,
        reward_value: rewardValue.trim() || null,
        scoring_categories: categories.map((c) => ({
          category_name: c.category_name.trim() || "Category",
          exercise_id: c.exercise_id || null,
          scoring_method: c.scoring_method,
          weight_percentage: Number(c.weight_percentage) || 0,
        })),
      };
      const challenge = await createChallenge(payload);
      if (challenge) {
        if (payload.is_public) {
          try {
            await fetch("/api/coach/challenges/notify-created", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ challengeId: challenge.id }),
            });
          } catch (_) {}
        }
        onClose();
        onCreateSuccess(challenge.id);
      } else {
        setError("Failed to create challenge.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create challenge.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto fc-glass fc-card border border-[color:var(--fc-glass-border)]">
        <DialogHeader>
          <DialogTitle className="fc-text-primary">Create Challenge</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <Label htmlFor="name">Name (required)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Challenge name"
              variant="fc"
            />
          </div>
          <div className="grid gap-4">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rules and info"
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-4">
              <Label>Challenge type</Label>
              <Select value={challengeType} onValueChange={(v: "coach_challenge" | "recomp_challenge") => setChallengeType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach_challenge">Coach challenge</SelectItem>
                  <SelectItem value="recomp_challenge">Recomp challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {challengeType === "recomp_challenge" && (
              <div className="grid gap-4">
                <Label>Recomp track</Label>
                <Select value={recompTrack} onValueChange={(v: "fat_loss" | "muscle_gain" | "both") => setRecompTrack(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fat_loss">Fat loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle gain</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-4">
              <Label htmlFor="start_date">Start date (required)</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                variant="fc"
              />
            </div>
            <div className="grid gap-4">
              <Label htmlFor="end_date">End date (required)</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                variant="fc"
              />
            </div>
          </div>
          <div className="grid gap-4">
            <Label htmlFor="max_participants">Max participants (optional)</Label>
            <Input
              id="max_participants"
              type="number"
              min={0}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder="Unlimited"
              variant="fc"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_public">Public (all clients can see and join)</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="requires_video">Requires video proof</Label>
            <Switch checked={requiresVideoProof} onCheckedChange={setRequiresVideoProof} />
          </div>
          <div className="grid gap-4">
            <Label>Linked program (optional)</Label>
            <Select value={programId || "none"} onValueChange={(v) => setProgramId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Scoring categories (weights must sum to 100%)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Add category
              </Button>
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                <Input
                  placeholder="Category name"
                  value={cat.category_name}
                  onChange={(e) => updateCategory(cat.id, "category_name", e.target.value)}
                  className="flex-1 min-w-[120px]"
                  variant="fc"
                />
                <Select
                  value={cat.exercise_id || "none"}
                  onValueChange={(v) => updateCategory(cat.id, "exercise_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No exercise</SelectItem>
                    {exercises.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={cat.scoring_method}
                  onValueChange={(v) => updateCategory(cat.id, "scoring_method", v as ScoringMethod)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORING_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="%"
                  value={cat.weight_percentage || ""}
                  onChange={(e) => updateCategory(cat.id, "weight_percentage", e.target.value)}
                  className="w-16"
                  variant="fc"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCategory(cat.id)} disabled={categories.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid gap-4">
            <Label htmlFor="reward_desc">Reward description (optional)</Label>
            <Input
              id="reward_desc"
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="e.g. Free month of coaching"
              variant="fc"
            />
          </div>
          <div className="grid gap-4">
            <Label htmlFor="reward_value">Reward value (optional)</Label>
            <Input
              id="reward_value"
              value={rewardValue}
              onChange={(e) => setRewardValue(e.target.value)}
              placeholder="e.g. $100"
              variant="fc"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create challenge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
