"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle, XCircle, Video, Clock, MoreVertical } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeParticipants, getPendingVideoSubmissions, reviewVideoSubmission, ChallengeVideoSubmission } from "@/lib/challengeService";
import { supabase } from "@/lib/supabase";

function CoachChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { getSemanticColor, performanceSettings } = useTheme();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<ChallengeVideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

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
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!user) return;

    setReviewing(submissionId);
    try {
      const notes = reviewNotes[submissionId] || '';
      const success = await reviewVideoSubmission(submissionId, user.id, status, notes);
      
      if (success) {
        // Reload pending submissions
        const updated = await getPendingVideoSubmissions(challengeId);
        setPendingSubmissions(updated);
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[submissionId];
          return next;
        });
      } else {
        alert('Failed to review submission. Please try again.');
      }
    } catch (error) {
      console.error('Error reviewing submission:', error);
      alert('Error reviewing submission. Please try again.');
    } finally {
      setReviewing(null);
    }
  };

  const getClientName = async (clientId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', clientId)
        .maybeSingle();
      
      if (data) {
        return `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Client';
      }
      return 'Client';
    } catch {
      return 'Client';
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm fc-text-dim font-medium uppercase tracking-wider">Active Challenge</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl">
            <MoreVertical className="w-6 h-6 fc-text-dim" />
          </Button>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 rounded-2xl">
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
            {challenge.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold fc-text-primary uppercase tracking-widest flex items-center gap-2">Challenge Rules</h3>
                <p className="text-sm fc-text-dim leading-relaxed">{challenge.description}</p>
              </div>
            )}
          </GlassCard>

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
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="rounded-2xl border border-[color:var(--fc-border-subtle)] bg-[color:var(--fc-surface-muted)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[color:var(--fc-text-primary)]">
                        Participant {index + 1}
                      </p>
                      {participant.selected_track && (
                        <p className="text-xs text-[color:var(--fc-text-subtle)]">
                          {participant.selected_track === "fat_loss" ? "Fat Loss Track" : "Muscle Gain Track"}
                        </p>
                      )}
                      <p className="text-xs mt-1 text-[color:var(--fc-text-subtle)]">
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: getSemanticColor("energy").primary }}>
                        {participant.total_score || 0}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        points
                      </p>
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

