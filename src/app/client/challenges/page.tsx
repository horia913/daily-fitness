"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Challenge, getActiveChallenges, joinChallenge, getClientChallenges } from "@/lib/challengeService";
import { ChallengeCard } from "@/components/client/ChallengeCard";
import { useRouter } from "next/navigation";

function ChallengesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const router = useRouter();

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<string[]>([]); // IDs of challenges user is participating in
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<"fat_loss" | "muscle_gain" | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      loadChallenges();
    }
  }, [user, authLoading]);

  const loadChallenges = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [active, myParticipations] = await Promise.all([
        getActiveChallenges(),
        getClientChallenges(user.id),
      ]);

      setActiveChallenges(active);
      setMyChallenges(myParticipations.map(p => p.id)); // Use challenge id from the Challenge object
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSelectedTrack(null);
    
    // If recomp challenge, show track selector
    if (challenge.challenge_type === "recomp_challenge") {
      setShowJoinModal(true);
    } else {
      // Direct join for coach challenges
      handleJoin(challenge, null);
    }
  };

  const handleJoin = async (challenge: Challenge, track: "fat_loss" | "muscle_gain" | null) => {
    if (!user?.id) return;

    setJoining(true);
    try {
      const result = await joinChallenge(challenge.id, user.id, track || undefined);
      
      if (result) {
        alert("Successfully joined challenge!");
        setShowJoinModal(false);
        loadChallenges(); // Refresh
      } else {
        alert("Failed to join challenge");
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
      alert("Failed to join challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleView = (challenge: Challenge) => {
    router.push(`/client/challenges/${challenge.id}`);
  };

  const displayedChallenges = activeTab === "all"
    ? activeChallenges
    : activeChallenges.filter(c => myChallenges.includes(c.id));

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Link href="/client/progress">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Challenges
                  </h1>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Join challenges and compete with others
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("all")}
                style={
                  activeTab === "all"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                <Trophy className="w-4 h-4 mr-2" />
                All Challenges ({activeChallenges.length})
              </Button>
              <Button
                variant={activeTab === "my" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("my")}
                style={
                  activeTab === "my"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                <Users className="w-4 h-4 mr-2" />
                My Challenges ({myChallenges.length})
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Challenges Grid */}
        {displayedChallenges.length === 0 ? (
          <GlassCard elevation={2} className="p-12">
            <div className="text-center">
              <Trophy
                className="w-24 h-24 mx-auto mb-6"
                style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}
              />
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                {activeTab === "my" ? "No Active Challenges" : "No Challenges Available"}
              </h2>
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                {activeTab === "my"
                  ? "Join a challenge to start competing!"
                  : "Check back later for new challenges"}
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isParticipating={myChallenges.includes(challenge.id)}
                onJoin={handleJoinClick}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Join Modal for Recomp Challenges */}
      {showJoinModal && selectedChallenge && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-6"
            style={{
              background: isDark ? "#1E1E1E" : "#FFFFFF",
            }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Select Your Track
            </h2>
            <p
              className="text-sm mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Choose which recomp track you want to compete in
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedTrack("fat_loss")}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedTrack === "fat_loss" ? "ring-2" : ""
                }`}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                  ...(selectedTrack === "fat_loss" && {
                    border: `2px solid ${getSemanticColor("success").primary}`,
                    boxShadow: `0 0 0 2px ${getSemanticColor("success").primary}40`,
                  }),
                }}
              >
                <p
                  className="font-semibold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Fat Loss Track
                </p>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Reduce waist measurement while maintaining strength
                </p>
              </button>

              <button
                onClick={() => setSelectedTrack("muscle_gain")}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedTrack === "muscle_gain" ? "ring-2" : ""
                }`}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                  ...(selectedTrack === "muscle_gain" && {
                    border: `2px solid ${getSemanticColor("success").primary}`,
                    boxShadow: `0 0 0 2px ${getSemanticColor("success").primary}40`,
                  }),
                }}
              >
                <p
                  className="font-semibold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Muscle Gain Track
                </p>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Gain bodyweight multiples in key lifts
                </p>
              </button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowJoinModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedTrack && handleJoin(selectedChallenge, selectedTrack)}
                disabled={!selectedTrack || joining}
                className="flex-1"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                }}
              >
                {joining ? "Joining..." : "Join Challenge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatedBackground>
  );
}

export default function ChallengesPage() {
  return (
    <ProtectedRoute>
      <ChallengesPageContent />
    </ProtectedRoute>
  );
}

