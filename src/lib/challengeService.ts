/**
 * Challenge Service
 * Handles coach challenges (program-based) and recomp challenges (fat-loss/muscle-gain)
 */

import { supabase } from './supabase';

export interface Challenge {
  id: string;
  created_by: string;
  challenge_type: 'coach_challenge' | 'recomp_challenge';
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  program_id?: string | null;
  recomp_track?: 'fat_loss' | 'muscle_gain' | 'both' | null;
  reward_description?: string | null;
  reward_value?: string | null;
  requires_video_proof: boolean;
  max_participants?: number | null;
  is_public: boolean;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  client_id: string;
  selected_track?: 'fat_loss' | 'muscle_gain' | null;
  status: 'registered' | 'active' | 'completed' | 'withdrawn' | 'invited';
  joined_at: string;
  total_score: number;
  final_rank?: number | null;
  is_winner: boolean;
  award_notes?: string | null;
}

export type ScoringMethod =
  | 'pr_improvement' | 'bw_multiple' | 'tonnage' | 'waist_delta' | 'muscle_gain_bw_multiple' | 'adherence_percentage'
  | 'max_weight' | 'max_reps' | 'max_volume' | 'completion_count' | 'body_recomp_percentage' | 'custom';

export interface ChallengeScoringCategory {
  id: string;
  challenge_id: string;
  category_name: string;
  exercise_id?: string | null;
  scoring_method: ScoringMethod;
  weight_percentage: number;
  created_at: string;
}

export interface ChallengeVideoSubmission {
  id: string;
  participant_id: string;
  scoring_category_id: string;
  video_url: string;
  video_path: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  claimed_weight?: number | null;
  claimed_reps?: number | null;
  created_at: string;
}

// ============================================================================
// Challenge CRUD
// ============================================================================

export async function getActiveChallenges(): Promise<Challenge[]> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching active challenges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveChallenges:', error);
    return [];
  }
}

/**
 * Get all challenges (for coaches - includes all statuses).
 * If createdBy is provided, filter to that coach's challenges.
 */
export async function getAllChallenges(createdBy?: string): Promise<Challenge[]> {
  try {
    let query = supabase
      .from('challenges')
      .select('*')
      .order('start_date', { ascending: false });

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all challenges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllChallenges:', error);
    return [];
  }
}

export interface CreateChallengePayload {
  created_by: string;
  name: string;
  description?: string | null;
  challenge_type: 'coach_challenge' | 'recomp_challenge';
  start_date: string;
  end_date: string;
  max_participants?: number | null;
  is_public: boolean;
  requires_video_proof: boolean;
  recomp_track?: 'fat_loss' | 'muscle_gain' | 'both' | null;
  program_id?: string | null;
  reward_description?: string | null;
  reward_value?: string | null;
  scoring_categories: Array<{
    category_name: string;
    exercise_id?: string | null;
    scoring_method: ScoringMethod;
    weight_percentage: number;
  }>;
}

/**
 * Create a new challenge and its scoring categories. Status is set to draft.
 */
export async function createChallenge(payload: CreateChallengePayload): Promise<Challenge | null> {
  try {
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        created_by: payload.created_by,
        name: payload.name,
        description: payload.description ?? null,
        challenge_type: payload.challenge_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        max_participants: payload.max_participants ?? null,
        is_public: payload.is_public,
        requires_video_proof: payload.requires_video_proof,
        recomp_track: payload.recomp_track ?? null,
        program_id: payload.program_id ?? null,
        reward_description: payload.reward_description ?? null,
        reward_value: payload.reward_value ?? null,
        status: 'draft',
      })
      .select()
      .single();

    if (challengeError || !challenge) {
      console.error('Error creating challenge:', challengeError);
      return null;
    }

    if (payload.scoring_categories?.length) {
      const categories = payload.scoring_categories.map((c) => ({
        challenge_id: challenge.id,
        category_name: c.category_name,
        exercise_id: c.exercise_id ?? null,
        scoring_method: c.scoring_method,
        weight_percentage: c.weight_percentage ?? 100,
      }));
      const { error: catError } = await supabase
        .from('challenge_scoring_categories')
        .insert(categories);

      if (catError) {
        console.error('Error creating scoring categories:', catError);
        // Challenge already created; could rollback or leave categories empty
      }
    }

    return challenge;
  } catch (error) {
    console.error('Error in createChallenge:', error);
    return null;
  }
}

