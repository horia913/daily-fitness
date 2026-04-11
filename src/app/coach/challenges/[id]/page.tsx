"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle, XCircle, Video, Clock, MoreVertical } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeParticipants, getPendingVideoSubmissions, reviewVideoSubmission, startChallenge, finalizeChallenge, inviteParticipants, updateChallenge, getChallengeScoringCategories, ChallengeVideoSubmission } from "@/lib/challengeService";
import { notifyChallengeInvitation, notifyChallengeStarted } from "@/lib/notificationHelpers";
import { supabase } from "@/lib/supabase";

function CoachChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { getSemanticColor, performanceSettings } = useTheme();
  const { addToast } = useToast();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<ChallengeVideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [coachClients, setCoachClients] = useState<{ id: string; name: string }[]>([]);
  const [inviteSelected, setInviteSelected] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [scoringCategories, setScoringCategories] = useState<{ id: string; category_name: string }[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editMaxParticipants, setEditMaxParticipants] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const challengeDetailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || authLoading || !challengeId) return;
    if (challengeDetailTimeoutRef.current) clearTimeout(challengeDetailTimeoutRef.current);
    challengeDetailTimeoutRef.current = setTimeout(() => {
      challengeDetailTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadChallenge().finally(() => {
      if (challengeDetailTimeoutRef.current) {
        clearTimeout(challengeDetailTimeoutRef.current);
        challengeDetailTimeoutRef.current = null;
      }
    });
    return () => {
      if (challengeDetailTimeoutRef.current) {
        clearTimeout(challengeDetailTimeoutRef.current);
        challengeDetailTimeoutRef.current = null;
      }
    };
  }, [user, authLoading, challengeId]);

  const loadChallenge = async () => {
    setLoading(true);
    try {
      const [challengeData, participantsData, submissionsData] = await Promise.all([
        getChallengeDetails(challengeId),
        getChallengeParticipants(challengeId),
        getPendingVideoSubmissions(challengeId),
      ]);

      setChallenge(challengeData);
      setParticipants(participantsData);
      setPendingSubmissions(submissionsData);

      const clientIds = [...new Set((participantsData || []).map((p: any) => p.client_id).filter(Boolean))];
      if (clientIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", clientIds);
        const names: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Client";
        });
        setProfileNames(names);
      }
      if (user?.id) {
        const { data: clients } = await supabase.from("clients").select("client_id").eq("coach_id", user.id).eq("status", "active");
        const ids = (clients || []).map((c: any) => c.client_id).filter(Boolean);
        if (ids.length) {
          const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
          setCoachClients((profiles || []).map((p: any) => ({ id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Client" })));
        }
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = async () => {
    if (!challengeId || !challenge) return;
    setStarting(true);
    try {
      const ok = await startChallenge(challengeId);
      if (ok) {
        try {
          const clientIds = participants.map((p: any) => p.client_id).filter(Boolean);
          if (clientIds.length) await notifyChallengeStarted(clientIds, challenge.name);
        } catch (_) {}
        addToast({ title: "Challenge started.", variant: "success" });
        loadChallenge();
      } else {
        addToast({ title: "Failed to start challenge.", variant: "destructive" });
      }
    } finally {
      setStarting(false);
    }
  };

  const handleEndChallenge = async () => {
    if (!challengeId) return;
    setFinalizing(true);
    try {
      const result = await finalizeChallenge(challengeId);
      setShowEndConfirm(false);
      if (result.success) {
        try {
          await fetch("/api/coach/challenges/notify-finalized", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challengeId }),
          });
        } catch (_) {}
        addToast({ title: "Challenge ended. Rankings finalized.", variant: "success" });
        loadChallenge();
      } else {
        addToast({ title: "Failed to end challenge.", variant: "destructive" });
      }
    } finally {
      setFinalizing(false);
    }
  };

  const openEditModal = () => {
    setEditDescription(challenge?.description ?? "");
    setEditEndDate(challenge?.end_date ?? "");
    setEditMaxParticipants(challenge?.max_participants != null ? String(challenge.max_participants) : "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!challengeId) return;
    setSavingEdit(true);
    try {
      const payload: any = { description: editDescription || null, end_date: editEndDate || undefined, max_participants: editMaxParticipants ? parseInt(editMaxParticipants, 10) : null };
      const ok = await updateChallenge(challengeId, payload);
      if (ok) {
        addToast({ title: "Challenge updated.", variant: "success" });
        setShowEditModal(false);
        loadChallenge();
      } else {
        addToast({ title: "Failed to update.", variant: "destructive" });
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteSelected.length) return;
    setInviting(true);
    try {
      const ok = await inviteParticipants(challengeId, inviteSelected);
      if (ok) {
        addToast({ title: `Invited ${inviteSelected.length} client(s).`, variant: "success" });
        setInviteSelected([]);
        loadChallenge();
      } else {
        addToast({ title: "Failed to send invites.", variant: "destructive" });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!user) return;

    const submission = pendingSubmissions.find((s) => s.id === submissionId);
    const categoryName = submission ? (scoringCategories.find((c) => c.id === submission.scoring_category_id)?.category_name ?? "Submission") : "Submission";

    setReviewing(submissionId);
    try {
      const notes = reviewNotes[submissionId] || '';
      const success = await reviewVideoSubmission(submissionId, user.id, status, notes);

      if (success) {
        try {
          await fetch("/api/coach/challenges/notify-video-reviewed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId, status, categoryName }),
          });
        } catch (_) {}
        const updated = await getPendingVideoSubmissions(challengeId);
        setPendingSubmissions(updated);
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[submissionId];
          return next;
        });
      } else {
        addToast({ title: 'Failed to review submission. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error reviewing submission:', error);
      addToast({ title: 'Error reviewing submission. Please try again.', variant: 'destructive' });
    } finally {
      setReviewing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-[color:var(--fc-glass-highlight)] rounded-2xl"></div>
              <div className="h-96 bg-[color:var(--fc-glass-highlight)] rounded-2xl"></div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!challenge) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <GlassCard elevation={2} className="p-12">
              <div className="text-center">
                <p className="text-[color:var(--fc-text-primary)]">Challenge not found</p>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 30;
  const today = new Date();
  const currentDay = Math.min(Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))), totalDays);

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 min-h-screen pb-40">
        <header className="sticky top-0 z-40 fc-glass border-b border-[color:var(--fc-glass-border)] px-6 py-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href="/coach/challenges">
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl fc-glass border border-[color:var(--fc-glass-border)]">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight fc-text-primary">Challenge Detail</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${challenge.status === "active" ? "bg-emerald-500 animate-pulse" : challenge.status === "completed" ? "bg-blue-500" : "bg-gray-500"}`} />
                <span className="text-sm fc-text-dim font-medium uppercase tracking-wider">{challenge.status}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {challenge.status === "draft" && (
              <Button onClick={handleStartChallenge} disabled={starting} className="fc-btn fc-btn-primary rounded-xl">
                {starting ? "Starting…" : "Start Challenge"}
              </Button>
            )}
            {challenge.status === "active" && (
              <Button onClick={() => setShowEndConfirm(true)} variant="outline" className="rounded-xl border-red-500/50 text-red-600">
                End Challenge
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl" onClick={openEditModal} title="Edit">
              <MoreVertical className="w-6 h-6 fc-text-dim" />
            </Button>
          </div>
        </header>

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="fc-card-shell p-6 rounded-2xl max-w-md w-full border border-[color:var(--fc-glass-border)]">
              <h3 className="text-lg font-bold fc-text-primary mb-4">Edit challenge</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium fc-text-primary block mb-1">Description</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] p-2 text-sm min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium fc-text-primary block mb-1">End date</label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] p-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium fc-text-primary block mb-1">Max participants (optional)</label>
                  <input type="number" min={0} value={editMaxParticipants} onChange={(e) => setEditMaxParticipants(e.target.value)} className="w-full rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] p-2 text-sm" placeholder="Unlimited" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="fc-card-shell p-6 rounded-2xl max-w-sm w-full border border-[color:var(--fc-glass-border)]">
              <p className="text-[color:var(--fc-text-primary)] font-semibold mb-2">End this challenge?</p>
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-4">This will finalize rankings and announce results. This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
                <Button onClick={handleEndChallenge} disabled={finalizing} className="bg-red-600 hover:bg-red-700">{finalizing ? "Ending…" : "End Challenge"}</Button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          <GlassCard elevation={2} className="fc-card-shell p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold fc-text-primary">{challenge.name}</h2>
              <span className="fc-glass-soft px-3 py-1 rounded-lg text-sm font-semibold border border-[color:var(--fc-glass-border)]">
                Day {currentDay} / {totalDays}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)]">
                <div className="text-sm fc-text-dim mb-1">Participants</div>
                <div className="text-xl font-bold font-mono fc-text-primary">{participants.length}</div>
              </div>
              <div className="p-3 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)]">
                <div className="text-sm fc-text-dim mb-1">Date range</div>
                <div className="text-sm font-semibold fc-text-primary">
                  {start.toLocaleDateString()} – {end.toLocaleDateString()}
                </div>
              </div>
            </div>
            {challenge.status === "active" && end < today && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm font-semibold text-amber-600">Challenge end date has passed. Finalize results to close this challenge.</p>
                <Button onClick={() => setShowEndConfirm(true)} size="sm" className="mt-2">Finalize results</Button>
              </div>
            )}
            {challenge.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold fc-text-primary uppercase tracking-widest flex items-center gap-2">Challenge Rules</h3>
                <p className="text-sm fc-text-dim leading-relaxed">{challenge.description}</p>
              </div>
            )}
          </GlassCard>

          {challenge.is_public === false && (challenge.status === "draft" || challenge.status === "active") && (
            <GlassCard elevation={2} className="p-6">
              <h3 className="text-lg font-bold fc-text-primary mb-2">Invite clients</h3>
              <p className="text-sm fc-text-dim mb-4">Select clients to invite to this private challenge.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {coachClients.filter((c) => !participants.some((p: any) => p.client_id === c.id)).map((client) => (
                  <label key={client.id} className="flex items-center gap-2 fc-glass-soft px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteSelected.includes(client.id)}
                      onChange={(e) => setInviteSelected((prev) => e.target.checked ? [...prev, client.id] : prev.filter((id) => id !== client.id))}
                      className="rounded"
                    />
                    <span className="text-sm fc-text-primary">{client.name}</span>
                  </label>
                ))}
                {coachClients.filter((c) => !participants.some((p: any) => p.client_id === c.id)).length === 0 && (
                  <p className="text-sm fc-text-subtle">All your clients are already invited or joined.</p>
                )}
              </div>
              <Button onClick={handleInvite} disabled={inviting || !inviteSelected.length}>
                {inviting ? "Inviting…" : `Invite ${inviteSelected.length} selected`}
              </Button>
            </GlassCard>
          )}

        {/* Pending Video Reviews */}
        {pendingSubmissions.length > 0 && (
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("warning").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("warning").primary}30`,
                }}
              >
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                  Pending Reviews
                </h2>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  {pendingSubmissions.length} video{pendingSubmissions.length !== 1 ? 's' : ''} awaiting review
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface-muted)] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                        <span className="text-xs text-[color:var(--fc-text-dim)]">
                          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {submission.claimed_weight && (
                        <p className="text-sm mb-1 text-[color:var(--fc-text-primary)]">
                          Claimed: {submission.claimed_weight} kg
                          {submission.claimed_reps && ` × ${submission.claimed_reps} reps`}
                        </p>
                      )}

                      <div className="mt-3">
                        <textarea
                          placeholder="Review notes (optional)"
                          value={reviewNotes[submission.id] || ''}
                          onChange={(e) => setReviewNotes((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                          className="w-full rounded-xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface)] p-2 text-sm text-[color:var(--fc-text-primary)] mb-2"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReview(submission.id, 'approved')}
                            disabled={reviewing === submission.id}
                            style={{
                              background: getSemanticColor("success").gradient,
                              color: "#fff",
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(submission.id, 'rejected')}
                            disabled={reviewing === submission.id}
                            style={{
                              borderColor: getSemanticColor("critical").primary,
                              color: getSemanticColor("critical").primary,
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          {submission.video_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(submission.video_url, '_blank')}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              View Video
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Participants */}
        <GlassCard elevation={2} className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                Participants
              </h2>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                {participants.length} enrolled
              </p>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-[color:var(--fc-text-subtle)]" />
              <p className="text-lg font-semibold text-[color:var(--fc-text-dim)]">
                No participants yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant: any, index: number) => (
                <div
                  key={participant.id}
                  className="rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface-muted)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]">
                        {participant.final_rank ?? index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-[color:var(--fc-text-primary)]">
                          {profileNames[participant.client_id] ?? "Participant"}
                        </p>
                        {participant.status === "invited" && (
                          <p className="text-xs text-amber-600">Invited</p>
                        )}
                        {participant.selected_track && (
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
                            {participant.selected_track === "fat_loss" ? "Fat Loss Track" : "Muscle Gain Track"}
                          </p>
                        )}
                        <p className="text-xs mt-1 text-[color:var(--fc-text-subtle)]">
                          Joined {new Date(participant.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: getSemanticColor("energy").primary }}>
                        {participant.total_score ?? 0}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        </main>
      </div>
    </AnimatedBackground>
  );
}

export default function CoachChallengeDetailPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachChallengeDetailContent />
    </ProtectedRoute>
  );
}

