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
  status: 'registered' | 'active' | 'completed' | 'withdrawn';
  joined_at: string;
  total_score: number;
  final_rank?: number | null;
  is_winner: boolean;
  award_notes?: string | null;
}

export interface ChallengeScoringCategory {
  id: string;
  challenge_id: string;
  category_name: string;
  exercise_id?: string | null;
  scoring_method: 'pr_improvement' | 'bw_multiple' | 'tonnage' | 'waist_delta' | 'muscle_gain_bw_multiple' | 'adherence_percentage';
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
 * Get all challenges (for coaches - includes all statuses)
 */
export async function getAllChallenges(): Promise<Challenge[]> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('start_date', { ascending: false });

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

/**
 * Get challenge leaderboard (alias for getChallengeParticipants, ordered by score)
 */
export async function getChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]> {
  return getChallengeParticipants(challengeId);
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

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Calculate participant score (to be run by backend job or coach trigger)
 */
export async function calculateParticipantScore(
  participantId: string,
  challengeId: string
): Promise<number> {
  // This would be a complex calculation based on scoring categories
  // For now, return placeholder
  console.log('Calculate score for participant:', participantId, 'in challenge:', challengeId);
  return 0; // TODO: Implement full scoring logic
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
 * Review (approve/reject) a video submission
 */
export async function reviewVideoSubmission(
  submissionId: string,
  coachId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<boolean> {
  try {
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
    const { data, error } = await supabase
      .from('challenge_video_submissions')
      .select(`
        *,
        participant:challenge_participants!participant_id(*)
      `)
      .eq('participant.challenge_id', challengeId)
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