export async function getChallengeDetails(challengeId: string): Promise<Challenge | null> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error) {
      console.error('Error fetching challenge details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getChallengeDetails:', error);
    return null;
  }
}

export async function joinChallenge(
  challengeId: string,
  clientId: string,
  selectedTrack?: 'fat_loss' | 'muscle_gain'
): Promise<ChallengeParticipant | null> {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeId,
        client_id: clientId,
        selected_track: selectedTrack,
        status: 'registered'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error joining challenge:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in joinChallenge:', error);
    return null;
  }
}

export async function getChallengeParticipants(challengeId: string): Promise<ChallengeParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('total_score', { ascending: false });

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChallengeParticipants:', error);
    return [];
  }
}

export interface LeaderboardParticipant extends ChallengeParticipant {
  display_name: string;
  avatar_initial: string;
}

/**
 * Get challenge leaderboard with real participant names from profiles
 */
export async function getChallengeLeaderboard(challengeId: string): Promise<LeaderboardParticipant[]> {
  try {
    const participants = await getChallengeParticipants(challengeId);
    if (participants.length === 0) return [];

    const clientIds = participants.map(p => p.client_id);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, leaderboard_visibility')
      .in('id', clientIds);

    if (profileError) {
      console.error('Error fetching participant profiles:', profileError);
    }

    const profileMap = new Map(
      (profiles ?? []).map(p => [p.id, p])
    );

    return participants.map(p => {
      const profile = profileMap.get(p.client_id);
      const visibility = profile?.leaderboard_visibility ?? 'public';
      let displayName = 'Anonymous';
      let avatarInitial = 'A';

      if (visibility !== 'hidden') {
        const first = profile?.first_name ?? '';
        const last = profile?.last_name ?? '';
        if (visibility === 'anonymous') {
          displayName = first ? `${first.charAt(0)}.` : 'Anonymous';
        } else {
          displayName = [first, last].filter(Boolean).join(' ') || 'Participant';
        }
        avatarInitial = first?.charAt(0) || last?.charAt(0) || 'P';
      }

      return { ...p, display_name: displayName, avatar_initial: avatarInitial };
    });
  } catch (error) {
    console.error('Error in getChallengeLeaderboard:', error);
    return [];
  }
}

export async function getChallengeScoringCategories(challengeId: string): Promise<ChallengeScoringCategory[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_scoring_categories')
      .select('*')
      .eq('challenge_id', challengeId);

    if (error) {
      console.error('Error fetching scoring categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChallengeScoringCategories:', error);
    return [];
  }
}

/**
 * Update challenge basic info (allowed when draft/active; active restricts to description, end_date, max_participants)
 */
export async function updateChallenge(
  challengeId: string,
  payload: Partial<Pick<Challenge, 'name' | 'description' | 'start_date' | 'end_date' | 'max_participants' | 'is_public' | 'requires_video_proof' | 'recomp_track' | 'program_id' | 'reward_description' | 'reward_value'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('challenges')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', challengeId);
    if (error) {
      console.error('Error updating challenge:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in updateChallenge:', error);
    return false;
  }
}

/**
 * Replace scoring categories for a challenge (delete existing, insert new). Use when status is draft.
 */
