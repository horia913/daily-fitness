"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle, XCircle, Video, Clock } from "lucide-react";
import Link from "next/link";
import { getChallengeDetails, getChallengeParticipants, getPendingVideoSubmissions, reviewVideoSubmission, ChallengeVideoSubmission } from "@/lib/challengeService";
import { supabase } from "@/lib/supabase";

function CoachChallengeDetailContent() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<ChallengeVideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !authLoading && challengeId) {
      loadChallenge();
    }
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
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
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
                <p style={{ color: isDark ? "#fff" : "#1A1A1A" }}>
                  Challenge not found
                </p>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/coach/challenges">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {challenge.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
                    <span
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      {participants.length} participants
                    </span>
                  </div>
                </div>
              </div>
              <Badge
                style={{
                  background: getSemanticColor("success").gradient,
                  color: "#fff",
                }}
              >
                {challenge.status}
              </Badge>
            </div>

            {challenge.description && (
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {challenge.description}
              </p>
            )}
          </GlassCard>
        </div>

        {/* Pending Video Reviews */}
        {pendingSubmissions.length > 0 && (
          <GlassCard elevation={2} className="p-6 mb-6">
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
                <h2
                  className="text-xl font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Pending Reviews
                </h2>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {pendingSubmissions.length} video{pendingSubmissions.length !== 1 ? 's' : ''} awaiting review
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 rounded-lg border"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
                        <span
                          className="text-xs"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                          }}
                        >
                          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {submission.claimed_weight && (
                        <p className="text-sm mb-1" style={{ color: isDark ? "#fff" : "#1A1A1A" }}>
                          Claimed: {submission.claimed_weight} kg
                          {submission.claimed_reps && ` × ${submission.claimed_reps} reps`}
                        </p>
                      )}

                      <div className="mt-3">
                        <textarea
                          placeholder="Review notes (optional)"
                          value={reviewNotes[submission.id] || ''}
                          onChange={(e) => setReviewNotes((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                          className="w-full p-2 rounded-lg text-sm mb-2"
                          rows={2}
                          style={{
                            background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
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
              <h2
                className="text-xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Participants
              </h2>
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                {participants.length} enrolled
              </p>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users
                className="w-16 h-16 mx-auto mb-4"
                style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}
              />
              <p
                className="text-lg font-semibold"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                No participants yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="p-4 rounded-lg"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        Participant {index + 1}
                      </p>
                      {participant.selected_track && (
                        <p
                          className="text-xs"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {participant.selected_track === "fat_loss" ? "Fat Loss Track" : "Muscle Gain Track"}
                        </p>
                      )}
                      <p
                        className="text-xs mt-1"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getSemanticColor("energy").primary }}
                      >
                        {participant.total_score || 0}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
                        points
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
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

