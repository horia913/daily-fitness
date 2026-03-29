import type { Challenge } from "@/lib/challengeService";

const COACH_ID = "00000000-0000-0000-0000-000000000001";
const NOW = "2026-03-28T12:00:00.000Z";

function baseChallenge(
  partial: Partial<Challenge> & Pick<Challenge, "id" | "name" | "status" | "start_date" | "end_date">
): Challenge {
  return {
    created_by: COACH_ID,
    challenge_type: "coach_challenge",
    description: null,
    program_id: null,
    recomp_track: null,
    reward_description: null,
    reward_value: null,
    requires_video_proof: false,
    max_participants: null,
    is_public: true,
    created_at: NOW,
    updated_at: NOW,
    ...partial,
  };
}

/** Active + draft shown on Browse all */
export const TEST_CHALLENGES_ALL: Challenge[] = [
  baseChallenge({
    id: "test-challenge-1",
    name: "30-Day Consistency Challenge",
    description:
      "Complete at least 4 workouts per week for 30 days",
    status: "active",
    start_date: "2026-03-01",
    end_date: "2026-03-31",
    reward_description: "Badge + spotlight",
  }),
  baseChallenge({
    id: "test-challenge-2",
    name: "Weekly Volume King",
    description:
      "Highest total volume (kg) lifted in a single week",
    status: "active",
    start_date: "2026-03-22",
    end_date: "2026-03-29",
    reward_description: "Top lifter feature",
  }),
  baseChallenge({
    id: "test-challenge-4",
    name: "April Squat Challenge",
    description:
      "Work up to a 1.5x bodyweight squat by end of April",
    status: "draft",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    reward_description: "April PR badge",
  }),
];

export const TEST_CHALLENGE_COMPLETED: Challenge = baseChallenge({
  id: "test-challenge-3",
  name: "February Streak Master",
  description: "Longest consecutive workout streak in February",
  status: "completed",
  start_date: "2026-02-01",
  end_date: "2026-02-28",
  reward_description: "Streak champion",
});

export function getTestChallengeById(id: string): Challenge | null {
  if (id === TEST_CHALLENGE_COMPLETED.id) return TEST_CHALLENGE_COMPLETED;
  return TEST_CHALLENGES_ALL.find((c) => c.id === id) ?? null;
}

export interface MockLeaderboardRow {
  id: string;
  client_id: string;
  display_name: string;
  total_score: number;
  final_rank: number;
  selected_track?: "fat_loss" | "muscle_gain";
}

const TEST_SELF_PREFIX = "test-challenges-self";

export function testChallengesSelfClientId(realUserId: string | undefined): string {
  return realUserId ?? `${TEST_SELF_PREFIX}-user`;
}

export function getTestChallengeLeaderboard(
  challengeId: string,
  selfClientId: string
): MockLeaderboardRow[] {
  if (challengeId === "test-challenge-1") {
    return [
      {
        id: "p1",
        client_id: "c1",
        display_name: "Maria Ionescu",
        total_score: 22,
        final_rank: 1,
      },
      {
        id: "p2",
        client_id: "c2",
        display_name: "Alexandru Popa",
        total_score: 20,
        final_rank: 2,
      },
      {
        id: "p3",
        client_id: "c3",
        display_name: "Elena Dumitrescu",
        total_score: 19,
        final_rank: 3,
      },
      {
        id: "p4",
        client_id: selfClientId,
        display_name: "Roxana Micu",
        total_score: 18,
        final_rank: 4,
      },
    ];
  }
  if (challengeId === "test-challenge-2") {
    return [
      {
        id: "v1",
        client_id: "v1",
        display_name: "Andrei Stanescu",
        total_score: 31200,
        final_rank: 1,
      },
      {
        id: "v2",
        client_id: "v2",
        display_name: "Mihai Radu",
        total_score: 28400,
        final_rank: 2,
      },
      {
        id: "v3",
        client_id: selfClientId,
        display_name: "Roxana Micu",
        total_score: 24500,
        final_rank: 3,
      },
    ];
  }
  if (challengeId === "test-challenge-3") {
    return [
      {
        id: "s1",
        client_id: "s1",
        display_name: "Elena Dumitrescu",
        total_score: 24,
        final_rank: 1,
      },
      {
        id: "s2",
        client_id: selfClientId,
        display_name: "Roxana Micu",
        total_score: 12,
        final_rank: 5,
      },
    ];
  }
  if (challengeId === "test-challenge-4") {
    return [];
  }
  return [];
}