export async function updateChallengeScoringCategories(
  challengeId: string,
  categories: Array<{ category_name: string; exercise_id?: string | null; scoring_method: ScoringMethod; weight_percentage: number }>
): Promise<boolean> {
  try {
    const { error: delError } = await supabase
      .from('challenge_scoring_categories')
      .delete()
      .eq('challenge_id', challengeId);
    if (delError) {
      console.error('Error deleting old categories:', delError);
      return false;
    }
    if (categories.length) {
      const rows = categories.map((c) => ({
        challenge_id: challengeId,
        category_name: c.category_name,
        exercise_id: c.exercise_id ?? null,
        scoring_method: c.scoring_method,
        weight_percentage: c.weight_percentage ?? 100,
      }));
      const { error: insError } = await supabase.from('challenge_scoring_categories').insert(rows);
      if (insError) {
        console.error('Error inserting categories:', insError);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error in updateChallengeScoringCategories:', error);
    return false;
  }
}

/**
 * Start challenge: set status to active.
 */
export async function startChallenge(challengeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', challengeId);
    if (error) {
      console.error('Error starting challenge:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in startChallenge:', error);
    return false;
  }
}

/**
 * Invite clients to a private challenge (creates challenge_participants with status 'invited').
 */
export async function inviteParticipants(challengeId: string, clientIds: string[]): Promise<boolean> {
  try {
    if (!clientIds.length) return true;
    const rows = clientIds.map((client_id) => ({
      challenge_id: challengeId,
      client_id,
      status: 'invited',
    }));
    const { error } = await supabase.from('challenge_participants').insert(rows);
    if (error) {
      console.error('Error inviting participants:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in inviteParticipants:', error);
    return false;
  }
}

/**
 * Accept an invitation (client): set status to registered/active.
 */
export async function acceptChallengeInvite(participantId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('challenge_participants')
      .update({ status: 'registered', updated_at: new Date().toISOString() })
      .eq('id', participantId);
    if (error) {
      console.error('Error accepting invite:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in acceptChallengeInvite:', error);
    return false;
  }
}

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Finalize challenge: recalc all scores, set status completed, assign final_rank and is_winner.
 */
export async function finalizeChallenge(challengeId: string): Promise<{ success: boolean; standings?: ChallengeParticipant[] }> {
  try {
    const participants = await getChallengeParticipants(challengeId);
    for (const p of participants) {
      const newScore = await calculateParticipantScore(p.id, challengeId);
      await supabase
        .from('challenge_participants')
        .update({ total_score: newScore, updated_at: new Date().toISOString() })
        .eq('id', p.id);
    }
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', challengeId);
    if (updateError) {
      console.error('Error finalizing challenge:', updateError);
      return { success: false };
    }
    const updatedParticipants = await getChallengeParticipants(challengeId);
    const sorted = [...updatedParticipants].sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0));
    let rank = 1;
    for (const p of sorted) {
      await supabase
        .from('challenge_participants')
        .update({ final_rank: rank, is_winner: rank === 1, updated_at: new Date().toISOString() })
        .eq('id', p.id);
      rank++;
    }
    const standings = await getChallengeParticipants(challengeId);

    // Check challenge achievements for all participants
    try {
      const { AchievementService } = await import('./achievementService');
      for (const p of standings) {
        await AchievementService.checkAndUnlockAchievements(p.client_id, 'challenges_completed');
        if (p.is_winner) {
          await AchievementService.checkAndUnlockAchievements(p.client_id, 'challenges_won');
        }
        if (p.final_rank && p.final_rank <= 3) {
          await AchievementService.checkAndUnlockAchievements(p.client_id, 'challenges_top3');
        }
      }
    } catch (achErr) {
      console.error('Error checking challenge achievements:', achErr);
    }

    return { success: true, standings };
  } catch (error) {
    console.error('Error in finalizeChallenge:', error);
    return { success: false };
  }
}

/**
 * Get approved submissions for a participant in a challenge (for scoring).
 */
async function getApprovedSubmissions(
  participantId: string,
  challengeId: string
): Promise<ChallengeVideoSubmission[]> {
  const { data, error } = await supabase
    .from('challenge_video_submissions')
    .select('*')
    .eq('participant_id', participantId)
    .eq('status', 'approved');
  if (error || !data) return [];
  const categoryIds = (await getChallengeScoringCategories(challengeId)).map((c) => c.id);
  return data.filter((s: ChallengeVideoSubmission) => categoryIds.includes(s.scoring_category_id));
}

/**
 * Count completed workouts for a participant during the challenge date range.
 */
async function getCompletedWorkoutCount(
  clientId: string,
  challengeId: string
): Promise<number> {
  const challenge = await getChallengeDetails(challengeId);
  if (!challenge) return 0;
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('client_id', clientId)
    .not('completed_at', 'is', null)
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString());
  if (error) return 0;
  return (data || []).length;
}

/**
 * Body recomp score: e.g. weight delta (kg lost) or body fat change during challenge.
 */
async function getBodyRecompScore(
  clientId: string,
  challengeId: string
): Promise<number> {
  const challenge = await getChallengeDetails(challengeId);
  if (!challenge) return 0;
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  const { data: metrics } = await supabase
    .from('body_metrics')
    .select('weight_kg, measured_date')
    .eq('client_id', clientId)
    .not('weight_kg', 'is', null)
    .order('measured_date', { ascending: true });
  if (!metrics?.length) return 0;
  const atStart = metrics.filter((m: any) => new Date(m.measured_date) <= start);
  const atEnd = metrics.filter((m: any) => new Date(m.measured_date) >= end);
  const startWeight = atStart.length ? Number(atStart[atStart.length - 1].weight_kg) : Number(metrics[0].weight_kg);
  const endWeight = atEnd.length ? Number(atEnd[0].weight_kg) : Number(metrics[metrics.length - 1].weight_kg);
  const delta = startWeight - endWeight;
  return Math.round(delta * 10) / 10;
}

/**
 * PR improvement: delta between best 1RM before challenge and best 1RM during challenge.
 */
async function getPrImprovementScore(
  clientId: string,
  challengeId: string,
  exerciseId?: string | null
): Promise<number> {
  const challenge = await getChallengeDetails(challengeId);
  if (!challenge) return 0;
  const start = challenge.start_date;
  const end = challenge.end_date;

  let queryBefore = supabase
    .from('personal_records')
    .select('value')
    .eq('client_id', clientId)
    .eq('record_type', '1rm')
    .lt('achieved_at', start)
    .order('value', { ascending: false })
    .limit(1);
  let queryDuring = supabase
    .from('personal_records')
    .select('value')
    .eq('client_id', clientId)
    .eq('record_type', '1rm')
    .gte('achieved_at', start)
    .lte('achieved_at', end)
    .order('value', { ascending: false })
    .limit(1);

  if (exerciseId) {
    queryBefore = queryBefore.eq('exercise_id', exerciseId);
    queryDuring = queryDuring.eq('exercise_id', exerciseId);
  }

  const [{ data: before }, { data: during }] = await Promise.all([queryBefore, queryDuring]);
  const prBefore = before?.[0]?.value ? Number(before[0].value) : 0;
  const prDuring = during?.[0]?.value ? Number(during[0].value) : 0;
  return Math.max(0, Math.round((prDuring - prBefore) * 10) / 10);
}

/**
 * Tonnage: total volume (weight x reps) during challenge period.
 */
async function getTonnageScore(
  clientId: string,
  challengeId: string
): Promise<number> {
  const challenge = await getChallengeDetails(challengeId);
  if (!challenge) return 0;
  const start = new Date(challenge.start_date).toISOString();
  const endDate = new Date(challenge.end_date);
  endDate.setHours(23, 59, 59, 999);
  const end = endDate.toISOString();

  const { data, error } = await supabase
    .from('workout_set_logs')
    .select('weight, reps')
    .eq('client_id', clientId)
    .gte('created_at', start)
    .lte('created_at', end);

  if (error || !data) return 0;
  return data.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
}

/**
 * BW multiple: best 1RM / bodyweight for a given exercise.
 */
async function getBwMultipleScore(
  clientId: string,
  exerciseId?: string | null
): Promise<number> {
  let prQuery = supabase
    .from('personal_records')
    .select('value')
    .eq('client_id', clientId)
    .eq('record_type', '1rm')
    .order('value', { ascending: false })
    .limit(1);

  if (exerciseId) prQuery = prQuery.eq('exercise_id', exerciseId);

  const [{ data: prData }, { data: bwData }] = await Promise.all([
    prQuery,
    supabase
      .from('body_metrics')
      .select('weight_kg')
      .eq('client_id', clientId)
      .not('weight_kg', 'is', null)
      .order('measured_date', { ascending: false })
      .limit(1),
  ]);

  const pr = prData?.[0]?.value ? Number(prData[0].value) : 0;
  const bw = bwData?.[0]?.weight_kg ? Number(bwData[0].weight_kg) : 0;
  if (bw === 0) return 0;
  return Math.round((pr / bw) * 100) / 100;
}

/**
 * Muscle gain BW multiple: bodyweight gained during challenge as proportion of starting BW.
 */
async function getMuscleGainBwMultipleScore(
  clientId: string,
  challengeId: string
): Promise<number> {
  const challenge = await getChallengeDetails(challengeId);
  if (!challenge) return 0;
  const { data: metrics } = await supabase
    .from('body_metrics')
    .select('weight_kg, measured_date')
    .eq('client_id', clientId)
    .not('weight_kg', 'is', null)
    .order('measured_date', { ascending: true });
  if (!metrics?.length) return 0;

  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  const atStart = metrics.filter((m: any) => new Date(m.measured_date) <= start);
  const atEnd = metrics.filter((m: any) => new Date(m.measured_date) >= end);
  const startWeight = atStart.length ? Number(atStart[atStart.length - 1].weight_kg) : Number(metrics[0].weight_kg);
  const endWeight = atEnd.length ? Number(atEnd[0].weight_kg) : Number(metrics[metrics.length - 1].weight_kg);
  if (startWeight === 0) return 0;
  const gain = endWeight - startWeight;
  return Math.round((gain / startWeight) * 1000) / 1000;
}

/**
 * Calculate participant total score from scoring categories and approved submissions / workout count / body recomp.
 */
export async function calculateParticipantScore(
  participantId: string,
  challengeId: string
): Promise<number> {
  try {
    const categories = await getChallengeScoringCategories(challengeId);
    const approved = await getApprovedSubmissions(participantId, challengeId);
    const { data: participantRow } = await supabase
      .from('challenge_participants')
      .select('client_id')
      .eq('id', participantId)
      .single();
    const clientId = participantRow?.client_id;
    if (!clientId) return 0;

    let totalScore = 0;
    for (const cat of categories) {
      const sub = approved.find((s) => s.scoring_category_id === cat.id);
      let categoryScore = 0;
      const weightPct = (cat.weight_percentage ?? 0) / 100;

      switch (cat.scoring_method) {
        case 'max_weight':
          categoryScore = sub ? Number(sub.claimed_weight) || 0 : 0;
          break;
        case 'max_reps':
          categoryScore = sub ? Number(sub.claimed_reps) || 0 : 0;
          break;
        case 'max_volume':
          categoryScore = sub ? (Number(sub.claimed_weight) || 0) * (Number(sub.claimed_reps) || 0) : 0;
          break;
        case 'completion_count':
        case 'adherence_percentage':
          categoryScore = await getCompletedWorkoutCount(clientId, challengeId);
          break;
        case 'body_recomp_percentage':
        case 'waist_delta':
          categoryScore = await getBodyRecompScore(clientId, challengeId);
          break;
        case 'pr_improvement':
          categoryScore = await getPrImprovementScore(clientId, challengeId, cat.exercise_id);
          break;
        case 'tonnage':
          categoryScore = await getTonnageScore(clientId, challengeId);
          break;
        case 'bw_multiple':
          categoryScore = await getBwMultipleScore(clientId, cat.exercise_id);
          break;
        case 'muscle_gain_bw_multiple':
          categoryScore = await getMuscleGainBwMultipleScore(clientId, challengeId);
          break;
        case 'custom':
        default:
          categoryScore = sub ? Number(sub.claimed_weight) || 0 : 0;
          break;
      }
      totalScore += categoryScore * weightPct;
    }
    return Math.round(totalScore * 100) / 100;
  } catch (error) {
    console.error('Error in calculateParticipantScore:', error);
    return 0;
  }
}


/**
 * Get client's challenges
 */
export async function getClientChallenges(clientId: string): Promise<Array<Challenge & { participation: ChallengeParticipant }>> {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenge:challenges(*)
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client challenges:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item.challenge,
      participation: {
        id: item.id,
        challenge_id: item.challenge_id,
        client_id: item.client_id,
        selected_track: item.selected_track,
        status: item.status,
        joined_at: item.joined_at,
        total_score: item.total_score,
        final_rank: item.final_rank,
        is_winner: item.is_winner,
        award_notes: item.award_notes
      }
    }));
  } catch (error) {
    console.error('Error in getClientChallenges:', error);
    return [];
  }
}

// ============================================================================
// Video Proof Submissions
// ============================================================================

/**
 * Submit video proof for a challenge performance claim
 */
export async function submitVideoProof(
  participantId: string,
  scoringCategoryId: string,
  videoFile: File,
  claimedWeight?: number,
  claimedReps?: number
): Promise<ChallengeVideoSubmission | null> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const fileExt = videoFile.name.split('.').pop();
    const filePath = `challenge_proofs/${participantId}/${timestamp}.${fileExt}`;

    // Upload video to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('challenge-videos')
      .upload(filePath, videoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('challenge-videos')
      .getPublicUrl(filePath);

    // Create submission record
    const { data, error } = await supabase
      .from('challenge_video_submissions')
      .insert([{
        participant_id: participantId,
        scoring_category_id: scoringCategoryId,
        video_url: publicUrl,
        video_path: filePath,
        claimed_weight: claimedWeight,
        claimed_reps: claimedReps,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating submission record:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in submitVideoProof:', error);
    return null;
  }
}

/**
 * Get all video submissions for a participant
 */
export async function getParticipantSubmissions(
  participantId: string
): Promise<ChallengeVideoSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_video_submissions')
      .select('*')
      .eq('participant_id', participantId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching participant submissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getParticipantSubmissions:', error);
    return [];
  }
}

/**
 * Get pending video submissions (for coach review)
 */
export async function getPendingVideoSubmissions(
  challengeId?: string
): Promise<ChallengeVideoSubmission[]> {
  try {
    let query = supabase
      .from('challenge_video_submissions')
      .select(`
        *,
        participant:challenge_participants!participant_id(
          client_id,
          challenge_id
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending submissions:', error);
      return [];
    }

    // Filter by challenge if specified
    if (challengeId && data) {
      return data.filter((sub: any) => sub.participant?.challenge_id === challengeId);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingVideoSubmissions:', error);
    return [];
  }
}

/**
 * Review (approve/reject) a video submission.
 * On approve: recalculates participant total_score and updates challenge_participants.
 */
export async function reviewVideoSubmission(
  submissionId: string,
  coachId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<boolean> {
  try {
    const { data: submission, error: fetchErr } = await supabase
      .from('challenge_video_submissions')
      .select('participant_id')
      .eq('id', submissionId)
      .single();
    if (fetchErr || !submission?.participant_id) {
      console.error('Error fetching submission:', fetchErr);
      return false;
    }
    const participantId = submission.participant_id;

    const { error } = await supabase
      .from('challenge_video_submissions')
      .update({
        status,
        reviewed_by: coachId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Error reviewing submission:', error);
      return false;
    }

    if (status === 'approved') {
      const { data: participant } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('id', participantId)
        .single();
      if (participant?.challenge_id) {
        const newScore = await calculateParticipantScore(participantId, participant.challenge_id);
        await supabase
          .from('challenge_participants')
          .update({ total_score: newScore, updated_at: new Date().toISOString() })
          .eq('id', participantId);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in reviewVideoSubmission:', error);
    return false;
  }
}

/**
 * Get all submissions for a challenge (for coaches)
 */
export async function getChallengeSubmissions(
  challengeId: string
): Promise<ChallengeVideoSubmission[]> {
  try {
    const { data: participants, error: partError } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId);

    if (partError || !participants?.length) {
      return [];
    }

    const participantIds = participants.map((p: { id: string }) => p.id);
    const { data, error } = await supabase
      .from('challenge_video_submissions')
      .select(`
        *,
        participant:challenge_participants!participant_id(id, client_id, challenge_id)
      `)
      .in('participant_id', participantIds)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenge submissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getChallengeSubmissions:', error);
    return [];
  }
}

/**
 * Delete a video submission (and remove from storage)
 */
export async function deleteVideoSubmission(
  submissionId: string
): Promise<boolean> {
  try {
    // Get submission to get video path
    const { data: submission } = await supabase
      .from('challenge_video_submissions')
      .select('video_path')
      .eq('id', submissionId)
      .single();

    if (!submission) {
      console.error('Submission not found');
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('challenge-videos')
      .remove([submission.video_path]);

    if (storageError) {
      console.error('Error deleting video from storage:', storageError);
      // Continue anyway to delete record
    }

    // Delete record
    const { error } = await supabase
      .from('challenge_video_submissions')
      .delete()
      .eq('id', submissionId);

    if (error) {
      console.error('Error deleting submission record:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteVideoSubmission:', error);
    return false;
  }
}

